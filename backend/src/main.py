import hashlib
import json
import logging
import os
import re
import shutil
import sys
import time
import unicodedata
import urllib.parse
import warnings
from datetime import datetime

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_community.document_loaders import WikipediaLoader, WebBaseLoader
from langchain_neo4j import Neo4jGraph

from src.create_chunks import CreateChunksofDocument
from src.document_sources.gcs_bucket import (
    copy_failed_file, delete_file_from_gcs, get_documents_from_gcs,
    get_gcs_bucket_files_info, merge_file_gcs, upload_file_to_gcs
)
from src.document_sources.local_file import get_documents_from_file_by_path
from src.document_sources.s3_bucket import get_documents_from_s3, get_s3_files_info
from src.document_sources.web_pages import get_documents_from_web_page
from src.document_sources.wikipedia import get_documents_from_wikipedia
from src.document_sources.youtube import get_documents_from_youtube, get_youtube_combined_transcript
from src.entities.source_node import sourceNode
from src.graph_query import get_graphDB_driver
from src.graphDB_dataAccess import graphDBdataAccess
from src.llm import get_graph_from_llm
from src.make_relationships import (
    create_chunk_embeddings, create_chunk_vector_index, create_relation_between_chunks,
    execute_graph_query, merge_relationship_between_chunk_and_entites
)
from src.shared.common_fn import (
    check_url_source, create_gcs_bucket_folder_name_hashed, create_graph_database_connection,
    delete_uploaded_local_file, get_chunk_and_graphDocument, get_value_from_env,
    handle_backticks_nodes_relationship_id_type, last_url_segment, save_graphDocuments_in_neo4j, track_token_usage
)
from src.shared.constants import (
    DELETE_ENTITIES_AND_START_FROM_BEGINNING, QUERY_TO_DELETE_EXISTING_ENTITIES,
    QUERY_TO_GET_CHUNKS, QUERY_TO_GET_LAST_PROCESSED_CHUNK_POSITION,
    QUERY_TO_GET_LAST_PROCESSED_CHUNK_WITHOUT_ENTITY, QUERY_TO_GET_NODES_AND_RELATIONS_OF_A_DOCUMENT,
    START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION
)
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from src.shared.schema_extraction import schema_extraction_from_text

warnings.filterwarnings("ignore")
load_dotenv()

logging.basicConfig(format='%(asctime)s - %(message)s', level='INFO')
GCS_FILE_CACHE = get_value_from_env("GCS_FILE_CACHE", "False", "bool")
if GCS_FILE_CACHE:
    BUCKET_UPLOAD_FILE = get_value_from_env('BUCKET_UPLOAD_FILE', default_value=None, data_type=str)
    BUCKET_FAILED_FILE = get_value_from_env('BUCKET_FAILED_FILE', default_value=None, data_type=str)
    PROJECT_ID = get_value_from_env('PROJECT_ID', default_value=None, data_type=str)


def sanitize_uploaded_fileName(filename, max_length=100):
    """
    Sanitize filename to remove problematic characters and limit length.
    If filename is too long or contains non-ASCII, use a hash for uniqueness.

    Args:
        filename (str): The original filename.
        max_length (int): Maximum allowed length for the filename.

    Returns:
        str: Sanitized filename.
    """
    print("Original filename or incoming file Name:", filename)
    # safe_name = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    # safe_name = re.sub(r'[^A-Za-z0-9._-]', '_', safe_name)
    # if '.' in filename:
    #     base, ext = os.path.splitext(filename)
    # else:
    #     base, ext = filename, ''
    # if len(safe_name) == 0 or len(safe_name) > max_length:
    #     hash_part = hashlib.sha256(filename.encode('utf-8')).hexdigest()[:16]
    #     safe_name = (safe_name[:max_length] if len(safe_name) > 0 else 'file') + '_' + hash_part + ext
    #     if len(safe_name) > max_length:
    #         safe_name = safe_name[:max_length - len(ext) - 17] + '_' + hash_part + ext
    # print("Sanitized filename:", safe_name)
    return filename


def create_source_node_graph_url_s3(graph, params):
    """
    Create source nodes in the graph for files in an S3 bucket.

    Args:
        graph: Neo4j graph connection.
        params: SourceScanExtractParams object.

    Returns:
        tuple: (list of file info dicts, success_count, failed_count)
    """
    lst_file_name = []
    files_info = get_s3_files_info(
        params.source_url,
        aws_access_key_id=params.aws_access_key_id,
        aws_secret_access_key=params.aws_secret_access_key
    )
    if not files_info:
        raise LLMGraphBuilderException('No pdf files found.')
    logging.info('files info : %s', files_info)
    success_count = 0
    failed_count = 0

    for file_info in files_info:
        file_name = file_info['file_key']
        obj_source_node = sourceNode()
        obj_source_node.file_name = file_name.split('/')[-1].strip() if isinstance(file_name.split('/')[-1], str) else file_name.split('/')[-1]
        obj_source_node.file_type = 'pdf'
        obj_source_node.file_size = file_info['file_size_bytes']
        obj_source_node.file_source = params.source_type
        obj_source_node.model = params.model
        obj_source_node.url = str(params.source_url + file_name)
        obj_source_node.awsAccessKeyId = params.aws_access_key_id
        obj_source_node.created_at = datetime.now()
        obj_source_node.chunkNodeCount = 0
        obj_source_node.chunkRelCount = 0
        obj_source_node.entityNodeCount = 0
        obj_source_node.entityEntityRelCount = 0
        obj_source_node.communityNodeCount = 0
        obj_source_node.communityRelCount = 0
        try:
            graphDb_data_Access = graphDBdataAccess(graph)
            graphDb_data_Access.create_source_node(obj_source_node)
            success_count += 1
            lst_file_name.append({
                'fileName': obj_source_node.file_name,
                'fileSize': obj_source_node.file_size,
                'url': obj_source_node.url,
                'status': 'Success'
            })
        except Exception:
            failed_count += 1
            lst_file_name.append({
                'fileName': obj_source_node.file_name,
                'fileSize': obj_source_node.file_size,
                'url': obj_source_node.url,
                'status': 'Failed'
            })
    return lst_file_name, success_count, failed_count


def create_source_node_graph_url_gcs(graph, params, credentials):
    """
    Create source nodes in the graph for files in a GCS bucket.

    Args:
        graph: Neo4j graph connection.
        params: SourceScanExtractParams object.
        credentials: Google OAuth2 credentials.

    Returns:
        tuple: (list of file info dicts, success_count, failed_count)
    """
    success_count = 0
    failed_count = 0
    lst_file_name = []
    
    lst_file_metadata= get_gcs_bucket_files_info(params.gcs_project_id, params.gcs_bucket_name, params.gcs_bucket_folder, credentials)
    for file_metadata in lst_file_metadata :
      obj_source_node = sourceNode()
      obj_source_node.file_name = file_metadata['fileName'].strip() if isinstance(file_metadata['fileName'], str) else file_metadata['fileName']
      obj_source_node.file_size = file_metadata['fileSize']
      obj_source_node.url = file_metadata['url']
      obj_source_node.file_source = params.source_type
      obj_source_node.model = params.model
      obj_source_node.file_type = 'pdf'
      obj_source_node.gcsBucket = params.gcs_bucket_name
      obj_source_node.gcsBucketFolder = file_metadata['gcsBucketFolder']
      obj_source_node.gcsProjectId = file_metadata['gcsProjectId']
      obj_source_node.created_at = datetime.now()
      obj_source_node.access_token = credentials.token
      obj_source_node.chunkNodeCount=0
      obj_source_node.chunkRelCount=0
      obj_source_node.entityNodeCount=0
      obj_source_node.entityEntityRelCount=0
      obj_source_node.communityNodeCount=0
      obj_source_node.communityRelCount=0
    
      try:
          graphDb_data_Access = graphDBdataAccess(graph)
          graphDb_data_Access.create_source_node(obj_source_node)
          success_count+=1
          lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success', 
                                'gcsBucketName': params.gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder, 'gcsProjectId':obj_source_node.gcsProjectId})
      except Exception as e:
        failed_count+=1
        lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Failed', 
                              'gcsBucketName': params.gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder, 'gcsProjectId':obj_source_node.gcsProjectId})
    return lst_file_name,success_count,failed_count

def create_source_node_graph_web_url(graph, params):
    """
    Create a source node in the graph for a web page.

    Args:
        graph: Neo4j graph connection.
        params: SourceScanExtractParams object.

    Returns:
        tuple: (list of file info dicts, success_count, failed_count)
    """
    success_count=0
    failed_count=0
    lst_file_name = []
    pages = WebBaseLoader(params.source_url, verify_ssl=False).load()
    if pages==None or len(pages)==0:
      failed_count+=1
      message = f"Unable to read data for given url : {params.source_url}"
      raise LLMGraphBuilderException(message)
    try:
      title = pages[0].metadata['title'].strip()
      if title:
        graphDb_data_Access = graphDBdataAccess(graph)
        existing_url = graphDb_data_Access.get_websource_url(title)
        if existing_url != params.source_url:
          title = str(title) + "-" + str(last_url_segment(params.source_url)).strip()
      else:
        title = last_url_segment(params.source_url)
      language = pages[0].metadata['language']
    except:
      title = last_url_segment(params.source_url)
      language = "N/A"

    obj_source_node = sourceNode()
    obj_source_node.file_type = 'text'
    obj_source_node.file_source = params.source_type
    obj_source_node.model = params.model
    obj_source_node.url = urllib.parse.unquote(params.source_url)
    obj_source_node.created_at = datetime.now()
    obj_source_node.file_name = title.strip() if isinstance(title, str) else title
    obj_source_node.language = language
    obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
    obj_source_node.chunkNodeCount=0
    obj_source_node.chunkRelCount=0
    obj_source_node.entityNodeCount=0
    obj_source_node.entityEntityRelCount=0
    obj_source_node.communityNodeCount=0
    obj_source_node.communityRelCount=0
    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.create_source_node(obj_source_node)
    lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success'})
    success_count+=1
    return lst_file_name,success_count,failed_count
  
def create_source_node_graph_url_youtube(graph, params):
    """
    Create a source node in the graph for a YouTube video.

    Args:
        graph: Neo4j graph connection.
        params: SourceScanExtractParams object.

    Returns:
        tuple: (list of file info dicts, success_count, failed_count)
    """
    youtube_url, language = check_url_source(source_type=params.source_type, yt_url=params.source_url)
    success_count=0
    failed_count=0
    lst_file_name = []
    obj_source_node = sourceNode()
    obj_source_node.file_type = 'text'
    obj_source_node.file_source = params.source_type
    obj_source_node.model = params.model
    obj_source_node.url = youtube_url
    obj_source_node.created_at = datetime.now()
    obj_source_node.chunkNodeCount=0
    obj_source_node.chunkRelCount=0
    obj_source_node.entityNodeCount=0
    obj_source_node.entityEntityRelCount=0
    obj_source_node.communityNodeCount=0
    obj_source_node.communityRelCount=0
    match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*',obj_source_node.url)
    logging.info(f"match value: {match}")
    obj_source_node.file_name = match.group(1)
    transcript= get_youtube_combined_transcript(match.group(1))
    # logging.info(f"Youtube transcript : {transcript}")
    if transcript==None or len(transcript)==0:
      message = f"Youtube transcript is not available for : {obj_source_node.file_name}"
      raise LLMGraphBuilderException(message)
    else:  
      obj_source_node.file_size = sys.getsizeof(transcript)
    
    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.create_source_node(obj_source_node)
    lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success'})
    success_count+=1
    return lst_file_name,success_count,failed_count

def create_source_node_graph_url_wikipedia(graph, params):
    """
    Create a source node in the graph for a Wikipedia page.

    Args:
        graph: Neo4j graph connection.
        params: SourceScanExtractParams object.

    Returns:
        tuple: (list of file info dicts, success_count, failed_count)
    """
    success_count=0
    failed_count=0
    lst_file_name=[]
    wiki_query_id, language = check_url_source(source_type=params.source_type, wiki_query=params.wiki_query)
    logging.info(f"Creating source node for {wiki_query_id.strip()}, {language}")
    pages = WikipediaLoader(query=wiki_query_id.strip(), lang=language, load_max_docs=1, load_all_available_meta=True).load()
    if pages==None or len(pages)==0:
      failed_count+=1
      message = f"Unable to read data for given Wikipedia url : {params.wiki_query}"
      raise LLMGraphBuilderException(message)
    else:
      obj_source_node = sourceNode()
      obj_source_node.file_name = wiki_query_id.strip()
      obj_source_node.file_type = 'text'
      obj_source_node.file_source = params.source_type
      obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
      obj_source_node.model = params.model
      obj_source_node.url = urllib.parse.unquote(pages[0].metadata['source'])
      obj_source_node.created_at = datetime.now()
      obj_source_node.language = language
      obj_source_node.chunkNodeCount=0
      obj_source_node.chunkRelCount=0
      obj_source_node.entityNodeCount=0
      obj_source_node.entityEntityRelCount=0
      obj_source_node.communityNodeCount=0
      obj_source_node.communityRelCount=0
      graphDb_data_Access = graphDBdataAccess(graph)
      graphDb_data_Access.create_source_node(obj_source_node)
      success_count+=1
      lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url, 'language':obj_source_node.language, 'status':'Success'})
    return lst_file_name,success_count,failed_count
    
async def extract_graph_from_file_local_file(credentials, params, merged_file_path):

  logging.info(f'Process file name :{params.file_name} from local file system')
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    if GCS_FILE_CACHE:
      folder_name = create_gcs_bucket_folder_name_hashed(credentials.uri, params.file_name)
      file_name, pages = get_documents_from_gcs( PROJECT_ID, BUCKET_UPLOAD_FILE, folder_name, params.file_name)
    else:
      file_name, pages, file_extension = get_documents_from_file_by_path(merged_file_path, params.file_name)
    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'File content is not available for file : {file_name}')
    return await processing_source(credentials, params, pages, merged_file_path, True)
  else:
    return await processing_source(credentials, params, [], merged_file_path, True)
  
async def extract_graph_from_file_s3(credentials, params):
  """
  Extract graph data from a file in S3.

  Args:
      credentials: Database credentials.
      params: SourceScanExtractParams object.

  Returns:
      dict: Processing latency and response details.
  """
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    if params.aws_access_key_id is None or params.aws_secret_access_key is None:
      raise LLMGraphBuilderException('Please provide AWS access and secret keys')
    else:
      logging.info("Insert in S3 Block")
      file_name, pages = get_documents_from_s3(params.source_url, params.aws_access_key_id, params.aws_secret_access_key)
    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'File content is not available for file : {file_name}')
    return await processing_source(credentials, params, pages)
  else:
    return await processing_source(credentials, params, [])
  
async def extract_graph_from_web_page(credentials, params):
  """
  Extract graph data from a web page.

  Args:
      credentials: Database credentials.
      params: SourceScanExtractParams object.

  Returns:
      dict: Processing latency and response details.
  """
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    pages = get_documents_from_web_page(params.source_url)
    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'Content is not available for given URL : {params.source_url}')
    return await processing_source(credentials, params, pages)
  else:
    return await processing_source(credentials, params, [])
  
async def extract_graph_from_file_youtube(credentials, params):
  """
  Extract graph data from a YouTube video.

  Args:
      credentials: Database credentials.
      params: SourceScanExtractParams object.

  Returns:
      dict: Processing latency and response details.
  """
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    file_name, pages = get_documents_from_youtube(params.source_url)

    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'Youtube transcript is not available for file : {file_name}')
    return await processing_source(credentials, params, pages)
  else:
     return await processing_source(credentials, params, [])
    
async def extract_graph_from_file_Wikipedia(credentials, params):
  """
  Extract graph data from a Wikipedia page.

  Args:
      credentials: Database credentials.
      params: SourceScanExtractParams object.

  Returns:
      dict: Processing latency and response details.
  """
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    file_name, pages = get_documents_from_wikipedia(params.wiki_query, params.language)
    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'Wikipedia page is not available for file : {file_name}')
    return await processing_source(credentials, params, pages)
  else:
    return await processing_source(credentials, params,[])

async def extract_graph_from_file_gcs(credentials, params):
  """
  Extract graph data from a file in GCS.

  Args:
      credentials: Database credentials.
      params: SourceScanExtractParams object.

  Returns:
      dict: Processing latency and response details.
  """
  if params.retry_condition in ["", None] or params.retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    file_name, pages = get_documents_from_gcs(params.gcs_project_id, params.gcs_bucket_name, params.gcs_bucket_folder, params.gcs_blob_filename, params.access_token)
    if pages==None or len(pages)==0:
      raise LLMGraphBuilderException(f'File content is not available for file : {file_name}')
    return await processing_source(credentials, params, pages)
  else:
    return await processing_source(credentials, params, [])
  
async def processing_source(credentials, params, pages, merged_file_path=None, is_uploaded_from_local=None):
  """
   Extracts a Neo4jGraph from a PDF file based on the model.
   
   Args:
   	 credentials: Database credentials object containing uri, userName, password, database
   	 file: File object containing the PDF file to be used
   	 model: Type of model to use ('Diffbot'or'OpenAI GPT')
   
   Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.
  """
  uri_latency = {}
  response = {}  
  start_time = datetime.now()
  processing_source_start_time = time.time()
  start_create_connection = time.time()
  graph = create_graph_database_connection(credentials)
  end_create_connection = time.time()
  elapsed_create_connection = end_create_connection - start_create_connection
  logging.info(f'Time taken database connection: {elapsed_create_connection:.2f} seconds')
  uri_latency["create_connection"] = f'{elapsed_create_connection:.2f}'
  graphDb_data_Access = graphDBdataAccess(graph)
  create_chunk_vector_index(graph, params.embedding_provider,params.embedding_model)
  start_get_chunkId_chunkDoc_list = time.time()
  total_chunks, chunkId_chunkDoc_list = get_chunkId_chunkDoc_list(graph, params.file_name, pages, params.token_chunk_size, params.chunk_overlap, params.retry_condition, credentials.email)
  end_get_chunkId_chunkDoc_list = time.time()
  elapsed_get_chunkId_chunkDoc_list = end_get_chunkId_chunkDoc_list - start_get_chunkId_chunkDoc_list
  logging.info(f'Time taken to create list chunkids with chunk document: {elapsed_get_chunkId_chunkDoc_list:.2f} seconds')
  uri_latency["create_list_chunk_and_document"] = f'{elapsed_get_chunkId_chunkDoc_list:.2f}'
  uri_latency["total_chunks"] = total_chunks

  start_status_document_node = time.time()
  result = graphDb_data_Access.get_current_status_document_node(params.file_name)
  end_status_document_node = time.time()
  elapsed_status_document_node = end_status_document_node - start_status_document_node
  logging.info(f'Time taken to get the current status of document node: {elapsed_status_document_node:.2f} seconds')
  uri_latency["get_status_document_node"] = f'{elapsed_status_document_node:.2f}'

  select_chunks_with_retry=0
  node_count = 0
  rel_count = 0
      
  if len(result) > 0:
    if result[0]['Status'] != 'Processing':      
      obj_source_node = sourceNode()
      status = "Processing"
      obj_source_node.file_name = params.file_name.strip() if isinstance(params.file_name, str) else params.file_name
      obj_source_node.status = status
      obj_source_node.total_chunks = total_chunks
      obj_source_node.model = params.model
      obj_source_node.embedding_model = params.embedding_model
      if params.retry_condition == START_FROM_LAST_PROCESSED_POSITION:
          node_count = result[0]['nodeCount']
          rel_count = result[0]['relationshipCount']
          select_chunks_with_retry = result[0]['processed_chunk']
      obj_source_node.processed_chunk = 0+select_chunks_with_retry
      logging.info(params.file_name)
      logging.info(obj_source_node)
      #pre checking if user is allowed to process the file
      if get_value_from_env("TRACK_USER_USAGE", "false", "bool"):
        try:
          track_token_usage(credentials.email, credentials.uri, 0, params.model, operation_type="precheck")
        except LLMGraphBuilderException as e:
          logging.error(str(e))
          raise RuntimeError(str(e))
      start_update_source_node = time.time()
      graphDb_data_Access.update_source_node(obj_source_node)
      graphDb_data_Access.update_node_relationship_count(params.file_name)
      end_update_source_node = time.time()
      elapsed_update_source_node = end_update_source_node - start_update_source_node
      logging.info(f'Time taken to update the document source node: {elapsed_update_source_node:.2f} seconds')
      uri_latency["update_source_node"] = f'{elapsed_update_source_node:.2f}'

      logging.info('Update the status as Processing')
      update_graph_chunk_processed = get_value_from_env("UPDATE_GRAPH_CHUNKS_PROCESSED",20,"int")
      # selected_chunks = []
      is_cancelled_status = False
      job_status = "Completed"
      tokens_per_file = 0
      for i in range(0, len(chunkId_chunkDoc_list), update_graph_chunk_processed):
        select_chunks_upto = i+update_graph_chunk_processed
        logging.info(f'Selected Chunks upto: {select_chunks_upto}')
        if len(chunkId_chunkDoc_list) <= select_chunks_upto:
          select_chunks_upto = len(chunkId_chunkDoc_list)
        selected_chunks = chunkId_chunkDoc_list[i:select_chunks_upto]
        
        result = graphDb_data_Access.get_current_status_document_node(params.file_name)
        is_cancelled_status = result[0]['is_cancelled']
        logging.info(f"Value of is_cancelled : {result[0]['is_cancelled']}")
        if bool(is_cancelled_status) == True:
          job_status = "Cancelled"
          logging.info('Exit from running loop of processing file')
          break
        else:
          processing_chunks_start_time = time.time()
          node_count,rel_count,latency_processed_chunk,token_usage = await processing_chunks(selected_chunks,graph,credentials,params.file_name,params.model,params.allowedNodes,params.allowedRelationship,params.chunks_to_combine,node_count, rel_count, params.additional_instructions, params.embedding_provider, params.embedding_model)
          logging.info("Token used in processing chunks: %s", token_usage)
          tokens_per_file += token_usage
          logging.info("Total token used per file: %s", tokens_per_file)
          start_save_token = time.time()
          try:
            if get_value_from_env("TRACK_USER_USAGE", "false", "bool"):
                    track_token_usage(credentials.email,credentials.uri,token_usage, params.model, operation_type="extraction")
                    logging.info("Token usage for extraction: %s for user: %s", token_usage, credentials.email)
          except LLMGraphBuilderException as e:
            logging.info(f"Error while tracking token usage: {e}")
            obj_source_node = sourceNode()
            obj_source_node.file_name = params.file_name
            obj_source_node.updated_at = datetime.now()
            obj_source_node.processing_time = datetime.now() - start_time
            obj_source_node.processed_chunk = select_chunks_upto + select_chunks_with_retry
            obj_source_node.token_usage = tokens_per_file
            graphDb_data_Access.update_source_node(obj_source_node)
            graphDb_data_Access.update_node_relationship_count(params.file_name)
            raise e
          end_save_token = time.time()
          elapsed_save_token = end_save_token - start_save_token
          logging.info(f'Time taken to save token count: {elapsed_save_token:.2f} seconds')

          processing_chunks_end_time = time.time()
          processing_chunks_elapsed_end_time = processing_chunks_end_time - processing_chunks_start_time
          logging.info(f"Time taken {update_graph_chunk_processed} chunks processed upto {select_chunks_upto} completed in {processing_chunks_elapsed_end_time:.2f} seconds for file name {params.file_name}")
          uri_latency[f'processed_combine_chunk_{i}-{select_chunks_upto}'] = f'{processing_chunks_elapsed_end_time:.2f}'
          uri_latency[f'processed_chunk_detail_{i}-{select_chunks_upto}'] = latency_processed_chunk
          end_time = datetime.now()
          processed_time = end_time - start_time
          
          obj_source_node = sourceNode()
          obj_source_node.file_name = params.file_name
          obj_source_node.updated_at = end_time
          obj_source_node.processing_time = processed_time
          obj_source_node.processed_chunk = select_chunks_upto+select_chunks_with_retry
          obj_source_node.token_usage = tokens_per_file
          if params.retry_condition == START_FROM_BEGINNING:
            result = execute_graph_query(graph,QUERY_TO_GET_NODES_AND_RELATIONS_OF_A_DOCUMENT, params={"filename":params.file_name})
            obj_source_node.node_count = result[0]['nodes']
            obj_source_node.relationship_count = result[0]['rels']
          else:  
            obj_source_node.node_count = node_count
            obj_source_node.relationship_count = rel_count
          graphDb_data_Access.update_source_node(obj_source_node)
          graphDb_data_Access.update_node_relationship_count(params.file_name)
      result = graphDb_data_Access.get_current_status_document_node(params.file_name)
      is_cancelled_status = result[0]['is_cancelled']
      if bool(is_cancelled_status) == True:
        logging.info(f'Is_cancelled True at the end extraction')
        job_status = 'Cancelled'
      logging.info(f'Job Status at the end : {job_status}')
      end_time = datetime.now()
      processed_time = end_time - start_time
      obj_source_node = sourceNode()
      obj_source_node.file_name = params.file_name.strip() if isinstance(params.file_name, str) else params.file_name
      obj_source_node.status = job_status
      obj_source_node.processing_time = processed_time
      obj_source_node.token_usage = tokens_per_file

      graphDb_data_Access.update_source_node(obj_source_node)
      graphDb_data_Access.update_node_relationship_count(params.file_name)
      logging.info('Updated the nodeCount and relCount properties in Document node')
      logging.info(f'file:{params.file_name} extraction has been completed')


      # merged_file_path have value only when file uploaded from local
      
      if is_uploaded_from_local and bool(is_cancelled_status) == False:
        if GCS_FILE_CACHE:
          folder_name = create_gcs_bucket_folder_name_hashed(credentials.uri, params.file_name)
          delete_file_from_gcs(BUCKET_UPLOAD_FILE,folder_name,params.file_name)
        else:
          delete_uploaded_local_file(merged_file_path, params.file_name)  
      processing_source_func = time.time() - processing_source_start_time
      logging.info(f"Time taken to processing source function completed in {processing_source_func:.2f} seconds for file name {params.file_name}")  
      uri_latency["Processed_source"] = f'{processing_source_func:.2f}'
      if node_count == 0:
        uri_latency["Per_entity_latency"] = 'N/A'
      else:  
        uri_latency["Per_entity_latency"] = f'{int(processing_source_func)/node_count}/s'
      
      response["fileName"] = params.file_name
      response["nodeCount"] = node_count
      response["relationshipCount"] = rel_count
      response["total_processing_time"] = round(processed_time.total_seconds(),2)
      response["status"] = job_status
      response["model"] = params.model
      response["success_count"] = 1
      response['token_usage'] = tokens_per_file
      
      return uri_latency, response
    else:      
      logging.info("File does not process because its already in Processing status")
      return uri_latency,response
  else:
    error_message = "Unable to get the status of document node."
    logging.error(error_message)
    raise LLMGraphBuilderException(error_message)

async def processing_chunks(chunkId_chunkDoc_list,graph,credentials,file_name,model,allowedNodes,allowedRelationship, chunks_to_combine, node_count, rel_count, additional_instructions, embedding_provider, embedding_model):
  #create vector index and update chunk node with embedding
  latency_processing_chunk = {}
  if graph is not None:
    if graph._driver._closed:
      graph = create_graph_database_connection(credentials)
  else:
    graph = create_graph_database_connection(credentials)
    
  start_update_embedding = time.time()
  create_chunk_embeddings( graph, chunkId_chunkDoc_list, file_name, embedding_provider, embedding_model)
  end_update_embedding = time.time()
  elapsed_update_embedding = end_update_embedding - start_update_embedding
  logging.info(f'Time taken to update embedding in chunk node: {elapsed_update_embedding:.2f} seconds')
  latency_processing_chunk["update_embedding"] = f'{elapsed_update_embedding:.2f}'
  logging.info("Get graph document list from models")
  
  start_entity_extraction = time.time()
  graph_documents, token_usage =  await get_graph_from_llm(model, chunkId_chunkDoc_list, allowedNodes, allowedRelationship, chunks_to_combine, additional_instructions)
  end_entity_extraction = time.time()
  elapsed_entity_extraction = end_entity_extraction - start_entity_extraction
  logging.info(f'Time taken to extract enitities from LLM Graph Builder: {elapsed_entity_extraction:.2f} seconds')
  latency_processing_chunk["entity_extraction"] = f'{elapsed_entity_extraction:.2f}'
  
  cleaned_graph_documents = handle_backticks_nodes_relationship_id_type(graph_documents)
  
  start_save_graphDocuments = time.time()
  save_graphDocuments_in_neo4j(graph, cleaned_graph_documents)
  end_save_graphDocuments = time.time()
  elapsed_save_graphDocuments = end_save_graphDocuments - start_save_graphDocuments
  logging.info(f'Time taken to save graph document in neo4j: {elapsed_save_graphDocuments:.2f} seconds')
  latency_processing_chunk["save_graphDocuments"] = f'{elapsed_save_graphDocuments:.2f}'

  chunks_and_graphDocuments_list = get_chunk_and_graphDocument(cleaned_graph_documents, chunkId_chunkDoc_list)

  start_relationship = time.time()
  merge_relationship_between_chunk_and_entites(graph, chunks_and_graphDocuments_list)
  end_relationship = time.time()
  elapsed_relationship = end_relationship - start_relationship
  logging.info(f'Time taken to create relationship between chunk and entities: {elapsed_relationship:.2f} seconds')
  latency_processing_chunk["relationship_between_chunk_entity"] = f'{elapsed_relationship:.2f}'
  
  graphDb_data_Access = graphDBdataAccess(graph)
  count_response = graphDb_data_Access.update_node_relationship_count(file_name)
  node_count = count_response[file_name].get('nodeCount',"0")
  rel_count = count_response[file_name].get('relationshipCount',"0")
  return node_count,rel_count,latency_processing_chunk,token_usage

def get_chunkId_chunkDoc_list(graph, file_name, pages, token_chunk_size, chunk_overlap, retry_condition, email):
  """
  Get chunk IDs and corresponding document chunks for a file.

  Args:
      graph: Neo4j graph connection.
      file_name (str): Name of the file.
      pages (list): List of document pages.
      token_chunk_size (int): Token size for chunking.
      chunk_overlap (int): Overlap size for chunks.
      retry_condition (str): Condition for retrying chunk creation.
      email (str): User email for tracking.

  Returns:
      tuple: (total_chunks, chunkId_chunkDoc_list)
  """
  if retry_condition in ["", None] or retry_condition not in [DELETE_ENTITIES_AND_START_FROM_BEGINNING, START_FROM_LAST_PROCESSED_POSITION]:
    logging.info("Break down file into chunks")
    bad_chars = ['"', "\n", "'"]
    for i in range(0,len(pages)):
      text = pages[i].page_content
      for j in bad_chars:
        if j == '\n':
          text = text.replace(j, ' ')
        else:
          text = text.replace(j, '')
      pages[i]=Document(page_content=str(text), metadata=pages[i].metadata)
    create_chunks_obj = CreateChunksofDocument(pages, graph)
    chunks = create_chunks_obj.split_file_into_chunks(token_chunk_size, chunk_overlap, email)
    chunkId_chunkDoc_list = create_relation_between_chunks(graph,file_name,chunks)
    return len(chunks), chunkId_chunkDoc_list
  
  else:  
    chunkId_chunkDoc_list=[]
    chunks =  execute_graph_query(graph,QUERY_TO_GET_CHUNKS, params={"filename":file_name})
    
    if chunks[0]['text'] is None or chunks[0]['text']=="" or not chunks :
      raise LLMGraphBuilderException(f"Chunks are not created for {file_name}. Please re-upload file or reprocess the file with option Start From Beginning.")    
    else:
      for chunk in chunks:
        chunk_doc = Document(page_content=chunk['text'], metadata={'id':chunk['id'], 'position':chunk['position']})
        chunkId_chunkDoc_list.append({'chunk_id': chunk['id'], 'chunk_doc': chunk_doc})
      
      if retry_condition ==  START_FROM_LAST_PROCESSED_POSITION:
        logging.info(f"Retry : start_from_last_processed_position")
        starting_chunk = execute_graph_query(graph,QUERY_TO_GET_LAST_PROCESSED_CHUNK_POSITION, params={"filename":file_name})
        
        if starting_chunk and starting_chunk[0]["position"] < len(chunkId_chunkDoc_list):
          return len(chunks), chunkId_chunkDoc_list[starting_chunk[0]["position"] - 1:]
        
        elif starting_chunk and starting_chunk[0]["position"] == len(chunkId_chunkDoc_list):
          starting_chunk =  execute_graph_query(graph,QUERY_TO_GET_LAST_PROCESSED_CHUNK_WITHOUT_ENTITY, params={"filename":file_name})
          return len(chunks), chunkId_chunkDoc_list[starting_chunk[0]["position"] - 1:]
        
        else:
          raise LLMGraphBuilderException(f"All chunks of file {file_name} are already processed. If you want to re-process, Please start from begnning")    
      
      else:
        logging.info(f"Retry : start_from_beginning with chunks {len(chunkId_chunkDoc_list)}")    
        return len(chunks), chunkId_chunkDoc_list
  
def get_source_list_from_graph(credentials):
  
  logging.info("Get existing files list from graph")
  graph = Neo4jGraph(url=credentials.uri, database=credentials.database, username=credentials.userName, password=credentials.password)
  graph_DB_dataAccess = graphDBdataAccess(graph)
  result = graph_DB_dataAccess.get_source_list()
  if not graph._driver._closed:
      logging.info(f"closing connection for sources_list api")
      graph._driver.close()
  return result

def update_graph(graph):
  """
  Update the graph node with SIMILAR relationship where embedding scrore match
  """
  graph_DB_dataAccess = graphDBdataAccess(graph)
  graph_DB_dataAccess.update_KNN_graph()

def connection_check_and_get_vector_dimensions(graph, database, email, uri):
  """
  Args:
    uri: URI of the graph to extract
    userName: Username to use for graph creation ( if None will use username from config file )
    password: Password to use for graph creation ( if None will use password from config file )
    db_name: db_name is database name to connect to graph db
  Returns:
   Returns a status of connection from NEO4j is success or failure
 """
  graph_DB_dataAccess = graphDBdataAccess(graph)
  return graph_DB_dataAccess.connection_check_and_get_vector_dimensions(database, email, uri)


def merge_chunks_local(file_name, total_chunks, chunk_dir, merged_dir):
  """
  Merge file chunks into a single file locally.

  Args:
      file_name (str): Name of the original file.
      total_chunks (int): Total number of chunks.
      chunk_dir (str): Directory where chunks are stored.
      merged_dir (str): Directory where the merged file will be saved.

  Returns:
      int: Size of the merged file.
  """
  if not os.path.exists(merged_dir):
    os.mkdir(merged_dir)
  logging.info(f'Merged File Path: {merged_dir}')
  merged_file_path = os.path.join(merged_dir, file_name)
  with open(merged_file_path, "wb") as write_stream:
    for i in range(1, total_chunks + 1):
      chunk_file_path = os.path.join(chunk_dir, f"{file_name}_part_{i}")
      logging.info(f'Chunk File Path While Merging Parts:{chunk_file_path}')
      with open(chunk_file_path, "rb") as chunk_file:
        shutil.copyfileobj(chunk_file, write_stream)
      os.unlink(chunk_file_path)  # Delete the individual chunk file after merging
  logging.info("Chunks merged successfully and return file size")
  file_size = os.path.getsize(merged_file_path)
  return file_size

def upload_file(graph, model, chunk, chunk_number: int, total_chunks: int, file_name, uri, chunk_dir, merged_dir):
    """
    Upload a file or its chunk to the specified destination (GCS or local).

    Args:
        graph: Neo4j graph connection.
        model: Model name used for processing.
        chunk: File chunk to be uploaded.
        chunk_number (int): Chunk number.
        total_chunks (int): Total number of chunks.
        file_name (str): Original file name.
        uri: Database URI.
        chunk_dir (str): Directory for storing chunks.
        merged_dir (str): Directory for storing merged files.

    Returns:
        str: Status message indicating the result of the upload operation.
    """
    # Use sanitized filename for chunk operations
    safe_file_name = sanitize_uploaded_fileName(file_name)
    if GCS_FILE_CACHE:
      folder_name = create_gcs_bucket_folder_name_hashed(uri, safe_file_name)
      upload_file_to_gcs(chunk, chunk_number, safe_file_name, BUCKET_UPLOAD_FILE, folder_name)
    else:
      if not os.path.exists(chunk_dir):
        os.mkdir(chunk_dir)
      chunk_file_path = os.path.join(chunk_dir, f"{safe_file_name}_part_{chunk_number}")
      logging.info(f'Chunk File Path: {chunk_file_path}')
      with open(chunk_file_path, "wb") as chunk_file:
        chunk_file.write(chunk.file.read())

    if int(chunk_number) == int(total_chunks):
        # If this is the last chunk, merge all chunks into a single file
        if GCS_FILE_CACHE:
            file_size = merge_file_gcs(BUCKET_UPLOAD_FILE, safe_file_name, folder_name, int(total_chunks))
        else:
            file_size = merge_chunks_local(safe_file_name, int(total_chunks), chunk_dir, merged_dir)
        logging.info("File merged successfully")
        file_extension = safe_file_name.split('.')[-1]
        obj_source_node = sourceNode()
        obj_source_node.file_name = safe_file_name.strip() if isinstance(safe_file_name, str) else safe_file_name
        obj_source_node.file_type = file_extension
        obj_source_node.file_size = file_size
        obj_source_node.file_source = 'local file'
        obj_source_node.model = model
        obj_source_node.created_at = datetime.now()
        obj_source_node.chunkNodeCount = 0
        obj_source_node.chunkRelCount = 0
        obj_source_node.entityNodeCount = 0
        obj_source_node.entityEntityRelCount = 0
        obj_source_node.communityNodeCount = 0
        obj_source_node.communityRelCount = 0
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.create_source_node(obj_source_node)
        return {'file_size': file_size, 'file_name': safe_file_name, 'file_extension': file_extension, 'message': f"Chunk {chunk_number}/{total_chunks} saved"}
    return f"Chunk {chunk_number}/{total_chunks} saved"

def get_labels_and_relationtypes(credentials):
  """
  Get distinct labels and relationship types from the graph.

  Args:
      uri (str): URI of the graph database.
      userName (str): Username for the graph database.
      password (str): Password for the graph database.
      database (str): Database name.

  Returns:
      dict: A dictionary containing a list of distinct triplets (label1-relation-label2).
  """
  excluded_labels = {'Document', 'Chunk', '_Bloom_Perspective_', '__Community__', '__Entity__', 'Session', 'Message'}
  excluded_relationships = {
       'NEXT_CHUNK', '_Bloom_Perspective_', 'FIRST_CHUNK',
       'SIMILAR', 'IN_COMMUNITY', 'PARENT_COMMUNITY', 'NEXT', 'LAST_MESSAGE'
   }
  driver = get_graphDB_driver(credentials) 
  triples = set()
  with driver.session(database=credentials.database) as session:
    result = session.run("""
           MATCH (n)-[r]->(m)
           RETURN DISTINCT labels(n) AS fromLabels, type(r) AS relType, labels(m) AS toLabels
       """)
    for record in result:
      from_labels = record["fromLabels"]
      to_labels = record["toLabels"]
      rel_type = record["relType"]
      from_label = next((lbl for lbl in from_labels if lbl not in excluded_labels), None)
      to_label = next((lbl for lbl in to_labels if lbl not in excluded_labels), None)
      if not from_label or not to_label:
          continue
      if rel_type == 'PART_OF':
          if from_label == 'Chunk' and to_label == 'Document':
              continue 
      elif rel_type == 'HAS_ENTITY':
          if from_label == 'Chunk':
              continue 
      elif (
          from_label in excluded_labels or
          to_label in excluded_labels or
          rel_type in excluded_relationships
      ):
          continue
      triples.add(f"{from_label}-{rel_type}->{to_label}")
  return {"triplets": list(triples)}

def manually_cancelled_job(graph, filenames, source_types, merged_dir, uri):
  
  filename_list= list(map(str.strip, json.loads(filenames)))
  source_types_list= list(map(str.strip, json.loads(source_types)))
  
  for (file_name,source_type) in zip(filename_list, source_types_list):
      obj_source_node = sourceNode()
      obj_source_node.file_name = file_name.strip() if isinstance(file_name, str) else file_name
      obj_source_node.is_cancelled = True
      obj_source_node.status = 'Cancelled'
      obj_source_node.updated_at = datetime.now()
      graphDb_data_Access = graphDBdataAccess(graph)
      graphDb_data_Access.update_source_node(obj_source_node)
      #Update the nodeCount and relCount properties in Document node
      graphDb_data_Access.update_node_relationship_count(file_name)
      obj_source_node = None
  return "Cancelled the processing job successfully"

def populate_graph_schema_from_text(text, model, is_schema_description_checked, is_local_storage):
  """_summary_

  Args:
      graph (Neo4Graph): Neo4jGraph connection object
      input_text (str): rendom text from PDF or user input.
      model (str): AI model to use extraction from text

  Returns:
      data (list): list of lebels and relationTypes
  """
  result = schema_extraction_from_text(text, model, is_schema_description_checked, is_local_storage)
  return result

def set_status_retry(graph, file_name, retry_condition):
    """
    Set the status of a file processing job to 'Ready to Reprocess' in the graph.

    Args:
        graph: Neo4j graph connection.
        file_name (str): Name of the file.
        retry_condition (str): Condition for retrying the job.

    Returns:
        None
    """
    graphDb_data_Access = graphDBdataAccess(graph)
    obj_source_node = sourceNode()
    status = "Ready to Reprocess"
    obj_source_node.file_name = file_name.strip() if isinstance(file_name, str) else file_name
    obj_source_node.status = status
    obj_source_node.retry_condition = retry_condition
    obj_source_node.is_cancelled = False
    if retry_condition == DELETE_ENTITIES_AND_START_FROM_BEGINNING or retry_condition == START_FROM_BEGINNING:
        obj_source_node.processed_chunk=0
        obj_source_node.node_count=0
        obj_source_node.relationship_count=0
        obj_source_node.chunkNodeCount=0
        obj_source_node.chunkRelCount=0
        obj_source_node.communityNodeCount=0
        obj_source_node.communityRelCount=0
        obj_source_node.entityEntityRelCount=0
        obj_source_node.entityNodeCount=0
        obj_source_node.processing_time=0
        obj_source_node.total_chunks=0
        obj_source_node.token_usage=0
    if retry_condition == DELETE_ENTITIES_AND_START_FROM_BEGINNING:
        execute_graph_query(graph,QUERY_TO_DELETE_EXISTING_ENTITIES, params={"filename":file_name})
        
    logging.info(obj_source_node)
    graphDb_data_Access.update_source_node(obj_source_node)

def failed_file_process(uri,file_name, merged_file_path):
  """
  Handle the processing of a failed file by moving it to a failed directory.

  Args:
      uri (str): The URI of the Neo4j database.
      file_name (str): The name of the file that failed to process.
      merged_file_path (str): The path of the merged file.

  Returns:
      None
  """
  if GCS_FILE_CACHE:
      folder_name = create_gcs_bucket_folder_name_hashed(uri,file_name)
      copy_failed_file(BUCKET_UPLOAD_FILE, BUCKET_FAILED_FILE, folder_name, file_name)
      time.sleep(5)
      delete_file_from_gcs(BUCKET_UPLOAD_FILE,folder_name,file_name)
  else:
      logging.info(f'Deleted File Path: {merged_file_path} and Deleted File Name : {file_name}')
      delete_uploaded_local_file(merged_file_path,file_name)