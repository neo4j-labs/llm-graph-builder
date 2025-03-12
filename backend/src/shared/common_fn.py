import hashlib
import logging
from src.shared.constants import PROJECT_ID
from src.document_sources.youtube import create_youtube_url
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_neo4j import Neo4jGraph
from langchain_community.graphs.graph_document import GraphDocument
from typing import List
import re
import os
import json
import logging
from typing import Any
from google.cloud import secretmanager
from google.api_core.exceptions import NotFound, PermissionDenied
from pathlib import Path
from urllib.parse import urlparse
import boto3
from langchain_community.embeddings import BedrockEmbeddings



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
        #pattern = r"https?:\/\/([a-zA-Z0-9\.\,\_\-\/]+)\.wikipedia\.([a-zA-Z]{2,3})\/wiki\/([a-zA-Z0-9\.\,\_\-\/]+)"
        wikipedia_url_regex = r'https?:\/\/(www\.)?([a-zA-Z]{2,3})\.wikipedia\.org\/wiki\/(.*)'
        wiki_id_pattern = r'^[a-zA-Z0-9 _\-\.\,\:\(\)\[\]\{\}\/]*$'
        
        match = re.search(wikipedia_url_regex, wiki_query.strip())
        if match:
                language = match.group(2)
                wiki_query_id = match.group(3)
          # else : 
          #       languages.append("en")
          #       wiki_query_ids.append(wiki_url.strip())
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
  enable_user_agent = get_value_from_env_or_secret_manager("ENABLE_USER_AGENT", "False" ,"bool")
  if enable_user_agent:
    graph = Neo4jGraph(url=uri, database=database, username=userName, password=password, refresh_schema=False, sanitize=True,driver_config={'user_agent':get_value_from_env_or_secret_manager("USER_AGENT","LLM-Graph-Builder")})  
  else:
    graph = Neo4jGraph(url=uri, database=database, username=userName, password=password, refresh_schema=False, sanitize=True)    
  return graph


def load_embedding_model(embedding_model_name: str):
    if embedding_model_name == "openai":
        embeddings = OpenAIEmbeddings()
        dimension = 1536
        logging.info(f"Embedding: Using OpenAI Embeddings , Dimension:{dimension}")
    elif embedding_model_name == "vertexai":        
        embeddings = VertexAIEmbeddings(
            model="textembedding-gecko@003"
        )
        dimension = 768
        logging.info(f"Embedding: Using Vertex AI Embeddings , Dimension:{dimension}")
    elif embedding_model_name == "titan":
        embeddings = get_bedrock_embeddings()
        dimension = 1536
        logging.info(f"Embedding: Using bedrock titan Embeddings , Dimension:{dimension}")
    else:
        embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"#, cache_folder="/embedding_model"
        )
        dimension = 384
        logging.info(f"Embedding: Using Langchain HuggingFaceEmbeddings , Dimension:{dimension}")
    return embeddings, dimension

def save_graphDocuments_in_neo4j(graph:Neo4jGraph, graph_document_list:List[GraphDocument]):
  graph.add_graph_documents(graph_document_list, baseEntityLabel=True)
  # graph.add_graph_documents(graph_document_list)
  
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
       env_value = get_value_from_env_or_secret_manager("BEDROCK_EMBEDDING_MODEL")
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
       print(f"An unexpected error occurred: {e}")
       raise

def get_value_from_env_or_secret_manager(secret_name: str, default_value: Any = None, data_type: type = str):
  """
  Fetches a secret from Google Cloud Secret Manager.
  If GET_VALUE_FROM_SECRET_MANAGER env value True, Otherwise get from local .env file
  Converts the value to the specified data type.
  Args:
      secret_name (str): Name of the secret in Secret Manager.
      default_value (Any) : Any type of default value
      data_type (type): Expected data type (str, int, float, bool, list, dict).
  Returns:
      Converted value of the secret or environment variable.
  """
  get_value_from_env_or_secret_manager = os.getenv("GET_VALUE_FROM_SECRET_MANAGER","False").lower() in ["true", "1", "yes"]
  try:
    if get_value_from_env_or_secret_manager:
      client = secretmanager.SecretManagerServiceClient()
      secret_path = f"projects/{PROJECT_ID}/secrets/{secret_name}/versions/latest"
    
      response = client.access_secret_version(request={"name": secret_path})
      secret_value = response.payload.data.decode("UTF-8")
    else:
      secret_value = os.getenv(secret_name, None) 
  except (NotFound, PermissionDenied):
    logging.warning(f"Secret '{secret_name}' not found in Secret Manager. Checking environment variable.")
    secret_value = os.getenv(secret_name, None)

  if secret_value is None:
    return convert_type(default_value, data_type) # Return the default value when key not found in secret manager not in .env file.
  
  return convert_type(secret_value, data_type)


def convert_type(value: str, data_type: type):
  """Convert string value to the specified data type."""
  try:
    if data_type == "int":
      return int(value)
    elif data_type == "float":
      return float(value)
    elif data_type == "bool":
      return value.lower() in ["true", "1", "yes"]
    elif data_type == "list" or data_type == "dict":
      return json.loads(value)  # Convert JSON strings to list/dict
    return value  # Default to string
  except Exception as e:
    logging.error(f"Type conversion error: {e}")
    return None

GCS_FILE_CACHE = get_value_from_env_or_secret_manager("GCS_FILE_CACHE","False", "bool")  
BUCKET_UPLOAD = get_value_from_env_or_secret_manager("BUCKET_UPLOAD")
BUCKET_FAILED_FILE = get_value_from_env_or_secret_manager("BUCKET_FAILED_FILE")
EMBEDDING_MODEL = get_value_from_env_or_secret_manager("EMBEDDING_MODEL")