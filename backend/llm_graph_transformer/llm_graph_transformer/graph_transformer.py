from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
import logging
import traceback
from tqdm import tqdm
from .diffbot_transformer import extract_graph_from_diffbot
from .openAI_llm import extract_graph_from_OpenAI
from langchain.document_loaders import S3DirectoryLoader
import boto3
from urllib.parse import urlparse
import os
from tempfile import NamedTemporaryFile

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')
from .utilities import *

def create_source_node_graph(uri, userName, password, file):
  """
   Creates a source node in Neo4jGraph and sets properties.
   
   Args:
   	 uri: URI of Graph Service to connect to
   	 userName: Username to connect to Graph Service with ( default : None )
   	 password: Password to connect to Graph Service with ( default : None )
   	 file: File object with information about file to be added
   
   Returns: 
   	 Success or Failed message of node creation
  """
  try:
    job_status = "New"
    if not isinstance(file,str):
      file_type = file.filename.split('.')[1]
      file_size = file.size
      file_name = file.filename
    else:
      file_name = file.split('/')[-1]
      file_type = file_name.split('.')[1]
      file_size=os.path.getsize(file)
    graph = Neo4jGraph(url=uri, username=userName, password=password)
    try:
      source_node = "fileName: '{}'"
      update_node_prop = "SET s.fileSize = '{}', s.fileType = '{}' ,s.status = '{}',s.fileSource='{}'"
      logging.info("create source node as file name if not exist")
      graph.query('MERGE(s:Source {'+source_node.format(file_name.split('/')[-1])+'}) '+update_node_prop.format(file_size,file_type,job_status,'local file'))
      return create_api_response("Success",data="Source Node created successfully",file_source='local file')
      
    except Exception as e:
      job_status = "Failed"
      error_message = str(e)
      update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}",s.fileSource="{}"'
      graph.query('MERGE(s:Source {'+source_node.format(file_name.split('/')[-1])+'}) '+update_node_prop.format(job_status,error_message,'local file'))
      logging.exception(f'Exception Stack trace:')
      return create_api_response(job_status,error=error_message,file_source='local file')
  except Exception as e:
      job_status = "Failed"
      error_message = str(e)
      return create_api_response(job_status,error=error_message,file_source='local file')

  
  
def create_source_node_graph_s3(uri, userName, password, s3_url_dir,aws_access_key_id=None,aws_secret_access_key=None):
    """
      Creates a source node in Neo4jGraph and sets properties.
      
      Args:
        uri: URI of Graph Service to connect to
        userName: Username to connect to Graph Service with ( default : None )
        password: Password to connect to Graph Service with ( default : None )
        s3_url: s3 url for the bucket to fetch pdf files from
        aws_access_key_id: Aws access key id credentials (default : None)
        aws_secret_access_key: Aws secret access key credentials (default : None)
      Returns: 
        Success or Failed message of node creation
    """
    try:
        
        graph = Neo4jGraph(url=uri, username=userName, password=password)
        files_info = get_s3_files_info(s3_url_dir,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
        if isinstance(files_info,dict):
           return files_info
        elif len(files_info)==0:
          return create_api_response('Failed',success_count=0,Failed_count=0,message='No pdf files found.')  
        logging.info(f'files info : {files_info}')
        err_flag=0
        success_count=0
        Failed_count=0
        file_type='pdf'
        for file_info in files_info:
            job_status = "New"
            file_name=file_info['file_key'] 
            file_size=file_info['file_size_bytes']
            s3_file_path=str(s3_url_dir+file_name)
            try:
              source_node = "fileName: '{}'"
              update_node_prop = "SET s.fileSize = '{}', s.fileType = '{}' ,s.status = '{}',s.s3url='{}',s.awsAccessKeyId='{}',s.fileSource='{}'"
              logging.info("create source node as file name if not exist")
              graph.query('MERGE(s:Source {'+source_node.format(file_name.split('/')[-1])+'}) '+update_node_prop.format(file_size,file_type,job_status,s3_file_path,aws_access_key_id,'s3 bucket'))
              success_count+=1
            except Exception as e:
              err_flag=1
              Failed_count+=1
              job_status='Failed'
              error_message = str(e)
              update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}",s.fileSource="{}"'
              graph.query('MERGE(s:Source {'+source_node.format(file_name.split('/')[-1])+'}) '+update_node_prop.format(job_status,error_message,'s3 bucket'))
              logging.exception(f'Exception Stack trace:')
        if err_flag==1:
          job_status = "Failed"
          return create_api_response(job_status,error=error_message,success_count=success_count,Failed_count=Failed_count,file_source='s3 bucket')  
        return create_api_response("Success",data="Source Node created successfully",success_count=success_count,Failed_count=Failed_count,file_source='s3 bucket')
    except Exception as e:
            job_status = "Failed"
            error_message = str(e)
            logging.exception(f'Exception Stack trace:')
            return create_api_response(job_status,error=error_message,file_source='s3 bucket')   
      

def extract_graph_from_file(uri, userName, password, model, isEmbedding=False, isChunk_relationship_entity = False, file=None,s3_url=None,aws_access_key_id=None,aws_secret_access_key=None):

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

  # try:
      start_time = datetime.now()

      graph = Neo4jGraph(url=uri, username=userName, password=password)
    # try: 
      if file!=None:
        if not isinstance(file,str):
          with open('temp.pdf','wb') as f:
            f.write(file.file.read())
          loader = PyPDFLoader('temp.pdf')
          file_name=file.filename
          metadata = {"source": "local","filename": file.filename, "filesize":file.size }
        else:
          file_name = file.split('/')[-1]
          loader = PyPDFLoader(file)
          metadata = {"source": "local","filename": file_name, "filesize":os.path.getsize(file) }
        pages = loader.load_and_split()
        print(pages)
        file_key=file_name
        source_node = "fileName: '{}'"
        update_node_prop = "SET s.createdAt ='{}', s.updatedAt = '{}', s.processingTime = '{}',s.status = '{}', s.errorMessage = '{}',s.nodeCount= {}, s.relationshipCount = {}, s.model = '{}'"
        
      elif s3_url!=None:
        parsed_url = urlparse(s3_url)
        bucket = parsed_url.netloc
        file_key = parsed_url.path.lstrip('/')
        file_name=file_key.split('/')[-1]
        
        source_node = "fileName: '{}'"
        update_node_prop = "SET s.createdAt ='{}', s.updatedAt = '{}', s.processingTime = '{}',s.status = '{}', s.errorMessage = '{}',s.nodeCount= {}, s.relationshipCount = {}, s.model = '{}'"
        s3=boto3.client('s3',aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
        response=s3.head_object(Bucket=bucket,Key=file_key)
        file_size=response['ContentLength']
        
        metadata = {"source": "local","filename": file_key, "filesize":file_size }
        logging.info(f'bucket : {bucket},  file key : {file_key},  file size : {file_size}')
        pages=get_s3_pdf_content(s3_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
        print(pages)
        if pages==None:
          job_status = "Failed"
          return create_api_response(job_status,error='Failed to load the pdf content')
        
      bad_chars = ['"', "\n", "'"]
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
      if model.lower() == 'Diffbot'.lower() :
        graph_documents = extract_graph_from_diffbot(graph,chunks,file_name,isEmbedding,uri,userName,password)
        
      elif model.lower() == 'OpenAI GPT 3.5'.lower():
        model_version = 'gpt-3.5-turbo-16k'
        graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,isEmbedding,uri,userName,password)
        
      elif model.lower() == 'OpenAI GPT 4'.lower():
        model_version = 'gpt-4-0125-preview' 
        graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks,file_name,isEmbedding,uri,userName,password)
      else:
        create_api_response("Failed",error='Choose model OpenAI GPT 3.5/OpenAI GPT 4/Diffbot')
      distinct_nodes = set()
      relations = []
      
      for graph_document in graph_documents:
        #get distinct nodes
        for node in graph_document.nodes:
              distinct_nodes.add(node.id)
        #get all relations
        for relation in graph_document.relationships:
              relations.append(relation.type)
        
      nodes_created = len(distinct_nodes)
      relationships_created = len(relations)  
      
      end_time = datetime.now()
      processed_time = end_time - start_time
      job_status = "Completed"
      error_message =""
      logging.info("Update source node properties")
      graph.query('MERGE(s:Source {'+source_node.format(file_key.split('/')[-1])+'}) '+update_node_prop.format(start_time,end_time,round(processed_time.total_seconds(),2),job_status,error_message,nodes_created,relationships_created,model))

      graph_dict = {"nodes": [],
                    "relationships": []
                    }
      for graph_document in graph_documents:
        for node in graph_document.nodes:
            graph_dict["nodes"].append({
            "id": node.id, "label": node.type, "properties": node.properties
            })
            
        for relationship in graph_document.relationships:
            graph_dict["relationships"].append({
            "source": {"id": relationship.source.id,"label": relationship.source.type
            },
            "target": {"id": relationship.target.id,"label": relationship.target.type
            },
            "type": relationship.type,
            "properties": relationship.properties
            })
             
      output = {
          "fileName": file_name,
          "nodeCount": nodes_created,
          "relationshipCount": relationships_created,
          "nodes" : graph_dict["nodes"],
          "relationships" : graph_dict["relationships"],
          "processingTime": round(processed_time.total_seconds(),2),
          "model" : model
      }
      logging.info(f'Response from extract API : {output}')
      return create_api_response("Success",data=output)
  #   except Exception as e:
  #     job_status = "Failed"
  #     error_message = str(e)
  #     update_node_prop = 'SET s.status = "{}", s.errorMessage = "{}"'
  #     graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
  #     logging.exception(f'Exception Stack trace:')
  #     return create_api_response(job_status,error=error_message)
  # except Exception as e:
  #     job_status = "Failed"
  #     error_message = str(e)
  #     logging.exception(f'Exception Stack trace:')
  #     return create_api_response(job_status,error=error_message)


def get_source_list_from_graph():
  """
   Returns a list of sources that are in the database by querying the graph and
   sorting the list by the last updated date. 
 """
  logging.info("Get existing files list from graph")
  try:
    graph = Neo4jGraph()
    query = "MATCH(s:Source) RETURN s ORDER BY s.updatedAt DESC;"
    result = graph.query(query)
    list_of_json_objects = [entry['s'] for entry in result]
    return create_api_response("Success",data=list_of_json_objects)
  except Exception as e:
    job_status = "Failed"
    error_message = str(e)
    logging.exception('Exception')
    return create_api_response(job_status,error=error_message)


def create_api_response(status,success_count=None,Failed_count=None, data=None, error=None,message=None,file_source=None):
  """
   Create a response to be sent to the API. This is a helper function to create a JSON response that can be sent to the API.
   
   Args:
      status: The status of the API call. Should be one of the constants in this module.
      data: The data that was returned by the API call.
      error: The error that was returned by the API call.
      success_count: Number of files successfully processed.
      Failed_count: Number of files failed to process.
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
  
  if success_count is not None:
    response['success_count']=success_count
    response['Failed_count']=Failed_count
  
  if message is not None:
    response['message']=message

  if file_source is not None:
    response['file_source']=file_source
    
  return response