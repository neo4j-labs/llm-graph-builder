import hashlib
import os
import json
import logging
from typing import Any
from src.entities.user_credential import Neo4jCredentials
from transformers import AutoTokenizer, AutoModel
from langchain_huggingface import HuggingFaceEmbeddings
from threading import Lock
import logging
from urllib.parse import urlparse,parse_qs
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_neo4j import Neo4jGraph
from neo4j.exceptions import TransientError
from langchain_community.graphs.graph_document import GraphDocument
from typing import List
import re
import os
import time
from pathlib import Path
from urllib.parse import urlparse
import boto3
from langchain_community.embeddings import BedrockEmbeddings
from langchain_core.callbacks import BaseCallbackHandler


# --- Embedding Model Helpers ---
_embedding_instances = {}
_embedding_locks = {}

def _ensure_sentence_transformer_model_downloaded(model_name: str, model_path: str):
    """
    Download and cache the sentence-transformer model if not already present.
    """
    if os.path.isdir(model_path):
        logging.info(f"Model already downloaded at: {model_path}")
        return
    logging.info(f"Downloading model {model_name} to: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    tokenizer.save_pretrained(model_path)
    model.save_pretrained(model_path)
    logging.info("Model downloaded and saved.")

def _get_sentence_transformer_embedding(model_name: str, model_path: str = "./local_model"):
    """
    Threadsafe singleton for HuggingFaceEmbeddings for any sentence-transformer model.
    """
    if model_name not in _embedding_locks:
        _embedding_locks[model_name] = Lock()
    if model_name in _embedding_instances:
        return _embedding_instances[model_name]
    with _embedding_locks[model_name]:
        if model_name in _embedding_instances:
            return _embedding_instances[model_name]
        _ensure_sentence_transformer_model_downloaded(model_name, model_path)
        _embedding_instances[model_name] = HuggingFaceEmbeddings(model_name=model_path)
        logging.info(f"Embedding model {model_name} initialized.")
        return _embedding_instances[model_name]

def _get_bedrock_embeddings(model_name: str):
    """
    Creates and returns a BedrockEmbeddings object using the specified model name.
    Args:
        model_name (str): The name of the model to use for embeddings.
    Returns:
        BedrockEmbeddings: An instance of the BedrockEmbeddings class.
    """
    try:
        env_value = get_value_from_env("BEDROCK_EMBEDDING_MODEL")
        if not env_value:
            raise ValueError("Environment variable 'BEDROCK_EMBEDDING_MODEL' is not set.")
        try:
            _, aws_access_key, aws_secret_key, region_name = env_value.split(",")
        except ValueError:
            raise ValueError(
                "Environment variable 'BEDROCK_EMBEDDING_MODEL' is improperly formatted. "
                "Expected format: 'model_name,aws_access_key,aws_secret_key,region_name'."
            )
        bedrock_client = boto3.client(
                service_name="bedrock-runtime",
                region_name=region_name.strip(),
                aws_access_key_id=aws_access_key.strip(),
                aws_secret_access_key=aws_secret_key.strip(),
            )
        bedrock_embeddings = BedrockEmbeddings(
            model_id=model_name.strip(),
            client=bedrock_client
        )
        return bedrock_embeddings
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        raise
   
def create_youtube_url(url):
    you_tu_url = "https://www.youtube.com/watch?v="
    u_pars = urlparse(url)
    quer_v = parse_qs(u_pars.query).get('v')
    if quer_v:
      return  you_tu_url + quer_v[0].strip()

    pth = u_pars.path.split('/')
    if pth:
      return you_tu_url + pth[-1].strip()

def check_url_source(source_type, yt_url:str=None, wiki_query:str=None):
    language=''
    try:
      logging.info(f"incoming URL: {yt_url}")
      if source_type == 'youtube':
        if re.match('(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?',yt_url.strip()):
          youtube_url = create_youtube_url(yt_url.strip())
          logging.info(youtube_url)
          return youtube_url,language
        else:
          raise Exception('Incoming URL is not youtube URL')
      
      elif  source_type == 'Wikipedia':
        wiki_query_id=''

        wikipedia_url_regex = r'https?:\/\/(www\.)?([a-zA-Z]{2,3})\.wikipedia\.org\/wiki\/(.*)'
        
        match = re.search(wikipedia_url_regex, wiki_query.strip())
        if match:
                language = match.group(2)
                wiki_query_id = match.group(3)
        else:
            raise Exception(f'Not a valid wikipedia url: {wiki_query} ')

        logging.info(f"wikipedia query id = {wiki_query_id}")     
        return wiki_query_id, language     
    except Exception as e:
      logging.error(f"Error in recognize URL: {e}")
      raise Exception(e)


def get_chunk_and_graphDocument(graph_document_list, chunkId_chunkDoc_list):
  logging.info("creating list of chunks and graph documents in get_chunk_and_graphDocument func")
  lst_chunk_chunkId_document=[]
  for graph_document in graph_document_list:            
          for chunk_id in graph_document.source.metadata['combined_chunk_ids'] :
            lst_chunk_chunkId_document.append({'graph_doc':graph_document,'chunk_id':chunk_id})
                  
  return lst_chunk_chunkId_document  
                 
def create_graph_database_connection(credentials):
  enable_user_agent = get_value_from_env("ENABLE_USER_AGENT", "False" ,"bool")
  if enable_user_agent:
    graph = Neo4jGraph(url=credentials.uri, database=credentials.database, username=credentials.userName, password=credentials.password, refresh_schema=False, sanitize=True,driver_config={'user_agent':get_value_from_env("USER_AGENT","LLM-Graph-Builder")}) 
  else:
    graph = Neo4jGraph(url=credentials.uri, database=credentials.database, username=credentials.userName, password=credentials.password, refresh_schema=False, sanitize=True)    
  return graph



def load_embedding_model(embedding_provider: str, embedding_model_name: str):
    """
    Load the appropriate embedding model and return its instance and dimension.

    Args:
        embedding_provider (str): The provider name (e.g., "openai", "gemini", "titan", "sentence-transformer").
        embedding_model_name (str): The specific model name.

    Returns:
        tuple: (embedding_instance, dimension)

    Raises:
        ValueError: If provider or model is not supported.
    """
    # Mapping of model dimensions for each provider
    model_dimensions = {
        "openai": {
            "text-embedding-3-large": 3072,
            "text-embedding-3-small": 1536,
            "text-embedding-ada-002": 1536,
        },
        "gemini": {
            "gemini-embedding-001": 3072,
            "text-embedding-005": 768,
        },
        "titan": {
            "titan-embed-text-v2:0": 1536,
            "titan-embed-text-v1": 1024,
        },
        "sentence-transformer": {
            "all-MiniLM-L6-v2": 384,
        },
    }

    provider = embedding_provider.lower()
    model = embedding_model_name

    if provider not in model_dimensions or model not in model_dimensions[provider]:
        raise ValueError(f"Unsupported provider/model: {provider}/{model}")

    dimension = model_dimensions[provider][model]

    if provider == "openai":
        embeddings = OpenAIEmbeddings(model=model)
    elif provider == "gemini":
        embeddings = VertexAIEmbeddings(model=model)
    elif provider == "titan":
        embeddings = _get_bedrock_embeddings(model)
    elif provider == "sentence-transformer":
        model_path = "./local_model" 
        embeddings = _get_sentence_transformer_embedding(model, model_path)
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")

    logging.info(f"Embedding: Using {provider} - {model}, Dimension: {dimension}")
    return embeddings, dimension

def save_graphDocuments_in_neo4j(graph: Neo4jGraph, graph_document_list: List[GraphDocument], max_retries=3, delay=1):
   retries = 0
   while retries < max_retries:
       try:
           graph.add_graph_documents(graph_document_list, baseEntityLabel=True)
           return
       except TransientError as e:
           if "DeadlockDetected" in str(e):
               retries += 1
               logging.info(f"Deadlock detected. Retrying {retries}/{max_retries} in {delay} seconds...")
               time.sleep(delay)  # Wait before retrying
           else:
               raise
   logging.error("Failed to execute query after maximum retries due to persistent deadlocks.")
   raise RuntimeError("Query execution failed after multiple retries due to deadlock.")
           
def handle_backticks_nodes_relationship_id_type(graph_document_list:List[GraphDocument]):
  for graph_document in graph_document_list:
    # Clean node id and types
    cleaned_nodes = []
    for node in graph_document.nodes:
      node_type = str(node.type).strip() if node.type is not None else ""
      node_id = str(node.id).strip() if node.id is not None else ""
      if node_type and node_id:
        node.type = node_type.replace('`', '')
        node.id = node_id
        cleaned_nodes.append(node)
    # Clean relationship id types and source/target node id and types
    cleaned_relationships = []
    for rel in graph_document.relationships:
      # Defensive checks for source/target presence
      src = getattr(rel, "source", None)
      tgt = getattr(rel, "target", None)
      rel_type = str(rel.type).strip() if rel.type is not None else ""
      src_type = str(getattr(src, "type", "")).strip() if src is not None else ""
      src_id = str(getattr(src, "id", "")).strip() if src is not None else ""
      tgt_type = str(getattr(tgt, "type", "")).strip() if tgt is not None else ""
      tgt_id = str(getattr(tgt, "id", "")).strip() if tgt is not None else ""
      if rel_type and src_id and src_type and tgt_id and tgt_type:
        rel.type = rel_type.replace('`', '')
        if src is not None:
          src.type = src_type.replace('`', '')
          src.id = src_id.replace('`', '')
        if tgt is not None:
          tgt.type = tgt_type.replace('`', '')
          tgt.id = tgt_id
        cleaned_relationships.append(rel)
    graph_document.relationships = cleaned_relationships
    graph_document.nodes = cleaned_nodes
  return graph_document_list

def execute_graph_query(graph: Neo4jGraph, query, params=None, max_retries=3, delay=2):
   retries = 0
   while retries < max_retries:
       try:
           return graph.query(query, params) 
       except TransientError as e:
           if "DeadlockDetected" in str(e):
               retries += 1
               logging.info(f"Deadlock detected. Retrying {retries}/{max_retries} in {delay} seconds...")
               time.sleep(delay)  # Wait before retrying
           else:
               raise 
   logging.error("Failed to execute query after maximum retries due to persistent deadlocks.")
   raise RuntimeError("Query execution failed after multiple retries due to deadlock.")

def delete_uploaded_local_file(merged_file_path, file_name):
  file_path = Path(merged_file_path)
  if file_path.exists():
    file_path.unlink()
    logging.info(f'file {file_name} deleted successfully')
   
def close_db_connection(graph, api_name):
  if not graph._driver._closed:
      logging.info(f"closing connection for {api_name} api")
      # graph._driver.close()   
  
def create_gcs_bucket_folder_name_hashed(uri, file_name):
  folder_name = uri + file_name
  folder_name_sha1 = hashlib.sha1(folder_name.encode())
  folder_name_sha1_hashed = folder_name_sha1.hexdigest()
  return folder_name_sha1_hashed

def formatted_time(current_time):
  formatted_time = current_time.strftime('%Y-%m-%d %H:%M:%S %Z')
  return str(formatted_time)

def last_url_segment(url):
  parsed_url = urlparse(url)
  path = parsed_url.path.strip("/")  # Remove leading and trailing slashes
  last_url_segment = path.split("/")[-1] if path else parsed_url.netloc.split(".")[0]
  return last_url_segment


   
def get_value_from_env(key_name: str, default_value: Any = None, data_type: type = str):
  
  value = os.getenv(key_name, None)
  if value is not None and value != '':
    return convert_type(value, data_type)
  elif default_value is not None:
    return convert_type(default_value, data_type)
  else:
    error_msg = f"Environment variable '{key_name}' not found and no default value provided."
    logging.error(error_msg)
    return None


def convert_type(value: str, data_type: type):
    """Convert value to the specified data type."""
    try:
        if data_type in (int, "int"):
            return int(value)
        elif data_type in (float, "float"):
            return float(value)
        elif data_type in (bool, "bool"):
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return bool(value)
            if isinstance(value, str):
                return value.strip().lower() in ["true", "1", "yes"]
            raise ValueError(f"Cannot convert {value!r} to bool")
        elif data_type in (list, dict, "list", "dict"):
            return json.loads(value)
        elif data_type in (str, "str"):
            return str(value)
        else:
            raise TypeError(f"Unsupported data type for conversion: {data_type}")
    except Exception as e:
        logging.error(f"Type conversion error: {e}")
        raise


class UniversalTokenUsageHandler(BaseCallbackHandler):
    def __init__(self):
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def on_llm_end(self, response, **kwargs):
        usage = response.llm_output.get("token_usage") if response.llm_output else None
       
        if usage:
            self.total_prompt_tokens += usage.get("prompt_tokens") or usage.get("input_tokens") or 0
            self.total_completion_tokens += usage.get("completion_tokens") or usage.get("output_tokens") or 0
            return

        for generations in response.generations:
            for generation in generations:
                if hasattr(generation, 'message'):
                    metadata = getattr(generation.message, 'usage_metadata', {})
                    if metadata:
                        self.total_prompt_tokens += metadata.get("input_tokens", 0)
                        self.total_completion_tokens += metadata.get("output_tokens", 0)

    def report(self):
        return {
            "prompt_tokens": self.total_prompt_tokens,
            "completion_tokens": self.total_completion_tokens,
            "total_tokens": self.total_prompt_tokens + self.total_completion_tokens,
        }

def track_token_usage(
    email: str,
    uri: str,
    usage: int,
    last_used_model: str | None = None,
    operation_type: str | None = None,
) -> int:
    """
    Track and persist token usage for a user.
    - Matches by `email` or `db_url`.
    - Increments daily, monthly and total usage.
    """
    try:
        logging.info("inside new function of track_token_usage")
        normalized_email = (email or "").strip().lower() or None
        normalized_db_url = (uri or "").strip() or None

        if not normalized_email and not normalized_db_url:
            raise ValueError("Either email or db_url must be provided for token tracking.")

        token_uri = get_value_from_env("TOKEN_TRACKER_DB_URI")
        token_user = get_value_from_env("TOKEN_TRACKER_DB_USERNAME")
        token_password = get_value_from_env("TOKEN_TRACKER_DB_PASSWORD")
        token_database = get_value_from_env("TOKEN_TRACKER_DB_DATABASE", "neo4j")
        credentials = Neo4jCredentials(uri=token_uri, userName=token_user, password=token_password, database=token_database)
        if not all([token_uri, token_user, token_password]):
            raise EnvironmentError("Neo4j credentials are not set properly.")

        graph = create_graph_database_connection(credentials)
        daily_tokens_limit = get_value_from_env("DAILY_TOKENS_LIMIT", "250000", "int")
        monthly_tokens_limit = get_value_from_env("MONTHLY_TOKENS_LIMIT", "1000000", "int")
        is_neo4j_user = bool(normalized_email and normalized_email.endswith("@neo4j.com"))

        auth_required = get_value_from_env("AUTHENTICATION_REQUIRED", False, bool)

        params = {
            "email": normalized_email,
            "db_url": normalized_db_url,
            "usage": usage,
            "lastUsedModel": last_used_model or "",
            "is_neo4j_user": is_neo4j_user,
            "daily_tokens_limit": daily_tokens_limit,
            "monthly_tokens_limit": monthly_tokens_limit,
            "operation_type": operation_type,
        }

        if auth_required:
            if not normalized_email:
                raise ValueError("Email is required for token tracking when authentication is required.")
            merge_query = """
            MERGE (u:User {email: $email})
            ON CREATE SET
                u.db_url = $db_url,
                u.is_neo4j_user = $is_neo4j_user,
                u.daily_tokens_limit = $daily_tokens_limit,
                u.monthly_tokens_limit = $monthly_tokens_limit,
                u.daily_tokens_used = $usage,
                u.monthly_tokens_used = $usage,
                u.total_tokens_used = $usage,
                u.lastUsedModel = $lastUsedModel,
                u.lastOperationUsage = $usage,
                u.createdAt = datetime(),
                u.updatedAt = datetime()
            ON MATCH SET
                u.db_url = coalesce(u.db_url, $db_url),
                u.updatedAt = datetime()
            RETURN u
            """
            result = graph.query(merge_query, params)
        else:
            if not normalized_db_url:
                raise ValueError("db_url is required for token tracking when authentication is not required.")
            params["email"] = "local_user"
            merge_query = """
            MERGE (u:User {db_url: $db_url})
            ON CREATE SET
                u.email = $email,
                u.is_neo4j_user = $is_neo4j_user,
                u.daily_tokens_limit = $daily_tokens_limit,
                u.monthly_tokens_limit = $monthly_tokens_limit,
                u.daily_tokens_used = $usage,
                u.monthly_tokens_used = $usage,
                u.total_tokens_used = $usage,
                u.lastUsedModel = $lastUsedModel,
                u.lastOperationUsage = $usage,
                u.createdAt = datetime(),
                u.updatedAt = datetime()
            ON MATCH SET
                u.updatedAt = datetime()
            RETURN u
            """
            result = graph.query(merge_query, params)

        if auth_required:
            update_query = """
            MATCH (u:User {email: $email})
            SET u.lastOperationUsage   = $usage,
                u.daily_tokens_used   = coalesce(u.daily_tokens_used, 0) + $usage,
                u.monthly_tokens_used = coalesce(u.monthly_tokens_used, 0) + $usage,
                u.total_tokens_used   = coalesce(u.total_tokens_used, 0) + $usage,
                u.lastUsedModel       = $lastUsedModel,
                u.is_neo4j_user       = $is_neo4j_user,
                u.updatedAt           = datetime(),
                u.files_processed     = CASE 
                    WHEN coalesce(u.files_processed, NULL) IS NULL AND $usage > 0 THEN 1
                    WHEN $operation_type = 'extraction' AND $usage > 0 THEN coalesce(u.files_processed, 0) + 1
                    ELSE u.files_processed END
            RETURN
                u.total_tokens_used    AS latestUsage,
                u.lastOperationUsage   AS lastOperationUsage,
                u.daily_tokens_used    AS daily_tokens_used,
                u.monthly_tokens_used  AS monthly_tokens_used,
                u.daily_tokens_limit   AS daily_tokens_limit,
                u.monthly_tokens_limit AS monthly_tokens_limit
            """
            result = graph.query(update_query, params)
        else:
            update_query = """
            MATCH (u:User {db_url: $db_url})
            SET u.lastOperationUsage   = $usage,
                u.daily_tokens_used   = coalesce(u.daily_tokens_used, 0) + $usage,
                u.monthly_tokens_used = coalesce(u.monthly_tokens_used, 0) + $usage,
                u.total_tokens_used   = coalesce(u.total_tokens_used, 0) + $usage,
                u.lastUsedModel       = $lastUsedModel,
                u.is_neo4j_user       = $is_neo4j_user,
                u.updatedAt           = datetime(),
                u.files_processed     = CASE 
                    WHEN coalesce(u.files_processed, NULL) IS NULL AND $usage > 0 THEN 1
                    WHEN $operation_type = 'extraction' AND $usage > 0 THEN coalesce(u.files_processed, 0) + 1
                    ELSE u.files_processed END
            RETURN
                u.total_tokens_used    AS latestUsage,
                u.lastOperationUsage   AS lastOperationUsage,
                u.daily_tokens_used    AS daily_tokens_used,
                u.monthly_tokens_used  AS monthly_tokens_used,
                u.daily_tokens_limit   AS daily_tokens_limit,
                u.monthly_tokens_limit AS monthly_tokens_limit
            """
            result = graph.query(update_query, params)
        if result and "latestUsage" in result[0]:
            daily_tokens_limit = result[0].get("daily_tokens_limit", 0)
            monthly_tokens_limit = result[0].get("monthly_tokens_limit", 0)
            daily_tokens_used = result[0].get("daily_tokens_used", 0)
            monthly_tokens_used = result[0].get("monthly_tokens_used", 0)
            logging.info("Token usage for user before limit check: daily_used=%s monthly_used=%s", daily_tokens_used, monthly_tokens_used)
            logging.info("Token limits for user: daily_limit=%s monthly_limit=%s", daily_tokens_limit, monthly_tokens_limit)
            logging.info("Is Neo4j user: %s", is_neo4j_user)
            if ((daily_tokens_used > daily_tokens_limit) or (monthly_tokens_used > monthly_tokens_limit)) and not is_neo4j_user:
                raise LLMGraphBuilderException(
                    "Token usage limit exceeded. Please contact the team to increase your limit."
                )
            logging.info(
                "Updated token usage for user: "
                "latest=%s last_op=%s daily_used=%s monthly_used=%s",
                result[0]["latestUsage"],
                result[0].get("lastOperationUsage", 0),
                result[0].get("daily_tokens_used", 0),
                result[0].get("monthly_tokens_used", 0),
            )
            return result[0]["latestUsage"]

        logging.error("No matching User found or failed to fetch updated token usage. Result: %s", result)
        raise RuntimeError("User not found or failed to fetch updated token usage.")

    except Exception as e:
        logging.error(
            "Error in track_token_usage for identity %s: %s",
            email or uri,
            e,
            exc_info=True,
        )
        raise


def get_remaining_token_limits(email: str, uri: str) -> dict:
    """
    Returns the remaining daily and monthly token limits for a user, given email and/or uri.
    """
    try:
        normalized_email = (email or "").strip().lower() or None
        normalized_db_url = (uri or "").strip() or None
        if not normalized_email and not normalized_db_url:
            raise ValueError("Either email or db_url must be provided for token tracking.")

        token_uri = get_value_from_env("TOKEN_TRACKER_DB_URI")
        token_user = get_value_from_env("TOKEN_TRACKER_DB_USERNAME")
        token_password = get_value_from_env("TOKEN_TRACKER_DB_PASSWORD")
        token_database = get_value_from_env("TOKEN_TRACKER_DB_DATABASE", "neo4j")
        if not all([token_uri, token_user, token_password]):
            raise EnvironmentError("Neo4j credentials are not set properly.")

        credentials = Neo4jCredentials(uri=token_uri, userName=token_user, password=token_password, database=token_database)
        graph = create_graph_database_connection(credentials)

        auth_required = get_value_from_env("AUTHENTICATION_REQUIRED", False, bool)
        user_node = None
        if auth_required:
            if not normalized_email:
                raise ValueError("Email is required for token lookup when authentication is required.")
            result = graph.query(
                "MATCH (u:User {email: $email}) RETURN u", {"email": normalized_email}
            )
            if result and result[0].get("u"):
                user_node = result[0]["u"]
        else:
            if not normalized_db_url:
                raise ValueError("db_url is required for token lookup when authentication is not required.")
            result = graph.query(
                "MATCH (u:User {db_url: $db_url}) RETURN u", {"db_url": normalized_db_url}
            )
            if result and result[0].get("u"):
                user_node = result[0]["u"]

        daily_tokens_limit = get_value_from_env("DAILY_TOKENS_LIMIT", "250000", "int")
        monthly_tokens_limit = get_value_from_env("MONTHLY_TOKENS_LIMIT", "1000000", "int")
        daily_tokens_used = 0
        monthly_tokens_used = 0
        if user_node:
            daily_tokens_limit = user_node.get("daily_tokens_limit", daily_tokens_limit)
            monthly_tokens_limit = user_node.get("monthly_tokens_limit", monthly_tokens_limit)
            daily_tokens_used = user_node.get("daily_tokens_used", 0)
            monthly_tokens_used = user_node.get("monthly_tokens_used", 0)

        return {
            "daily_remaining": max(daily_tokens_limit - daily_tokens_used, 0),
            "monthly_remaining": max(monthly_tokens_limit - monthly_tokens_used, 0),
            "daily_limit": daily_tokens_limit,
            "monthly_limit": monthly_tokens_limit,
            "daily_used": daily_tokens_used,
            "monthly_used": monthly_tokens_used,
        }
    except Exception as e:
        logging.error(
            "Error in get_remaining_token_limits for identity %s: %s",
            email or uri,
            e,
            exc_info=True,
        )
        raise

def get_user_embedding_model(email: str, uri: str) -> dict:
    """
    Retrieve the embedding provider and model for a user from the User node.
    If not found, return default sentence-transformer values.
    """
    try:
        allow_embedding_change = False
        track_user_usage = get_value_from_env("TRACK_USER_USAGE", "false", bool)
        if not track_user_usage:
            embedding_provider = get_value_from_env("EMBEDDING_PROVIDER","sentence-transformer")
            embedding_model = get_value_from_env("EMBEDDING_MODEL","all-MiniLM-L6-v2")
            if not embedding_provider or not embedding_model:
                raise EnvironmentError("EMBEDDING_PROVIDER and EMBEDDING_MODEL environment variables must be set")
            _, embedding_dimension = load_embedding_model(embedding_provider, embedding_model)
            return embedding_provider, embedding_model, embedding_dimension, allow_embedding_change

        allow_embedding_change = True
        normalized_email = (email or "").strip().lower() or None
        normalized_db_url = (uri or "").strip() or None
        if not normalized_email and not normalized_db_url:
            raise ValueError("Either email or db_url must be provided for fetching embedding model.")

        token_uri = get_value_from_env("TOKEN_TRACKER_DB_URI")
        token_user = get_value_from_env("TOKEN_TRACKER_DB_USERNAME")
        token_password = get_value_from_env("TOKEN_TRACKER_DB_PASSWORD")
        token_database = get_value_from_env("TOKEN_TRACKER_DB_DATABASE", "neo4j")
        if not all([token_uri, token_user, token_password]):
            raise EnvironmentError("Neo4j credentials are not set properly.")

        credentials = Neo4jCredentials(uri=token_uri, userName=token_user, password=token_password, database=token_database)
        graph = create_graph_database_connection(credentials)

        auth_required = get_value_from_env("AUTHENTICATION_REQUIRED", False, bool)
        user_node = None
        if auth_required:
            result = graph.query(
                "MATCH (u:User {email: $email}) RETURN u", {"email": normalized_email}
            )
            if result and result[0].get("u"):
                user_node = result[0]["u"]
        else:
            result = graph.query(
                "MATCH (u:User {db_url: $db_url}) RETURN u", {"db_url": normalized_db_url}
            )
            if result and result[0].get("u"):
                user_node = result[0]["u"]

        if user_node:
            embedding_provider = user_node.get("embedding_provider")
            embedding_model = user_node.get("embedding_model")
            embedding_dimension = user_node.get("embedding_dimension")
            if embedding_provider and embedding_model and embedding_dimension is not None:
                return embedding_provider, embedding_model, embedding_dimension, allow_embedding_change

        return "sentence-transformer", "all-MiniLM-L6-v2", 384, allow_embedding_change
    except Exception as e:
        logging.error(f"Error in get_user_embedding_model for email {email}: {e}")
        return "sentence-transformer", "all-MiniLM-L6-v2", 384, allow_embedding_change

def change_user_embedding_model(email:str, uri:str, new_embedding_provider: str, new_embedding_model: str):
    """
    Update the User node's embedding_provider and embedding_model properties.
    If the embedding dimension changes, drop the vector index in the connected DB.
    Args:
        email (str): User's email
        uri (str): URI of the connected DB (not the token tracker DB)
        new_embedding_provider (str): New embedding provider
        new_embedding_model (str): New embedding model
    Returns:
        dict: {"status": "Success"/"Failed", "message": str}
    """
    try:
        normalized_email = (email or "").strip().lower() or None
        normalized_db_url = (uri or "").strip() or None
        if not normalized_email and not normalized_db_url:
            raise ValueError("Either email or db_url must be provided for changing embedding model.")

        token_uri = get_value_from_env("TOKEN_TRACKER_DB_URI")
        token_user = get_value_from_env("TOKEN_TRACKER_DB_USERNAME")
        token_password = get_value_from_env("TOKEN_TRACKER_DB_PASSWORD")
        token_database = get_value_from_env("TOKEN_TRACKER_DB_DATABASE", "neo4j")
        if not all([token_uri, token_user, token_password]):
            return {"status": "Failed", "message": "Token tracker DB credentials are not set properly."}

        tracker_credentials = Neo4jCredentials(uri=token_uri, userName=token_user, password=token_password, database=token_database)
        tracker_graph = create_graph_database_connection(tracker_credentials)

        auth_required = get_value_from_env("AUTHENTICATION_REQUIRED", False, bool)
        user_node = None
        result = None
        if auth_required:
            if not normalized_email:
                return {"status": "Failed", "message": "Email is required to update embedding model when authentication is required."}
            result = tracker_graph.query(
                "MATCH (u:User {email: $email}) RETURN u", {"email": normalized_email}
            )
        else:
            if not normalized_db_url:
                return {"status": "Failed", "message": "db_url is required to update embedding model when authentication is not required."}
            result = tracker_graph.query(
                "MATCH (u:User {db_url: $db_url}) RETURN u", {"db_url": normalized_db_url}
            )
        if result and result[0].get("u"):
            user_node = result[0]["u"]
            
        old_dimension = user_node.get("embedding_dimension") if user_node else 384
        _, new_dimension = load_embedding_model(new_embedding_provider, new_embedding_model)
        if auth_required:
            update_query = """
            MATCH (u:User {email: $email})
            SET u.embedding_provider = $embedding_provider, u.embedding_model = $embedding_model, u.embedding_dimension = $embedding_dimension, u.updatedAt = datetime()
            RETURN u
            """
            tracker_graph.query(update_query, {"email": normalized_email, "embedding_provider": new_embedding_provider, "embedding_model": new_embedding_model, "embedding_dimension": new_dimension})
        else:
            update_query = """
            MATCH (u:User {db_url: $db_url})
            SET u.embedding_provider = $embedding_provider, u.embedding_model = $embedding_model, u.embedding_dimension = $embedding_dimension, u.updatedAt = datetime()
            RETURN u
            """
            tracker_graph.query(update_query, {"db_url": normalized_db_url, "embedding_provider": new_embedding_provider, "embedding_model": new_embedding_model, "embedding_dimension": new_dimension})
        
        if old_dimension == new_dimension:
            return False
        else:
            return True
    except Exception as e:
        logging.error(f"Error in change_user_embedding_model for email {email}: {e}")
        return False
    