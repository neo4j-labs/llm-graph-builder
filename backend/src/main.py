
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
import json

load_dotenv()

# url =os.environ.get('NEO4J_URI')
# username = os.environ.get('NEO4J_USERNAME')
# password = os.environ.get('NEO4J_PASSWORD')
graph = Neo4jGraph();

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
   

def extract_graph_from_file(uri, userName, password, file, model):
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
    file_name = file.filename
    
    graph = Neo4jGraph(url=uri, username=userName, password=password)

    metadata = {"source": "local","filename": file.filename, "filesize":file.size }

    with open('temp.pdf','wb') as f:
      f.write(file.file.read())
    loader = PyPDFLoader('temp.pdf')
    pages = loader.load_and_split()
    
    # Creates a new Document object for each page in the list of pages.
    for i in range(0,len(pages)):
      pages[i]=Document(page_content=pages[i].page_content.replace('\n',' '), metadata=metadata)
    
    chunks = file_into_chunks(pages)
    
    # Get graph document list from models.
    if model == 'Diffbot' :
      graph_documents = extract_graph_from_diffbot(graph,chunks)
      
    elif model == 'OpenAI GPT 3.5':
      model_version = 'gpt-3.5-turbo-16k'
      graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks)
       
    elif model == 'OpenAI GPT 4':
      model_version = 'gpt-4-0125-preview' 
      graph_documents = extract_graph_from_OpenAI(model_version,graph,chunks)
        
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
    
    update_response_to_jsonFile(graph_documents,model,file_name,processed_time,nodes_created,relationships_created)
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


def update_response_to_jsonFile(graph_documents,
                                model,
                                file,
                                processing_time,
                                node_count,
                                relations_count):
  """
   Writes the /extract API response in json
   1. If new model doesn't exist in json file then it creates a new entry.
   2. If model exist and new file is uploaded then new file's response is appended to model's list
   3. If model and file both exists in json then that record is updated with latest response.  
   
   Args:
   	 graph_documents: response from LLMs in list of GraphDocument format.
   	 model: Model/LLM choosen for KG creation
   	 file: Uploaded file name
     processing_time : Processing time taken for graph generation
     node_count : Number of nodes created from file
     relations_count : Number of relations created from file
   
   Returns: 
   	 Updates data/llm_comparision.json file.
  """
  
  graph_dict = {
    "nodes": [],
    "relationships": []
  }
  
  file_exist = 'false'
  json_file_path = '../data/llm_comparision.json'
  
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
        
  data = {
            "file" : file, 
            "processing time" : round(processing_time.total_seconds(),2), 
            "node count" : node_count, 
            "relation count" : relations_count,
            "nodes" : graph_dict["nodes"],
            "relationships" : graph_dict["relationships"] 
            }
  llm_data = { model : data
        }
  
  with open(json_file_path, 'r') as json_file :
    json_file_data = json.load(json_file)

  # Add new model to the json data
  if model not in json_file_data.keys():
        json_file_data.update({model : [data]})    
  
  else :
  # Check if file already exist  
    for i,existing_data in enumerate(json_file_data[model]):
      if llm_data[model]['file'] == json_file_data[model][i]['file']:
          file_exist = 'true'
          break
    # Replace existing record with new response    
    if file_exist == 'true': 
      json_file_data[model][i] = llm_data[model] 
    #  Add new file response to model  
    else:
      json_file_data[model].append(llm_data[model])  

  with open(json_file_path, 'w') as json_file :
    json.dump(json_file_data, json_file, indent=4)      
   
  