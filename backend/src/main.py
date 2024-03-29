from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from dotenv import load_dotenv
from datetime import datetime
import logging
from langchain_text_splitters import TokenTextSplitter
from tqdm import tqdm
from src.diffbot_transformer import extract_graph_from_diffbot
from src.openAI_llm import extract_graph_from_OpenAI
from src.create_chunks import CreateChunksofDocument
from src.graphDB_dataAccess import graphDBdataAccess
from src.api_response import create_api_response
from src.document_sources.local_file import get_documents_from_file
from src.entities.source_node import sourceNode
from src.generate_graphDocuments_from_llm import generate_graphDocuments
from src.document_sources.gcs_bucket import *
from src.document_sources.s3_bucket import *
from src.document_sources.wikipedia import *
from src.document_sources.youtube import *
from src.shared.common_fn import check_url_source
from src.make_relationships import *
from typing import List
from langchain_community.document_loaders import S3DirectoryLoader
import boto3
from urllib.parse import urlparse,parse_qs
import os
from tempfile import NamedTemporaryFile
import re
from langchain_community.document_loaders import YoutubeLoader
from langchain_community.document_loaders import WikipediaLoader
import warnings
from pytube import YouTube
from youtube_transcript_api import YouTubeTranscriptApi 
import sys
from google.cloud import storage
from google.oauth2 import service_account
import google.auth 
from langchain_community.document_loaders import GCSFileLoader
warnings.filterwarnings("ignore")
import json
load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def create_source_node_graph_local_file(uri, userName, password, file, model, db_name=None):
  """
   Creates a source node in Neo4jGraph and sets properties.
   
   Args:
   	 uri: URI of Graph Service to connect to
     db_name: database name to connect
   	 userName: Username to connect to Graph Service with ( default : None )
   	 password: Password to connect to Graph Service with ( default : None )
   	 file: File object with information about file to be added
   
   Returns: 
   	 Success or Failed message of node creation
  """
  try:
    obj_source_node = sourceNode()
    obj_source_node.file_name = file.filename
    obj_source_node.file_type = file.filename.split('.')[1]
    obj_source_node.file_size = file.size
    obj_source_node.file_source = 'local file'
    obj_source_node.model = model
    obj_source_node.created_at = datetime.now()
    graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
    graphDb_data_Access = graphDBdataAccess(graph)
     
    graphDb_data_Access.create_source_node(obj_source_node)
    return create_api_response("Success",message="Source Node created successfully",file_source=obj_source_node.file_source, file_name=obj_source_node.file_name)
  except Exception as e:
    job_status = "Failed"
    message = "Unable to create source node"
    error_message = str(e)
    logging.error(f"Error in creating document node: {error_message}")
    return create_api_response(job_status, message=message,error=error_message,file_source=obj_source_node.source,file_name=obj_source_node.file_name)
  
def create_source_node_graph_url(uri, userName, password ,model, source_url=None, db_name=None,wiki_query:List[str]=None,aws_access_key_id=None,aws_secret_access_key=None, gcs_bucket_name=None, gcs_bucket_folder=None):
    """
      Creates a source node in Neo4jGraph and sets properties.
      
      Args:
        uri: URI of Graph Service to connect to
        db_name: db_name is database name to connect to graph db
        userName: Username to connect to Graph Service with ( default : None )
        password: Password to connect to Graph Service with ( default : None )
        s3_url: s3 url for the bucket to fetch pdf files from
        aws_access_key_id: Aws access key id credentials (default : None)
        aws_secret_access_key: Aws secret access key credentials (default : None)
      Returns: 
        Success or Failed message of node creation
    """
    try:
        file_name =''
        graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
        if source_url:
          source_type,youtube_url = check_url_source(source_url)
          logging.info(f"source type URL:{source_type}")
          if source_type == "s3 bucket":
              lst_s3_file_name = []
              files_info = get_s3_files_info(source_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
              if isinstance(files_info,dict):
                return files_info
              elif len(files_info)==0:
                return create_api_response('Failed',success_count=0,Failed_count=0,message='No pdf files found.')  
              logging.info(f'files info : {files_info}')
              err_flag=0
              success_count=0
              Failed_count=0
              
              for file_info in files_info:
                  obj_source_node = sourceNode()
                  obj_source_node.file_name = file_info['file_key'].split('/')[-1]
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
                    lst_s3_file_name.append({'fileName':file_name.split('/')[-1],'fileSize':file_size,'url':s3_file_path})

                  except Exception as e:
                    err_flag=1
                    Failed_count+=1
                    error_message = str(e)
              if err_flag==1:
                job_status = "Failed"
                message="Unable to create source node for s3 bucket files"
                return create_api_response(job_status,message=message,error=error_message,success_count=success_count,Failed_count=Failed_count,file_source='s3 bucket',file_name=lst_s3_file_name)  
              return create_api_response("Success",message="Source Node created successfully",success_count=success_count,Failed_count=Failed_count,file_source='s3 bucket',file_name=lst_s3_file_name)
          elif source_type == 'youtube':
              obj_source_node = sourceNode()
              obj_source_node.file_type = 'text'
              obj_source_node.file_source = source_type
              obj_source_node.model = model
              obj_source_node.url = youtube_url
              obj_source_node.created_at = datetime.now()
              # source_url= youtube_url
              match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*',obj_source_node.url)
              logging.info(f"match value{match}")
              obj_source_node.file_name = YouTube(obj_source_node.url).title
              transcript= get_youtube_transcript(match.group(1))
              if transcript==None or len(transcript)==0:
                file_size = 0
                job_status = "Failed"
                message = f"Youtube transcript is not available for : {file_name}"
                error_message = str(e)
                logging.exception(f'Exception Stack trace:')
                return create_api_response(job_status,message=message,error=error_message,file_source=source_type,file_name=file_name )
              else:  
                obj_source_node.file_size = sys.getsizeof(transcript)
            
              graphDb_data_Access = graphDBdataAccess(graph)
              graphDb_data_Access.create_source_node(obj_source_node)
              return create_api_response(job_status,file_name=[{'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url}])
          
        elif wiki_query:
           success_count=0
           Failed_count=0
           lst_file_metadata=[]
           queries =  wiki_query.split(',')
           for query in queries:
              logging.info(f"Creating source node for {query.strip()}")
              pages = WikipediaLoader(query=query.strip(), load_max_docs=1, load_all_available_meta=True).load()
              obj_source_node = sourceNode()
              obj_source_node.file_name = query.strip()
              obj_source_node.file_type = 'text'
              obj_source_node.file_source = 'Wikipedia'
              obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
              obj_source_node.model = model
              obj_source_node.url = pages[0].metadata['source']
              obj_source_node.created_at = datetime.now()
              obj_source_node.status = 'New'
              try:
                graphDb_data_Access = graphDBdataAccess(graph)
                graphDb_data_Access.create_source_node(obj_source_node)
                success_count+=1
                lst_file_metadata.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url})
              except Exception as e:
                job_status = "Failed"
                Failed_count+=1
                error_message = str(e) 
                return create_api_response(job_status,message="Unable to create source node for Wikipedia source",file_name=lst_file_metadata, success_count=success_count, Failed_count=Failed_count) 
           return create_api_response(job_status,message="Source Node created successfully",file_name=lst_file_metadata, success_count=success_count, Failed_count=Failed_count)   
        
        elif gcs_bucket_name:
          success_count=0
          Failed_count=0
          file_type='pdf'
          source_type='gcs bucket'
          aws_access_key_id=''
          job_status = 'Completed'
          try:
              lst_file_metadata= get_gcs_bucket_files_info(gcs_bucket_name, gcs_bucket_folder)
              for file_metadata in lst_file_metadata :
                obj_source_node = sourceNode()
                obj_source_node.file_name = file_metadata['fileName']
                obj_source_node.file_size = file_metadata['fileSize']
                obj_source_node.url = file_metadata['url']
                obj_source_node.gcs_bucket = file_metadata['gcsBucket']
                obj_source_node.gcs_bucket_folder = file_metadata['gcsBucketFolder']
                obj_source_node.created_at = datetime.now()

                graphDb_data_Access = graphDBdataAccess(graph)
                graphDb_data_Access.create_source_node(obj_source_node)
                success_count+=1
          except Exception as e:
              file_name = file_metadata['fileName']
              job_status = "Failed"
              Failed_count+=1
              error_message = str(e) 
              return create_api_response(job_status,message=f"Unable to create source node for GCS Bucket file = {file_name}",file_name=lst_file_metadata, success_count=success_count, Failed_count=Failed_count) 
          return create_api_response(job_status,message="Source Node created successfully",file_name=lst_file_metadata, success_count=success_count, Failed_count=Failed_count)   
        
          
        else:
           job_status = "Failed"
           return create_api_response(job_status,message='Invalid URL')
    except Exception as e:
        job_status = "Failed"
        message = "Unable to create source node with given url"
        error_message = str(e)
        logging.exception(f'Exception Stack trace:')
        return create_api_response(job_status,message=message,error=error_message,file_source=source_type, file_name=file_name)  


def extract_graph_from_file(uri, userName, password, model, db_name=None, file=None,source_url=None,aws_access_key_id=None,aws_secret_access_key=None,wiki_query=None,max_sources=None, gcs_bucket_name=None, gcs_bucket_folder=None, gcs_blob_filename=None):
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
  try:
    start_time = datetime.now()
    file_name = ''
    graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
    graphDb_data_Access = graphDBdataAccess(graph)
    if  source_url is not None:
      source_type, youtube_url = check_url_source(source_url)
      
    if file!=None:
      file_name, file_key, pages = get_documents_from_file(file)
      
    elif wiki_query:  
        file_name, file_key, pages = get_documents_from_Wikipedia(wiki_query)
    
    elif gcs_bucket_name and gcs_blob_filename:
       file_name, file_key, pages = get_documents_from_gcs(gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename)
      
    elif source_type =='s3 bucket':
      if(aws_access_key_id==None or aws_secret_access_key==None):
        job_status = "Failed"
        return create_api_response(job_status,message='Please provide AWS access and secret keys')
      else:
        logging.info("Insert in S3 Block")
        file_name, file_key, pages = get_documents_from_s3(source_url, aws_access_key_id, aws_secret_access_key)
        logging.info(f"filename {file_name} file_key: {file_key} pages:{pages}  ")
    elif source_type =='youtube':
        file_name, file_key, pages = get_documents_from_youtube(source_url)
    
    else:
        job_status = "Failed"
        return create_api_response(job_status,message='Invalid url to create graph')
        
    if pages==None or len(pages)==0:
        job_status = "Failed"
        message = 'Pdf content or Youtube transcript is not available'
        logging.error(f"Pdf content or Youtube transcript is not available")
        graphDb_data_Access.update_exception_db(file_name,message)
        return create_api_response(job_status,message=message,file_name=file_name)
        
    # update_node_prop = "SET d.createdAt ='{}', d.updatedAt = '{}', d.processingTime = '{}',d.status = '{}', d.errorMessage = '{}',d.nodeCount= {}, d.relationshipCount = {}, d.model = '{}'"
    # pages = loader.load_and_split()
    full_document_content = ""
    bad_chars = ['"', "\n", "'"]
    for i in range(0,len(pages)):
      text = pages[i].page_content
      for j in bad_chars:
        if j == '\n':
          text = text.replace(j, ' ')
        else:
          text = text.replace(j, '')
      pages[i]=Document(page_content=str(text))
      full_document_content += text
    logging.info("Break down file into chunks")
    #chunks = file_into_chunks(pages)
    
    create_chunks_obj = CreateChunksofDocument(full_document_content, graph, file_name)
    lst_chunks = create_chunks_obj.split_file_into_chunks()
    logging.info("Get graph document list from models")
    
    chunks=[]
    for chunk in lst_chunks:
      chunks.append(chunk['chunk_doc'])
    graph_documents =  generate_graphDocuments(model, graph, chunks) 

    merge_relationship_between_chunk_and_entites(graph,graph_document,lst_chunks[0].chunk_id)
    
    #create embedding and update chunk node with embedding
    merge_chunk_embedding( graph, lst_chunks[0].chunk_id, lst_chunks[0].chunk_doc)
    # if model == 'Diffbot' :
    #   graph_documents, cypher_list = extract_graph_from_diffbot(graph,chunks,file_name,uri,userName,password)
      
    # elif model == 'OpenAI GPT 3.5':
    #   model_version = 'gpt-3.5-turbo-16k'
    #   graph_documents, cypher_list = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,uri,userName,password)
      
    # elif model == 'OpenAI GPT 4':
    #   model_version = 'gpt-4-0125-preview' 
    #   graph_documents, cypher_list = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,uri,userName,password)
              
    #create relation between chunks (FIRST_CHUNK and NEXT_CHUNK)
    # for query in cypher_list:
    #    graph.query(query)

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
      
    nodes_created = len(distinct_nodes)
    relationships_created = len(relations)  
    
    end_time = datetime.now()
    processed_time = end_time - start_time
    job_status = "Completed"
    error_message =""

    obj_source_node = sourceNode()
    obj_source_node.file_name = file_key.split('/')[-1]
    obj_source_node.status = job_status
    obj_source_node.created_at = start_time
    obj_source_node.updated_at = end_time
    obj_source_node.model = model
    obj_source_node.processing_time = processed_time
    obj_source_node.node_count = nodes_created
    obj_source_node.relationship_count = relationships_created

    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.update_source_node(obj_source_node)

    output = {
        "fileName": file_name,
        "nodeCount": nodes_created,
        "relationshipCount": relationships_created,
        "processingTime": round(processed_time.total_seconds(),2),
        "status" : job_status,
        "model" : model
    }
    logging.info(f'Response from extract API : {output}')
    return create_api_response("Success",data=output)
      
  except Exception as e:
      job_status = "Failed"
      message="Failed To Process File or OpenAI Unable To Parse Content"
      error_message = str(e)
      logging.error(f"file failed in process: {file_name}")
      graphDb_data_Access.update_exception_db(graph,file_name,error_message)
      logging.exception(f'Exception Stack trace: {error_message}')
      return create_api_response(job_status,message=message,error=error_message,file_name=file_name)
 


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
  try:
    graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
    graph_DB_dataAccess = graphDBdataAccess(graph)
    list_of_json_objects = graph_DB_dataAccess.get_source_list()
    return create_api_response("Success",data=list_of_json_objects)
  except Exception as e:
    job_status = "Failed"
    message="Unable to fetch source list"
    error_message = str(e)
    logging.exception(f'Exception:{error_message}')
    return create_api_response(job_status,message=message,error=error_message)

def update_graph(uri,userName,password,db_name):
  """
  Update the graph node with SIMILAR relationship where embedding scrore match
  """
  try:
    graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
    graph_DB_dataAccess = graphDBdataAccess(graph)
    result = graph_DB_dataAccess.update_KNN_graph()
    logging.info(f"result : {result}")
  except Exception as e:
    error_message = str(e)
    logging.exception(f'Exception in update KNN graph:{error_message}')
    raise Exception(error_message)
  
def connection_check(uri,userName,password,db_name):
  """
  Args:
    uri: URI of the graph to extract
    userName: Username to use for graph creation ( if None will use username from config file )
    password: Password to use for graph creation ( if None will use password from config file )
    db_name: db_name is database name to connect to graph db
  Returns:
   Returns a status of connection from NEO4j is success or failure
 """
  graph = Neo4jGraph(url=uri, database=db_name, username=userName, password=password)
  graph_DB_dataAccess = graphDBdataAccess(graph)
  return graph_DB_dataAccess.connection_check()