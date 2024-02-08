
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from dotenv import load_dotenv
from datetime import datetime
import os
import traceback
from langchain.text_splitter import TokenTextSplitter
from tqdm import tqdm
from src.diffbot_transformer import extract_graph_from_diffbot
from src.openAI_llm import extract_graph_from_OpenAI
from typing import List

load_dotenv()

# url =os.environ.get('NEO4J_URI')
# username = os.environ.get('NEO4J_USERNAME')
# password = os.environ.get('NEO4J_PASSWORD')
graph = Neo4jGraph();

def create_source_node_graph(uri, userName, password, file):
  try:
    start_time = datetime.now()
    job_status = "New"
    file_type = file.filename.split('.')[1]
    file_size = file.size
    file_name = file.filename

    graph = Neo4jGraph(url=uri, username=userName, password=password)

    source_node = "fileName: '{}'"
    update_node_prop = "SET s.fileSize = '{}', s.fileType = '{}' ,s.status = '{}'"
    #create source node as file name if not exist
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(file_size,file_type,job_status))
    return create_api_response("Success",data="Source Node created succesfully")
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    update_node_prop = "SET s.status = '{}', s.errorMessgae = '{}'"
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
    print(f'Exception Stack trace: {traceback.print_exc()}')
    return create_api_response(job_status,error=error_message)
  
  
def file_into_chunks(pages: List[Document]):
    # Define chunking strategy
    text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
    chunks = text_splitter.split_documents(pages)
    
    return chunks
   

def extract_graph_from_file(uri, userName, password, file, model):
  try:
    start_time = datetime.now()
    file_name = file.filename
    
    graph = Neo4jGraph(url=uri, username=userName, password=password)

    metadata = {"source": "local","filename": file.filename, "filesize":file.size }

    with open('temp.pdf','wb') as f:
      f.write(file.file.read())
    loader = PyPDFLoader('temp.pdf')
    pages = loader.load_and_split()
    
    for i in range(0,len(pages)):
      pages[i]=Document(page_content=pages[i].page_content.replace('\n',' '), metadata=metadata)
    
    chunks = file_into_chunks(pages)
    
    if model == 'Diffbot' :
      graph_documents = extract_graph_from_diffbot(graph,chunks)
      
    elif model == 'OpenAI GPT':
       graph_documents = extract_graph_from_OpenAI(graph,chunks)
       
    # nodes_created = len(graph_documents[0].nodes)
    # relationships_created = len(graph_documents[0].relationships) 
    distinct_nodes = set()
    relations = []
    
    for graph_document in graph_documents:
      #get all nodes
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

    source_node = "fileName: '{}'"
    update_node_prop = "SET s.createdAt ='{}', s.updatedAt = '{}', s.processingTime = '{}',s.status = '{}', s.errorMessgae = '{}',s.nodeCount= {}, s.relationshipCount = {}, s.model = '{}'"
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(start_time,end_time,round(processed_time.total_seconds(),2),job_status,error_message,nodes_created,relationships_created,model))

    output = {
        "fileName": file_name,
        "nodeCount": nodes_created,
        "relationshipCount": relationships_created,
        "processingTime": round(processed_time.total_seconds(),2),
        "status" : job_status,
        "model" : model
    }
    
    # return  JSONResponse(content=jsonable_encoder(output))
    return create_api_response("Success",data=output)
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    update_node_prop = "SET s.status = '{}', s.errorMessgae = '{}'"
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
    print(f'Exception Stack trace: {traceback.print_exc()}')
    return create_api_response(job_status,error=error_message)

def get_source_list_from_graph():
  try:
    query = "MATCH(s:Source) RETURN s ORDER BY s.updatedAt DESC;"
    result = graph.query(query)
    list_of_json_objects = [entry['s'] for entry in result]
    return create_api_response("Success",data=list_of_json_objects)
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    return create_api_response(job_status,error=error_message)

def create_api_response(status, data=None, error=None):
  response = {"status": status}

  if data is not None:
    response["data"] = data

  if error is not None:
    response["error"] = error

  return response