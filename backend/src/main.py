from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from dotenv import load_dotenv
from datetime import datetime
import logging
import traceback
from langchain.text_splitter import TokenTextSplitter
from tqdm import tqdm
from src.diffbot_transformer import extract_graph_from_diffbot
from src.openAI_llm import extract_graph_from_OpenAI
from typing import List
from langchain.document_loaders import S3DirectoryLoader
import boto3
from urllib.parse import urlparse
import os
load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')
from langchain.document_loaders import S3FileLoader
# url =os.environ.get('NEO4J_URI')
# username = os.environ.get('NEO4J_USERNAME')
# password = os.environ.get('NEO4J_PASSWORD')
graph = Neo4jGraph()

def create_source_node_graph(uri, userName, password, file):
  """
   Creates a source node in Neo4jGraph and sets properties.
   
   Args:
   	 uri: URI of Graph Service to connect to
   	 userName: Username to connect to Graph Service with ( default : None )
   	 password: Password to connect to Graph Service with ( default : None )
   	 file: File object with information about file to be added
   
   Returns: 
   	 Success or Failure message of node creation
  """
  try:
    job_status = "New"
    file_type = file.filename.split('.')[1]
    file_size = file.size
    file_name = file.filename

    graph = Neo4jGraph(url=uri, username=userName, password=password)

    source_node = "fileName: '{}'"
    update_node_prop = "SET s.fileSize = '{}', s.fileType = '{}' ,s.status = '{}'"
    logging.info("create source node as file name if not exist")
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(file_size,file_type,job_status))
    return create_api_response("Success",data="Source Node created succesfully")
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}"'
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
    logging.exception(f'Exception Stack trace:')
    return create_api_response(job_status,error=error_message)


def get_s3_files_info(s3_url):
    # Extract bucket name and directory from the S3 URL
    parsed_url = urlparse(s3_url)
    bucket_name = parsed_url.netloc
    directory = parsed_url.path.lstrip('/')

    # Connect to S3
    s3 = boto3.client('s3')

    # List objects in the specified directory
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=directory)
#     print(response)
    files_info = []

    # Check each object for file size and type
    for obj in response.get('Contents', []):
        file_key = obj['Key']
        # file_name = os.path.basename(file_key)
        file_name=s3_url
        file_size = obj['Size']

        # Check if file is a PDF
#         if file_name.endswith('.pdf'):
        files_info.append({'file_name': file_name, 'file_size_bytes': file_size})

    return files_info
 
  
def create_source_node_graph_s3(uri, userName, password, s3_url_dir):
    """
      Creates a source node in Neo4jGraph and sets properties.
      
      Args:
        uri: URI of Graph Service to connect to
        userName: Username to connect to Graph Service with ( default : None )
        password: Password to connect to Graph Service with ( default : None )
        s3_url: s3 url for the bucket to fetch pdf files from
      
      Returns: 
        Success or Failure message of node creation
    """

    job_status = "New"
    # file_type = file.filename.split('.')[1]
    # file_size = file.size
    # file_name = file.filename
    file_type='pdf'

    graph = Neo4jGraph(url=uri, username=userName, password=password)

    files_info = get_s3_files_info(s3_url_dir)
    
    for file_info in files_info:
        file_name=file_info['file_name'] 
        file_size=file_info['file_size_bytes']
        s3_file_path=str(s3_url_dir+file_name)
        try:
          source_node = "fileName: '{}'"
          update_node_prop = "SET s.fileSize = '{}', s.fileType = '{}' ,s.status = '{}',s.s3url='{}'"
          logging.info("create source node as file name if not exist")
          graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(file_size,file_type,job_status,s3_file_path))
          return create_api_response("Success",data="Source Node created succesfully")
        except Exception as e:
          job_status = "Failure"
          error_message = str(e)
          update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}"'
          graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
          logging.exception(f'Exception Stack trace:')
          return create_api_response(job_status,error=error_message)  
    
def file_into_chunks(pages: List[Document]):
    """
     Split a list of documents(file pages) into chunks of fixed size.
     
     Args:
     	 pages: A list of pages to split. Each page is a list of text strings.
     
     Returns: 
     	 A list of chunks each of which is a langchain Document.
    """
    text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
    chunks = text_splitter.split_documents(pages)
    return chunks

def extract_graph_from_file(uri, userName, password, model, isEmbedding=False, isChunk_relationship_entity = False, file=None,s3_url=None):
  """
   Extracts a Neo4jGraph from a PDF file based on the model.
   
   Args:
   	 uri: URI of the graph to extract
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
    graph = Neo4jGraph(url=uri, username=userName, password=password)
    
    if file!=None:
      file_name = file.filename
      source_node = "fileName: '{}'"
      update_node_prop = "SET s.createdAt ='{}', s.updatedAt = '{}', s.processingTime = '{}',s.status = '{}', s.errorMessage = '{}',s.nodeCount= {}, s.relationshipCount = {}, s.model = '{}'"
      metadata = {"source": "local","filename": file.filename, "filesize":file.size }

      with open('temp.pdf','wb') as f:
        f.write(file.file.read())
      loader = PyPDFLoader('temp.pdf')
      
    elif s3_url!=None:
      file_name=str(s3_url)
      print(file_name)
      bucket=file_name.split('/')[2]
      file_key=file_name.split('/')[-1]
      source_node = "fileName: '{}'"
      update_node_prop = "SET s.createdAt ='{}', s.updatedAt = '{}', s.processingTime = '{}',s.status = '{}', s.errorMessage = '{}',s.nodeCount= {}, s.relationshipCount = {}, s.model = '{}'"
      s3=boto3.client('s3')
      response=s3.head_object(Bucket=bucket,Key=file_key)
      file_size=response['ContentLength']
      
      metadata = {"source": "local","filename": file_name, "filesize":file_size }
      print(bucket)
      print(file_key)
      print(file_size)
      loader = S3FileLoader(bucket,file_key)
      # loader = S3DirectoryLoader(
      #   os.environ.get('BUCKET'), 
      #   aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"), 
      #   aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"), 
      # )
      # documents = loader.load()
      print(loader.load())
    pages = loader.load_and_split()
    print(pages)
    bad_chars = ['"', "\n", "'"]
    logging.info("Creates a new Document object for each page in the list of pages")
    for i in range(0,len(pages)):
      text = pages[i].page_content
      for j in bad_chars:
        if j == '\n':
          text = text.replace(j, ' ')
        else:
          text = text.replace(j, '')
      pages[i]=Document(page_content=str(text), metadata=metadata)
    logging.info("Break down file into chunks")
    chunks = file_into_chunks(pages)
    
    logging.info("Get graph document list from models")
    if model == 'Diffbot' :
      graph_documents = extract_graph_from_diffbot(graph,chunks,file_name,isEmbedding)
      
    elif model == 'OpenAI GPT 3.5':
      model_version = 'gpt-3.5-turbo-16k'
      graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,isEmbedding)
       
    elif model == 'OpenAI GPT 4':
      model_version = 'gpt-4-0125-preview' 
      graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,isEmbedding)
        
    distinct_nodes = set()
    relations = []
    
    for graph_document in graph_documents:
      logging.info("get distinct nodes")
      for node in graph_document.nodes:
            distinct_nodes.add(node.id)
      logging.info("get all relations")
      for relation in graph_document.relationships:
            relations.append(relation.type)
      
    nodes_created = len(distinct_nodes)
    relationships_created = len(relations)  
    
    end_time = datetime.now()
    processed_time = end_time - start_time
    job_status = "Completed"
    error_message =""
    logging.info("Update source node properties")
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(start_time,end_time,round(processed_time.total_seconds(),2),job_status,error_message,nodes_created,relationships_created,model))

    output = {
        "fileName": file_name,
        "nodeCount": nodes_created,
        "relationshipCount": relationships_created,
        "processingTime": round(processed_time.total_seconds(),2),
        "status" : job_status,
        "model" : model
    }
    
    return create_api_response("Success",data=output)
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}"'
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
    logging.exception(f'Exception Stack trace:')
    return create_api_response(job_status,error=error_message)


def get_source_list_from_graph():
  """
   Returns a list of sources that are in the database by querying the graph and
   sorting the list by the last updated date. 
 """
  try:
    query = "MATCH(s:Source) RETURN s ORDER BY s.updatedAt DESC;"
    result = graph.query(query)
    list_of_json_objects = [entry['s'] for entry in result]
    return create_api_response("Success",data=list_of_json_objects)
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    logging.exception('Exception')
    return create_api_response(job_status,error=error_message)


def create_api_response(status, data=None, error=None):
  """
   Create a response to be sent to the API. This is a helper function to create a JSON response that can be sent to the API.
   
   Args:
   	 status: The status of the API call. Should be one of the constants in this module.
   	 data: The data that was returned by the API call.
   	 error: The error that was returned by the API call.
   
   Returns: 
   	 A dictionary containing the status data and error if any
  """
  response = {"status": status}

  # Set the data of the response
  if data is not None:
    response["data"] = data

  # Set the error message to the response.
  if error is not None:
    response["error"] = error

  return response