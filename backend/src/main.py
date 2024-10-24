from langchain_community.graphs import Neo4jGraph
from src.shared.constants import (BUCKET_UPLOAD, PROJECT_ID, QUERY_TO_GET_CHUNKS, 
                                  QUERY_TO_DELETE_EXISTING_ENTITIES, 
                                  QUERY_TO_GET_LAST_PROCESSED_CHUNK_POSITION,
                                  QUERY_TO_GET_LAST_PROCESSED_CHUNK_WITHOUT_ENTITY,
                                  START_FROM_BEGINNING,
                                  START_FROM_LAST_PROCESSED_POSITION,
                                  DELETE_ENTITIES_AND_START_FROM_BEGINNING,
                                  QUERY_TO_GET_NODES_AND_RELATIONS_OF_A_DOCUMENT)
from src.shared.schema_extraction import schema_extraction_from_text
from langchain_community.document_loaders import GoogleApiClient, GoogleApiYoutubeLoader
from dotenv import load_dotenv
from datetime import datetime
import logging
from src.create_chunks import CreateChunksofDocument
from src.graphDB_dataAccess import graphDBdataAccess
from src.document_sources.local_file import get_documents_from_file_by_path
from src.entities.source_node import sourceNode
from src.llm import get_graph_from_llm
from src.document_sources.gcs_bucket import *
from src.document_sources.s3_bucket import *
from src.document_sources.wikipedia import *
from src.document_sources.youtube import *
from src.shared.common_fn import *
from src.make_relationships import *
from src.document_sources.web_pages import *
import re
from langchain_community.document_loaders import WikipediaLoader, WebBaseLoader
import warnings
from pytube import YouTube
import sys
import shutil
import urllib.parse
import json

warnings.filterwarnings("ignore")
load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def create_source_node_graph_url_s3(graph, model, source_url, aws_access_key_id, aws_secret_access_key, source_type):
    
    lst_file_name = []
    files_info = get_s3_files_info(source_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
    if len(files_info)==0:
      raise Exception('No pdf files found.')
    logging.info(f'files info : {files_info}')
    success_count=0
    failed_count=0
    
    for file_info in files_info:
        file_name=file_info['file_key'] 
        obj_source_node = sourceNode()
        obj_source_node.file_name = file_name.split('/')[-1]
        obj_source_node.file_type = 'pdf'
        obj_source_node.file_size = file_info['file_size_bytes']
        obj_source_node.file_source = source_type
        obj_source_node.model = model
        obj_source_node.url = str(source_url+file_name)
        obj_source_node.awsAccessKeyId = aws_access_key_id
        obj_source_node.created_at = datetime.now()
        try:
          graphDb_data_Access = graphDBdataAccess(graph)
          graphDb_data_Access.create_source_node(obj_source_node)
          success_count+=1
          lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success'})

        except Exception as e:
          failed_count+=1
          # error_message = str(e)
          lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Failed'})
    return lst_file_name,success_count,failed_count

def create_source_node_graph_url_gcs(graph, model, gcs_project_id, gcs_bucket_name, gcs_bucket_folder, source_type, credentials):

    success_count=0
    failed_count=0
    lst_file_name = []
    
    lst_file_metadata= get_gcs_bucket_files_info(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, credentials)
    for file_metadata in lst_file_metadata :
      obj_source_node = sourceNode()
      obj_source_node.file_name = file_metadata['fileName']
      obj_source_node.file_size = file_metadata['fileSize']
      obj_source_node.url = file_metadata['url']
      obj_source_node.file_source = source_type
      obj_source_node.model = model
      obj_source_node.file_type = 'pdf'
      obj_source_node.gcsBucket = gcs_bucket_name
      obj_source_node.gcsBucketFolder = file_metadata['gcsBucketFolder']
      obj_source_node.gcsProjectId = file_metadata['gcsProjectId']
      obj_source_node.created_at = datetime.now()
      obj_source_node.access_token = credentials.token
    
      try:
          graphDb_data_Access = graphDBdataAccess(graph)
          graphDb_data_Access.create_source_node(obj_source_node)
          success_count+=1
          lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success', 
                                'gcsBucketName': gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder, 'gcsProjectId':obj_source_node.gcsProjectId})
      except Exception as e:
        failed_count+=1
        lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Failed', 
                              'gcsBucketName': gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder, 'gcsProjectId':obj_source_node.gcsProjectId})
    return lst_file_name,success_count,failed_count

def create_source_node_graph_web_url(graph, model, source_url, source_type):
    success_count=0
    failed_count=0
    lst_file_name = []
    pages = WebBaseLoader(source_url, verify_ssl=False).load()
    if pages==None or len(pages)==0:
      failed_count+=1
      message = f"Unable to read data for given url : {source_url}"
      raise Exception(message)
    obj_source_node = sourceNode()
    obj_source_node.file_type = 'text'
    obj_source_node.file_source = source_type
    obj_source_node.model = model
    obj_source_node.url = urllib.parse.unquote(source_url)
    obj_source_node.created_at = datetime.now()
    obj_source_node.file_name = pages[0].metadata['title']
    obj_source_node.language = pages[0].metadata['language'] 
    obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
    
    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.create_source_node(obj_source_node)
    lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success'})
    success_count+=1
    return lst_file_name,success_count,failed_count
  
def create_source_node_graph_url_youtube(graph, model, source_url, source_type):
    
    youtube_url, language = check_url_source(source_type=source_type, yt_url=source_url)
    success_count=0
    failed_count=0
    lst_file_name = []
    obj_source_node = sourceNode()
    obj_source_node.file_type = 'text'
    obj_source_node.file_source = source_type
    obj_source_node.model = model
    obj_source_node.url = youtube_url
    obj_source_node.created_at = datetime.now()
    match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*',obj_source_node.url)
    logging.info(f"match value: {match}")
    # file_path = os.path.join(os.path.dirname(__file__),"llm-experiments_credentials.json")
    # logging.info(f'file path {file_path}')
    
    # if os.path.exists(file_path):
    #   logging.info("File path exist")
    #   with open(file_path,'r') as file:
    #     data = json.load(file)
    #     # logging.info(f"Project id : {data['project_id']}")
    #     # logging.info(f"Universal domain: {data['universe_domain']}")
    # else:
    #   logging.warning("credntial file path not exist")

    video_id = parse_qs(urlparse(youtube_url).query).get('v')
   
    # google_api_client = GoogleApiClient(service_account_path=Path(file_path))
    # youtube_loader_channel = GoogleApiYoutubeLoader(
    # google_api_client=google_api_client,
    # video_ids=[video_id[0].strip()], add_video_info=True
    # )
    # youtube_transcript = youtube_loader_channel.load()
    # page_content = youtube_transcript[0].page_content

    obj_source_node.file_name = match.group(1)#youtube_transcript[0].metadata["snippet"]["title"]
    #obj_source_node.file_name = YouTube(youtube_url).title
    transcript= get_youtube_combined_transcript(match.group(1))
    print(transcript)
    if transcript==None or len(transcript)==0:
      message = f"Youtube transcript is not available for : {obj_source_node.file_name}"
      raise Exception(message)
    else:  
      obj_source_node.file_size = sys.getsizeof(transcript)
    
    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.create_source_node(obj_source_node)
    lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success'})
    success_count+=1
    return lst_file_name,success_count,failed_count

def create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type):
  
    success_count=0
    failed_count=0
    lst_file_name=[]
    #queries_list =  wiki_query.split(',')
    wiki_query_id, language = check_url_source(source_type=source_type, wiki_query=wiki_query)
    logging.info(f"Creating source node for {wiki_query_id.strip()}, {language}")
    pages = WikipediaLoader(query=wiki_query_id.strip(), lang=language, load_max_docs=1, load_all_available_meta=True).load()
    if pages==None or len(pages)==0:
      failed_count+=1
      message = f"Unable to read data for given Wikipedia url : {wiki_query}"
      raise Exception(message)
    else:
      obj_source_node = sourceNode()
      obj_source_node.file_name = wiki_query_id.strip()
      obj_source_node.file_type = 'text'
      obj_source_node.file_source = source_type
      obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
      obj_source_node.model = model
      obj_source_node.url = urllib.parse.unquote(pages[0].metadata['source'])
      obj_source_node.created_at = datetime.now()
      obj_source_node.language = language
      graphDb_data_Access = graphDBdataAccess(graph)
      graphDb_data_Access.create_source_node(obj_source_node)
      success_count+=1
      lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url, 'language':obj_source_node.language, 'status':'Success'})
    return lst_file_name,success_count,failed_count
    
async def extract_graph_from_file_local_file(uri, userName, password, database, model, merged_file_path, fileName, allowedNodes, allowedRelationship, retry_condition):

  logging.info(f'Process file name :{fileName}')
  if retry_condition is None:
    gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
    if gcs_file_cache == 'True':
      folder_name = create_gcs_bucket_folder_name_hashed(uri, fileName)
      file_name, pages = get_documents_from_gcs( PROJECT_ID, BUCKET_UPLOAD, folder_name, fileName)
    else:
      file_name, pages, file_extension = get_documents_from_file_by_path(merged_file_path,fileName)
    if pages==None or len(pages)==0:
      raise Exception(f'File content is not available for file : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship, True, merged_file_path)
  else:
    return await processing_source(uri, userName, password, database, model, fileName, [], allowedNodes, allowedRelationship, True, merged_file_path, retry_condition)
  
async def extract_graph_from_file_s3(uri, userName, password, database, model, source_url, aws_access_key_id, aws_secret_access_key, file_name, allowedNodes, allowedRelationship, retry_condition):
  if retry_condition is None:
    if(aws_access_key_id==None or aws_secret_access_key==None):
      raise Exception('Please provide AWS access and secret keys')
    else:
      logging.info("Insert in S3 Block")
      file_name, pages = get_documents_from_s3(source_url, aws_access_key_id, aws_secret_access_key)

    if pages==None or len(pages)==0:
      raise Exception(f'File content is not available for file : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship)
  else:
    return await processing_source(uri, userName, password, database, model, file_name, [], allowedNodes, allowedRelationship, retry_condition=retry_condition)
  
async def extract_graph_from_web_page(uri, userName, password, database, model, source_url, file_name, allowedNodes, allowedRelationship, retry_condition):
  if retry_condition is None:
    file_name, pages = get_documents_from_web_page(source_url)

    if pages==None or len(pages)==0:
      raise Exception(f'Content is not available for given URL : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship)
  else:
    return await processing_source(uri, userName, password, database, model, file_name, [], allowedNodes, allowedRelationship, retry_condition=retry_condition)
  
async def extract_graph_from_file_youtube(uri, userName, password, database, model, source_url, file_name, allowedNodes, allowedRelationship, retry_condition):
  if retry_condition is None:
    file_name, pages = get_documents_from_youtube(source_url)

    if pages==None or len(pages)==0:
      raise Exception(f'Youtube transcript is not available for file : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship)
  else:
     return await processing_source(uri, userName, password, database, model, file_name, [], allowedNodes, allowedRelationship, retry_condition=retry_condition)
    
async def extract_graph_from_file_Wikipedia(uri, userName, password, database, model, wiki_query, language, file_name, allowedNodes, allowedRelationship, retry_condition):
  if retry_condition is None:
    file_name, pages = get_documents_from_Wikipedia(wiki_query, language)
    if pages==None or len(pages)==0:
      raise Exception(f'Wikipedia page is not available for file : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship)
  else:
    return await processing_source(uri, userName, password, database, model, file_name,[], allowedNodes, allowedRelationship, retry_condition=retry_condition)

async def extract_graph_from_file_gcs(uri, userName, password, database, model, gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, access_token, file_name, allowedNodes, allowedRelationship, retry_condition):
  if retry_condition is None:
    file_name, pages = get_documents_from_gcs(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, access_token)
    if pages==None or len(pages)==0:
      raise Exception(f'File content is not available for file : {file_name}')
    return await processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship)
  else:
    return await processing_source(uri, userName, password, database, model, file_name, [], allowedNodes, allowedRelationship, retry_condition=retry_condition)
  
async def processing_source(uri, userName, password, database, model, file_name, pages, allowedNodes, allowedRelationship, is_uploaded_from_local=None, merged_file_path=None, retry_condition=None):
  """
   Extracts a Neo4jGraph from a PDF file based on the model.
   
   Args:
   	 uri: URI of the graph to extract
     db_name : db_name is database name to connect graph db
   	 userName: Username to use for graph creation ( if None will use username from config file )
   	 password: Password to use for graph creation ( if None will use password from config file )
   	 file: File object containing the PDF file to be used
   	 model: Type of model to use ('Diffbot'or'OpenAI GPT')
   
   Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.
  """
  uri_latency = {}
  start_time = datetime.now()
  processing_source_start_time = time.time()
  start_create_connection = time.time()
  graph = create_graph_database_connection(uri, userName, password, database)
  end_create_connection = time.time()
  elapsed_create_connection = end_create_connection - start_create_connection
  logging.info(f'Time taken database connection: {elapsed_create_connection:.2f} seconds')
  uri_latency["create_connection"] = f'{elapsed_create_connection:.2f}'
  graphDb_data_Access = graphDBdataAccess(graph)

  start_get_chunkId_chunkDoc_list = time.time()
  total_chunks, chunkId_chunkDoc_list = get_chunkId_chunkDoc_list(graph, file_name, pages, retry_condition)
  end_get_chunkId_chunkDoc_list = time.time()
  elapsed_get_chunkId_chunkDoc_list = end_get_chunkId_chunkDoc_list - start_get_chunkId_chunkDoc_list
  logging.info(f'Time taken to create list chunkids with chunk document: {elapsed_get_chunkId_chunkDoc_list:.2f} seconds')
  uri_latency["create_list_chunk_and_document"] = f'{elapsed_get_chunkId_chunkDoc_list:.2f}'
  uri_latency["total_chunks"] = total_chunks

  start_status_document_node = time.time()
  result = graphDb_data_Access.get_current_status_document_node(file_name)
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
      obj_source_node.file_name = file_name
      obj_source_node.status = status
      obj_source_node.total_chunks = total_chunks
      obj_source_node.model = model
      if retry_condition == START_FROM_LAST_PROCESSED_POSITION:
          node_count = result[0]['nodeCount']
          rel_count = result[0]['relationshipCount']
          select_chunks_with_retry = result[0]['processed_chunk']
      obj_source_node.processed_chunk = 0+select_chunks_with_retry
      logging.info(file_name)
      logging.info(obj_source_node)
      
      start_update_source_node = time.time()
      graphDb_data_Access.update_source_node(obj_source_node)
      end_update_source_node = time.time()
      elapsed_update_source_node = end_update_source_node - start_update_source_node
      logging.info(f'Time taken to update the document source node: {elapsed_update_source_node:.2f} seconds')
      uri_latency["update_source_node"] = f'{elapsed_update_source_node:.2f}'

      logging.info('Update the status as Processing')
      update_graph_chunk_processed = int(os.environ.get('UPDATE_GRAPH_CHUNKS_PROCESSED'))
      # selected_chunks = []
      is_cancelled_status = False
      job_status = "Completed"
      for i in range(0, len(chunkId_chunkDoc_list), update_graph_chunk_processed):
        select_chunks_upto = i+update_graph_chunk_processed
        logging.info(f'Selected Chunks upto: {select_chunks_upto}')
        if len(chunkId_chunkDoc_list) <= select_chunks_upto:
          select_chunks_upto = len(chunkId_chunkDoc_list)
        selected_chunks = chunkId_chunkDoc_list[i:select_chunks_upto]
        
        result = graphDb_data_Access.get_current_status_document_node(file_name)
        is_cancelled_status = result[0]['is_cancelled']
        logging.info(f"Value of is_cancelled : {result[0]['is_cancelled']}")
        if bool(is_cancelled_status) == True:
          job_status = "Cancelled"
          logging.info('Exit from running loop of processing file')
          break
        else:
          processing_chunks_start_time = time.time()
          node_count,rel_count,latency_processed_chunk = await processing_chunks(selected_chunks,graph,uri, userName, password, database,file_name,model,allowedNodes,allowedRelationship,node_count, rel_count)
          processing_chunks_end_time = time.time()
          processing_chunks_elapsed_end_time = processing_chunks_end_time - processing_chunks_start_time
          logging.info(f"Time taken {update_graph_chunk_processed} chunks processed upto {select_chunks_upto} completed in {processing_chunks_elapsed_end_time:.2f} seconds for file name {file_name}")
          uri_latency[f'processed_combine_chunk_{i}-{select_chunks_upto}'] = f'{processing_chunks_elapsed_end_time:.2f}'
          uri_latency[f'processed_chunk_detail_{i}-{select_chunks_upto}'] = latency_processed_chunk
          end_time = datetime.now()
          processed_time = end_time - start_time
          
          obj_source_node = sourceNode()
          obj_source_node.file_name = file_name
          obj_source_node.updated_at = end_time
          obj_source_node.processing_time = processed_time
          obj_source_node.processed_chunk = select_chunks_upto+select_chunks_with_retry
          if retry_condition == START_FROM_BEGINNING:
            result = graph.query(QUERY_TO_GET_NODES_AND_RELATIONS_OF_A_DOCUMENT, params={"filename":file_name})
            obj_source_node.node_count = result[0]['nodes']
            obj_source_node.relationship_count = result[0]['rels']
          else:  
            obj_source_node.node_count = node_count
            obj_source_node.relationship_count = rel_count
          graphDb_data_Access.update_source_node(obj_source_node)
      
      result = graphDb_data_Access.get_current_status_document_node(file_name)
      is_cancelled_status = result[0]['is_cancelled']
      if bool(is_cancelled_status) == True:
        logging.info(f'Is_cancelled True at the end extraction')
        job_status = 'Cancelled'
      logging.info(f'Job Status at the end : {job_status}')
      end_time = datetime.now()
      processed_time = end_time - start_time
      obj_source_node = sourceNode()
      obj_source_node.file_name = file_name
      obj_source_node.status = job_status
      obj_source_node.processing_time = processed_time

      graphDb_data_Access.update_source_node(obj_source_node)
      logging.info('Updated the nodeCount and relCount properties in Document node')
      logging.info(f'file:{file_name} extraction has been completed')


      # merged_file_path have value only when file uploaded from local
      
      if is_uploaded_from_local:
        gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
        if gcs_file_cache == 'True':
          folder_name = create_gcs_bucket_folder_name_hashed(uri, file_name)
          delete_file_from_gcs(BUCKET_UPLOAD,folder_name,file_name)
        else:
          delete_uploaded_local_file(merged_file_path, file_name)  
      processing_source_func = time.time() - processing_source_start_time
      logging.info(f"Time taken to processing source function completed in {processing_source_func:.2f} seconds for file name {file_name}")  
      uri_latency["Processed_source"] = f'{processing_source_func:.2f}'
      if node_count == 0:
        uri_latency["Per_entity_latency"] = 'N/A'
      else:  
        uri_latency["Per_entity_latency"] = f'{int(processing_source_func)/node_count}/s'
      response = {}  
      response["fileName"] = file_name
      response["nodeCount"] = node_count
      response["relationshipCount"] = rel_count
      response["total_processing_time"] = round(processed_time.total_seconds(),2)
      response["status"] = job_status
      response["model"] = model
      response["success_count"] = 1
      
      return uri_latency, response
    else:
      logging.info('File does not process because it\'s already in Processing status')
  else:
    error_message = "Unable to get the status of document node."
    logging.error(error_message)
    raise Exception(error_message)

async def processing_chunks(chunkId_chunkDoc_list,graph,uri, userName, password, database,file_name,model,allowedNodes,allowedRelationship, node_count, rel_count):
  #create vector index and update chunk node with embedding
  if graph is not None:
    if graph._driver._closed:
      graph = create_graph_database_connection(uri, userName, password, database)
  else:
    graph = create_graph_database_connection(uri, userName, password, database)
  
  start_update_embedding = time.time()
  update_embedding_create_vector_index( graph, chunkId_chunkDoc_list, file_name)
  end_update_embedding = time.time()
  elapsed_update_embedding = end_update_embedding - start_update_embedding
  logging.info(f'Time taken to update embedding in chunk node: {elapsed_update_embedding:.2f} seconds')
  latency_processing_chunk = {"update_embedding" : f'{elapsed_update_embedding:.2f}'} 
  logging.info("Get graph document list from models")
  
  start_entity_extraction = time.time()
  graph_documents =  await get_graph_from_llm(model, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)
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
  
  distinct_nodes = set()
  relations = []
  for graph_document in graph_documents:
    #get distinct nodes
    for node in graph_document.nodes:
          node_id = node.id
          node_type= node.type
          if (node_id, node_type) not in distinct_nodes:
            distinct_nodes.add((node_id, node_type))
    #get all relations
    for relation in graph_document.relationships:
          relations.append(relation.type)

    node_count += len(distinct_nodes)
    rel_count += len(relations)
    print(f'node count internal func:{node_count}')
    print(f'relation count internal func:{rel_count}')
  return node_count,rel_count,latency_processing_chunk

def get_chunkId_chunkDoc_list(graph, file_name, pages, retry_condition):
  if retry_condition is None:
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
    chunks = create_chunks_obj.split_file_into_chunks()
    chunkId_chunkDoc_list = create_relation_between_chunks(graph,file_name,chunks)
    return len(chunks), chunkId_chunkDoc_list
  
  else:  
    chunkId_chunkDoc_list=[]
    chunks =  graph.query(QUERY_TO_GET_CHUNKS, params={"filename":file_name})
    
    if chunks[0]['text'] is None or chunks[0]['text']=="" :
      raise Exception(f"Chunks are not created for {file_name}. Please re-upload file and try.")    
    else:
      for chunk in chunks:
        chunk_doc = Document(page_content=chunk['text'], metadata={'id':chunk['id'], 'position':chunk['position']})
        chunkId_chunkDoc_list.append({'chunk_id': chunk['id'], 'chunk_doc': chunk_doc})
      
      if retry_condition ==  START_FROM_LAST_PROCESSED_POSITION:
        logging.info(f"Retry : start_from_last_processed_position")
        starting_chunk = graph.query(QUERY_TO_GET_LAST_PROCESSED_CHUNK_POSITION, params={"filename":file_name})
        if starting_chunk[0]["position"] < len(chunkId_chunkDoc_list):
          return len(chunks), chunkId_chunkDoc_list[starting_chunk[0]["position"] - 1:]
        
        elif starting_chunk[0]["position"] == len(chunkId_chunkDoc_list):
          starting_chunk = graph.query(QUERY_TO_GET_LAST_PROCESSED_CHUNK_WITHOUT_ENTITY, params={"filename":file_name})
          return len(chunks), chunkId_chunkDoc_list[starting_chunk[0]["position"] - 1:]
        
        else:
          raise Exception(f"All chunks of {file_name} are alreday processed. If you want to re-process, Please start from begnning")    
      
      else:
        logging.info(f"Retry : start_from_beginning with chunks {len(chunkId_chunkDoc_list)}")    
        return len(chunks), chunkId_chunkDoc_list
  
def get_source_list_from_graph(uri,userName,password,db_name=None):
  """
  Args:
    uri: URI of the graph to extract
    db_name: db_name is database name to connect to graph db
    userName: Username to use for graph creation ( if None will use username from config file )
    password: Password to use for graph creation ( if None will use password from config file )
    file: File object containing the PDF file to be used
    model: Type of model to use ('Diffbot'or'OpenAI GPT')
  Returns:
   Returns a list of sources that are in the database by querying the graph and
   sorting the list by the last updated date. 
 """
  logging.info("Get existing files list from graph")
  graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
  graph_DB_dataAccess = graphDBdataAccess(graph)
  if not graph._driver._closed:
      logging.info(f"closing connection for sources_list api")
      graph._driver.close()
  return graph_DB_dataAccess.get_source_list()

def update_graph(graph):
  """
  Update the graph node with SIMILAR relationship where embedding scrore match
  """
  graph_DB_dataAccess = graphDBdataAccess(graph)
  graph_DB_dataAccess.update_KNN_graph()

  
def connection_check_and_get_vector_dimensions(graph,database):
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
  return graph_DB_dataAccess.connection_check_and_get_vector_dimensions(database)

def merge_chunks_local(file_name, total_chunks, chunk_dir, merged_dir):

  if not os.path.exists(merged_dir):
      os.mkdir(merged_dir)
  logging.info(f'Merged File Path: {merged_dir}')
  merged_file_path = os.path.join(merged_dir, file_name)
  with open(merged_file_path, "wb") as write_stream:
      for i in range(1,total_chunks+1):
          chunk_file_path = os.path.join(chunk_dir, f"{file_name}_part_{i}")
          logging.info(f'Chunk File Path While Merging Parts:{chunk_file_path}')
          with open(chunk_file_path, "rb") as chunk_file:
              shutil.copyfileobj(chunk_file, write_stream)
          os.unlink(chunk_file_path)  # Delete the individual chunk file after merging
  logging.info("Chunks merged successfully and return file size")
  
  file_size = os.path.getsize(merged_file_path)
  return file_size
  


def upload_file(graph, model, chunk, chunk_number:int, total_chunks:int, originalname, uri, chunk_dir, merged_dir):
  
  gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
  logging.info(f'gcs file cache: {gcs_file_cache}')
  
  if gcs_file_cache == 'True':
    folder_name = create_gcs_bucket_folder_name_hashed(uri,originalname)
    upload_file_to_gcs(chunk, chunk_number, originalname, BUCKET_UPLOAD, folder_name)
  else:
    if not os.path.exists(chunk_dir):
      os.mkdir(chunk_dir)
    
    chunk_file_path = os.path.join(chunk_dir, f"{originalname}_part_{chunk_number}")
    logging.info(f'Chunk File Path: {chunk_file_path}')
    
    with open(chunk_file_path, "wb") as chunk_file:
      chunk_file.write(chunk.file.read())

  if int(chunk_number) == int(total_chunks):
      # If this is the last chunk, merge all chunks into a single file
      if gcs_file_cache == 'True':
        file_size = merge_file_gcs(BUCKET_UPLOAD, originalname, folder_name, int(total_chunks))
      else:
        file_size = merge_chunks_local(originalname, int(total_chunks), chunk_dir, merged_dir)
      
      logging.info("File merged successfully")
      file_extension = originalname.split('.')[-1]
      obj_source_node = sourceNode()
      obj_source_node.file_name = originalname
      obj_source_node.file_type = file_extension
      obj_source_node.file_size = file_size
      obj_source_node.file_source = 'local file'
      obj_source_node.model = model
      obj_source_node.created_at = datetime.now()
      graphDb_data_Access = graphDBdataAccess(graph)
        
      graphDb_data_Access.create_source_node(obj_source_node)
      return {'file_size': file_size, 'file_name': originalname, 'file_extension':file_extension, 'message':f"Chunk {chunk_number}/{total_chunks} saved"}
  return f"Chunk {chunk_number}/{total_chunks} saved"

def get_labels_and_relationtypes(graph):
  query = """
          RETURN collect { 
          CALL db.labels() yield label 
          WHERE NOT label  IN ['Chunk','_Bloom_Perspective_', '__Community__', '__Entity__'] 
          return label order by label limit 100 } as labels, 
          collect { 
          CALL db.relationshipTypes() yield relationshipType  as type 
          WHERE NOT type  IN ['PART_OF', 'NEXT_CHUNK', 'HAS_ENTITY', '_Bloom_Perspective_','FIRST_CHUNK'] 
          return type order by type LIMIT 100 } as relationshipTypes
          """
  graphDb_data_Access = graphDBdataAccess(graph)
  result = graphDb_data_Access.execute_query(query)
  if result is None:
     result=[]
  return result

def manually_cancelled_job(graph, filenames, source_types, merged_dir, uri):
  
  filename_list= list(map(str.strip, json.loads(filenames)))
  source_types_list= list(map(str.strip, json.loads(source_types)))
  gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
  
  for (file_name,source_type) in zip(filename_list, source_types_list):
      obj_source_node = sourceNode()
      obj_source_node.file_name = file_name
      obj_source_node.is_cancelled = True
      obj_source_node.status = 'Cancelled'
      obj_source_node.updated_at = datetime.now()
      graphDb_data_Access = graphDBdataAccess(graph)
      graphDb_data_Access.update_source_node(obj_source_node)
      obj_source_node = None
      merged_file_path = os.path.join(merged_dir, file_name)
      if source_type == 'local file' and gcs_file_cache == 'True':
          folder_name = create_gcs_bucket_folder_name_hashed(uri, file_name)
          delete_file_from_gcs(BUCKET_UPLOAD,folder_name,file_name)
      else:
        logging.info(f'Deleted File Path: {merged_file_path} and Deleted File Name : {file_name}')
        delete_uploaded_local_file(merged_file_path,file_name)
  return "Cancelled the processing job successfully"

def populate_graph_schema_from_text(text, model, is_schema_description_cheked):
  """_summary_

  Args:
      graph (Neo4Graph): Neo4jGraph connection object
      input_text (str): rendom text from PDF or user input.
      model (str): AI model to use extraction from text

  Returns:
      data (list): list of lebels and relationTypes
  """
  result = schema_extraction_from_text(text, model, is_schema_description_cheked)
  return {"labels": result.labels, "relationshipTypes": result.relationshipTypes}

def set_status_retry(graph, file_name, retry_condition):
    graphDb_data_Access = graphDBdataAccess(graph)
    obj_source_node = sourceNode()
    status = "Reprocess"
    obj_source_node.file_name = file_name
    obj_source_node.status = status
    obj_source_node.retry_condition = retry_condition
    obj_source_node.is_cancelled = False
    if retry_condition == DELETE_ENTITIES_AND_START_FROM_BEGINNING or retry_condition == START_FROM_BEGINNING:
        obj_source_node.processed_chunk=0
    if retry_condition == DELETE_ENTITIES_AND_START_FROM_BEGINNING:
        graph.query(QUERY_TO_DELETE_EXISTING_ENTITIES, params={"filename":file_name})
        obj_source_node.node_count=0
        obj_source_node.relationship_count=0
    logging.info(obj_source_node)
    graphDb_data_Access.update_source_node(obj_source_node)
