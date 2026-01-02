import hashlib
import os
import json
import logging
from typing import Any
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

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_PATH = "./local_model"
_lock = Lock()
_embedding_instance = None

def ensure_sentence_transformer_model_downloaded():
   if os.path.isdir(MODEL_PATH):
       logging.info(f"Model already downloaded at: {MODEL_PATH}")
       return
   else:
       logging.info(f"Downloading model to: {MODEL_PATH}")
       tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
       model = AutoModel.from_pretrained(MODEL_NAME)
       tokenizer.save_pretrained(MODEL_PATH)
       model.save_pretrained(MODEL_PATH)
   logging.info("Model downloaded and saved.")

def get_local_sentence_transformer_embedding():
   """
   Lazy, threadsafe singleton. Caller does not need to worry about
   import-time initialization or download race.
   """
   global _embedding_instance
   if _embedding_instance is not None:
       return _embedding_instance
   with _lock:
       if _embedding_instance is not None:
           return _embedding_instance
       # Ensure model is present before instantiating
       ensure_sentence_transformer_model_downloaded()
       _embedding_instance = HuggingFaceEmbeddings(model_name=MODEL_PATH)
       logging.info("Embedding model initialized.")
       return _embedding_instance
   
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
                 
def create_graph_database_connection(uri, userName, password, database):
  enable_user_agent = get_value_from_env("ENABLE_USER_AGENT", "False" ,"bool")
  if enable_user_agent:
    graph = Neo4jGraph(url=uri, database=database, username=userName, password=password, refresh_schema=False, sanitize=True,driver_config={'user_agent':get_value_from_env("USER_AGENT","LLM-Graph-Builder")}) 
  else:
    graph = Neo4jGraph(url=uri, database=database, username=userName, password=password, refresh_schema=False, sanitize=True)    
  return graph


def load_embedding_model(embedding_model_name: str):
    if embedding_model_name == "openai":
        embeddings = OpenAIEmbeddings()
        dimension = 1536
        logging.info(f"Embedding: Using OpenAI Embeddings , Dimension:{dimension}")
    elif embedding_model_name == "gemini":        
        embeddings = VertexAIEmbeddings(
            model="gemini-embedding-001"
        )
        dimension = 3072
        logging.info(f"Embedding: Using Vertex AI Embeddings , Dimension:{dimension}")
    elif embedding_model_name == "titan":
        embeddings = get_bedrock_embeddings()
        dimension = 1024
        logging.info(f"Embedding: Using bedrock titan Embeddings , Dimension:{dimension}")
    else:
        # embeddings = HuggingFaceEmbeddings(model_name="./local_model")
        embeddings = get_local_sentence_transformer_embedding()
        dimension = 384
        logging.info(f"Embedding: Using Langchain HuggingFaceEmbeddings , Dimension:{dimension}")
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
      if node.type.strip() and node.id.strip():
        node.type = node.type.replace('`', '')
        cleaned_nodes.append(node)
    # Clean relationship id types and source/target node id and types
    cleaned_relationships = []
    for rel in graph_document.relationships:
      if rel.type.strip() and rel.source.id.strip() and rel.source.type.strip() and rel.target.id.strip() and rel.target.type.strip():
        rel.type = rel.type.replace('`', '')
        rel.source.type = rel.source.type.replace('`', '')
        rel.target.type = rel.target.type.replace('`', '')
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

def get_bedrock_embeddings():
   """
   Creates and returns a BedrockEmbeddings object using the specified model name.
   Args:
       model (str): The name of the model to use for embeddings.
   Returns:
       BedrockEmbeddings: An instance of the BedrockEmbeddings class.
   """
   try:
       env_value = get_value_from_env("BEDROCK_EMBEDDING_MODEL")
       if not env_value:
           raise ValueError("Environment variable 'BEDROCK_EMBEDDING_MODEL' is not set.")
       try:
           model_name, aws_access_key, aws_secret_key, region_name = env_value.split(",")
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
   
def get_value_from_env(key_name: str, default_value: Any = None, data_type: type = str):
  
  value = os.getenv(key_name, None)
  if value is not None:
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
        for generations in response.generations:
            for generation in generations:
                if hasattr(generation, 'message') and hasattr(generation.message, 'usage_metadata'):
                    usage = generation.message.usage_metadata
                    if usage:
                        self.total_prompt_tokens += usage.get("input_tokens", 0)
                        self.total_completion_tokens += usage.get("output_tokens", 0)
                        continue

        if not self.total_prompt_tokens:
            usage = getattr(response, 'llm_output', {}).get('token_usage', {})
            self.total_prompt_tokens += usage.get('prompt_tokens', 0)
            self.total_completion_tokens += usage.get('completion_tokens', 0)

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
) -> int:
    """
    Track and persist token usage for a user.

    - Assumes a `User` node already exists (created elsewhere).
    - Matches by `email` or `db_url`.
    - Increments daily, monthly and total usage.
    - Stores previous total usage in `prevTokenUsage`.
    """
    try:
        logging.info("inside new function of track_token_usage")
        normalized_email = (email or "").strip().lower() or None
        normalized_db_url = (uri or "").strip() or None

        if not normalized_email and not normalized_db_url:
            raise ValueError("Either email or db_url must be provided for token tracking.")

        uri = get_value_from_env("TOKEN_TRACKER_DB_URI")
        user = get_value_from_env("TOKEN_TRACKER_DB_USERNAME")
        password = get_value_from_env("TOKEN_TRACKER_DB_PASSWORD")
        database = get_value_from_env("TOKEN_TRACKER_DB_DATABASE", "neo4j")
        if not all([uri, user, password]):
            raise EnvironmentError("Neo4j credentials are not set properly.")

        graph = create_graph_database_connection(uri, user, password, database)

        daily_tokens_limit = get_value_from_env("DAILY_TOKENS_LIMIT", "250000", "int")
        monthly_tokens_limit = get_value_from_env("MONTHLY_TOKENS_LIMIT", "1000000", "int")
        is_neo4j_user = bool(normalized_email and normalized_email.endswith("@neo4j.com"))

        if normalized_email:
            merge_clause = "MERGE (u:User {email: $email})"
        else:
            merge_clause = "MERGE (u:User {db_url: $db_url})"

        cypher_query = f"""
        {merge_clause}
        ON CREATE SET
            u.email = coalesce(u.email, $email),
            u.db_url = coalesce(u.db_url, $db_url),
            u.is_neo4j_user = $is_neo4j_user,
            u.daily_tokens_limit = $daily_tokens_limit,
            u.monthly_tokens_limit = $monthly_tokens_limit,
            u.daily_tokens_used = $usage,
            u.monthly_tokens_used = $usage,
            u.total_tokens_used = $usage,
            u.lastUsedModel = $lastUsedModel,
            u.lastOperationUsage = $usage,
            u.createdAt = coalesce(u.createdAt, datetime()),
            u.updatedAt = datetime()
        ON MATCH SET
            u.lastOperationUsage   = $usage,
            u.daily_tokens_used   = coalesce(u.daily_tokens_used, 0) + $usage,
            u.monthly_tokens_used = coalesce(u.monthly_tokens_used, 0) + $usage,
            u.total_tokens_used   = coalesce(u.total_tokens_used, 0) + $usage,
            u.lastUsedModel       = $lastUsedModel,
            u.updatedAt           = datetime()
        RETURN
            u.total_tokens_used    AS latestUsage,
            u.lastOperationUsage   AS lastOperationUsage,
            u.daily_tokens_used    AS daily_tokens_used,
            u.monthly_tokens_used  AS monthly_tokens_used,
            u.daily_tokens_limit   AS daily_tokens_limit,
            u.monthly_tokens_limit AS monthly_tokens_limit
        """

        params = {
            "email": normalized_email,
            "db_url": normalized_db_url,
            "usage": usage,
            "lastUsedModel": last_used_model or "",
            "is_neo4j_user": is_neo4j_user,
            "daily_tokens_limit": daily_tokens_limit,
            "monthly_tokens_limit": monthly_tokens_limit,
        }

        result = graph.query(cypher_query, params)
        if result and "latestUsage" in result[0]:
            daily_tokens_limit = result[0].get("daily_tokens_limit", 0)
            monthly_tokens_limit = result[0].get("monthly_tokens_limit", 0)
            daily_tokens_used = result[0].get("daily_tokens_used", 0)
            monthly_tokens_used = result[0].get("monthly_tokens_used", 0)
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


