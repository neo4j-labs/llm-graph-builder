from langchain_community.graphs import Neo4jGraph
from dotenv import load_dotenv
from datetime import datetime
import logging
from src.create_chunks import CreateChunksofDocument
from src.graphDB_dataAccess import graphDBdataAccess
from src.document_sources.local_file import get_documents_from_file_by_path
from src.entities.source_node import sourceNode
from src.generate_graphDocuments_from_llm import generate_graphDocuments
from src.document_sources.gcs_bucket import *
from src.document_sources.s3_bucket import *
from src.document_sources.wikipedia import *
from src.document_sources.youtube import *
from src.shared.common_fn import *
from src.make_relationships import *
import re
from langchain_community.document_loaders import WikipediaLoader
import warnings
from pytube import YouTube
import sys
import shutil
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

def create_source_node_graph_url_gcs(graph, model, gcs_bucket_name, gcs_bucket_folder, source_type):

    success_count=0
    failed_count=0
    lst_file_name = []
    
    lst_file_metadata= get_gcs_bucket_files_info(gcs_bucket_name, gcs_bucket_folder)
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
      obj_source_node.created_at = datetime.now()
      try:
          graphDb_data_Access = graphDBdataAccess(graph)
          graphDb_data_Access.create_source_node(obj_source_node)
          success_count+=1
          lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Success', 'gcsBucketName': gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder})
      except Exception as e:
        failed_count+=1
        lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url,'status':'Failed', 'gcsBucketName': gcs_bucket_name, 'gcsBucketFolder':obj_source_node.gcsBucketFolder})
    return lst_file_name,success_count,failed_count

def create_source_node_graph_url_youtube(graph, model, source_url, source_type):
    
    youtube_url = check_url_source(source_type=source_type, yt_url=source_url)
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
    logging.info(f"match value{match}")
    obj_source_node.file_name = YouTube(obj_source_node.url).title
    transcript= get_youtube_transcript(match.group(1))
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
    queries_list =  wiki_query.split(',')
    wiki_query_ids = check_url_source(source_type=source_type, queries_list=queries_list)
    for query in wiki_query_ids:
      logging.info(f"Creating source node for {query.strip()}")
      pages = WikipediaLoader(query=query.strip(), load_max_docs=1, load_all_available_meta=True).load()
      try:
        if not pages:
          failed_count+=1
          continue
        obj_source_node = sourceNode()
        obj_source_node.file_name = query.strip()
        obj_source_node.file_type = 'text'
        obj_source_node.file_source = source_type
        obj_source_node.file_size = sys.getsizeof(pages[0].page_content)
        obj_source_node.model = model
        obj_source_node.url = pages[0].metadata['source']
        obj_source_node.created_at = datetime.now()
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.create_source_node(obj_source_node)
        success_count+=1
        lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url, 'status':'Success'})
      except Exception as e:
        failed_count+=1
        lst_file_name.append({'fileName':obj_source_node.file_name,'fileSize':obj_source_node.file_size,'url':obj_source_node.url, 'status':'Failed'})
    return lst_file_name,success_count,failed_count
    
def extract_graph_from_file_local_file(graph, model, fileName, merged_file_path, allowedNodes, allowedRelationship):

  logging.info(f'Process file name :{fileName}')
  file_name, pages = get_documents_from_file_by_path(merged_file_path,fileName)
  
  if pages==None or len(pages)==0:
    raise Exception(f'Pdf content is not available for file : {file_name}')

  return processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship, merged_file_path)

def extract_graph_from_file_s3(graph, model, source_url, aws_access_key_id, aws_secret_access_key, allowedNodes, allowedRelationship):

  if(aws_access_key_id==None or aws_secret_access_key==None):
    raise Exception('Please provide AWS access and secret keys')
  else:
    logging.info("Insert in S3 Block")
    file_name, pages = get_documents_from_s3(source_url, aws_access_key_id, aws_secret_access_key)

  if pages==None or len(pages)==0:
    raise Exception(f'Pdf content is not available for file : {file_name}')

  return processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship)

def extract_graph_from_file_youtube(graph, model, source_url, allowedNodes, allowedRelationship):
  
  file_name, pages = get_documents_from_youtube(source_url)

  if pages==None or len(pages)==0:
    raise Exception(f'Youtube transcript is not available for file : {file_name}')

  return processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship)

def extract_graph_from_file_Wikipedia(graph, model, wiki_query, max_sources, allowedNodes, allowedRelationship):

  file_name, pages = get_documents_from_Wikipedia(wiki_query)
  if pages==None or len(pages)==0:
    raise Exception(f'Wikipedia page is not available for file : {file_name}')

  return processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship)

def extract_graph_from_file_gcs(graph, model, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, allowedNodes, allowedRelationship):

  file_name, pages = get_documents_from_gcs(gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename)
  if pages==None or len(pages)==0:
    raise Exception(f'Pdf content is not available for file : {file_name}')

  return processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship)

def processing_source(graph, model, file_name, pages, allowedNodes, allowedRelationship, merged_file_path=None):
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
  start_time = datetime.now()
  graphDb_data_Access = graphDBdataAccess(graph)

  result = graphDb_data_Access.get_current_status_document_node(file_name)
  
  if result[0]['Status'] != 'Processing':
    
    bad_chars = ['"', "\n", "'"]
    for i in range(0,len(pages)):
      text = pages[i].page_content
      for j in bad_chars:
        if j == '\n':
          text = text.replace(j, ' ')
        else:
          text = text.replace(j, '')
      pages[i]=Document(page_content=str(text))
      
    logging.info("Break down file into chunks")
    
    create_chunks_obj = CreateChunksofDocument(pages, graph, file_name)
    chunks = create_chunks_obj.split_file_into_chunks()

    obj_source_node = sourceNode()
    status = "Processing"
    obj_source_node.file_name = file_name
    obj_source_node.status = status
    obj_source_node.created_at = start_time
    obj_source_node.updated_at = start_time
    obj_source_node.total_pages = len(pages)
    obj_source_node.total_chunks = len(chunks)
    obj_source_node.model = model
    logging.info(file_name)
    logging.info(obj_source_node)
    graphDb_data_Access.update_source_node(obj_source_node)
    logging.info('Update the status as Processing')

    chunkId_chunkDoc_list = create_relation_between_chunks(graph,file_name,chunks)
    #create vector index and update chunk node with embedding
    update_embedding_create_vector_index( graph, chunkId_chunkDoc_list, file_name)
    logging.info("Get graph document list from models")
    graph_documents =  generate_graphDocuments(model, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)
    save_graphDocuments_in_neo4j(graph, graph_documents)
    
    chunks_and_graphDocuments_list = get_chunk_and_graphDocument(graph_documents, chunkId_chunkDoc_list)
    merge_relationship_between_chunk_and_entites(graph, chunks_and_graphDocuments_list)

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

    obj_source_node = sourceNode()
    obj_source_node.file_name = file_name
    obj_source_node.status = job_status
    obj_source_node.created_at = start_time
    obj_source_node.updated_at = end_time
    obj_source_node.model = model
    obj_source_node.processing_time = processed_time
    obj_source_node.node_count = nodes_created
    obj_source_node.total_pages = len(pages)
    obj_source_node.total_chunks = len(chunks)
    obj_source_node.relationship_count = relationships_created

    graphDb_data_Access.update_source_node(obj_source_node)
    logging.info('Updated the nodeCount and relCount properties in Docuemnt node')
    logging.info(f'file:{file_name} extraction has been completed')


    # merged_file_path have value only when file uploaded from local
    if merged_file_path is not None:
      delete_uploaded_local_file(merged_file_path, file_name)
      
    return {
        "fileName": file_name,
        "nodeCount": nodes_created,
        "relationshipCount": relationships_created,
        "processingTime": round(processed_time.total_seconds(),2),
        "status" : job_status,
        "model" : model,
        "success_count" : 1
    }
  else:
     logging.info('File does not process because it\'s already in Processing status')

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
  return graph_DB_dataAccess.get_source_list()

def update_graph(graph):
  """
  Update the graph node with SIMILAR relationship where embedding scrore match
  """
  graph_DB_dataAccess = graphDBdataAccess(graph)
  return graph_DB_dataAccess.update_KNN_graph()

  
def connection_check(graph):
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
  return graph_DB_dataAccess.connection_check()

def merge_chunks(file_name, total_chunks, chunk_dir, merged_dir):

  if not os.path.exists(merged_dir):
      os.mkdir(merged_dir)

  with open(os.path.join(merged_dir, file_name), "wb") as write_stream:
      for i in range(1,total_chunks+1):
          chunk_file_path = os.path.join(chunk_dir, f"{file_name}_part_{i}")
          with open(chunk_file_path, "rb") as chunk_file:
              shutil.copyfileobj(chunk_file, write_stream)
          os.unlink(chunk_file_path)  # Delete the individual chunk file after merging
  logging.info("Chunks merged successfully and return file size")
  file_size = os.path.getsize(os.path.join(merged_dir, file_name))
  return file_size
  


def upload_file(graph, model, chunk, chunk_number:int, total_chunks:int, originalname, chunk_dir, merged_dir):
  # chunk_dir = os.path.join(os.path.dirname(__file__), "chunks")  # Directory to save chunks
  if not os.path.exists(chunk_dir):
      os.mkdir(chunk_dir)
  
  chunk_file_path = os.path.join(chunk_dir, f"{originalname}_part_{chunk_number}")
  logging.info(f'Chunk File Path: {chunk_file_path}')
  
  with open(chunk_file_path, "wb") as chunk_file:
      chunk_file.write(chunk.file.read())

  if int(chunk_number) == int(total_chunks):
      # If this is the last chunk, merge all chunks into a single file
      file_size = merge_chunks(originalname, int(total_chunks), chunk_dir, merged_dir)
      logging.info("File merged successfully")

      obj_source_node = sourceNode()
      obj_source_node.file_name = originalname
      obj_source_node.file_type = 'pdf'
      obj_source_node.file_size = file_size
      obj_source_node.file_source = 'local file'
      obj_source_node.model = model
      obj_source_node.created_at = datetime.now()
      graphDb_data_Access = graphDBdataAccess(graph)
        
      graphDb_data_Access.create_source_node(obj_source_node)
      return "Source Node created Successfully"
  return f"Chunk {chunk_number}/{total_chunks} saved"

def get_labels_and_relationtypes(graph):
  query = """
          CALL db.labels() yield label WITH collect(label) as labels 
          CALL db.relationshipTypes() yield relationshipType 
          RETURN labels, collect(relationshipType) as relationshipTypes
          """
  graphDb_data_Access = graphDBdataAccess(graph)
  return graphDb_data_Access.execute_query(query)
