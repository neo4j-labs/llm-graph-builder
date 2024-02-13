from langchain_community.graphs import Neo4jGraph
from dotenv import load_dotenv 
from langchain_community.graphs.graph_document import (
    Node as BaseNode,
    Relationship as BaseRelationship,
    GraphDocument,
)
from langchain.schema import Document
from typing import List, Dict, Any, Optional
from langchain.pydantic_v1 import Field, BaseModel
from langchain.chains.openai_functions import (
    create_openai_fn_chain,
    create_structured_output_chain
)
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from datetime import datetime
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import TokenTextSplitter
from tqdm import tqdm
from .prompt import *
# load_dotenv()

from langchain_community.document_loaders import PyPDFLoader
from langchain.docstore.document import Document
from datetime import datetime
import os
import traceback
from langchain.text_splitter import TokenTextSplitter
from typing import List


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
   

def extract_graph_from_file(uri, userName, password, file_path, model,
                            nodes:Optional[List[str]] = None,
                            rels:Optional[List[str]]=None):
  """
   Extracts a Neo4jGraph from a PDF file based on the model.
   
   Args:
   	 uri: URI of the graph to extract
   	 userName: Username to use for graph creation ( if None will use username from config file )
   	 password: Password to use for graph creation ( if None will use password from config file )
   	 file: File object containing the PDF file path to be used
   	 model: Type of model to use ('OpenAI GPT 3.5' or 'OpenAI GPT 4')
   
   Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.
  """
  try:
    start_time = datetime.now()
    file_name = file_path.split('/')[-1]
    
    graph = Neo4jGraph(url=uri, username=userName, password=password)

    file_size = os.stat(file_path)
    print("file size :", file_size.st_size, "bytes")

    metadata = {"source": "local","filename": file_name, "filesize":file_size.st_size }

    loader = PyPDFLoader(file_path)
    pages = loader.load_and_split()
    
    # Creates a new Document object for each page in the list of pages.
    for i in range(0,len(pages)):
      pages[i]=Document(page_content=pages[i].page_content.replace('\n',' '), metadata=metadata)
    
    chunks = file_into_chunks(pages)
    
    # Get graph document list from models.
      
    if model == 'OpenAI GPT 3.5':
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
    
    # return  JSONResponse(content=jsonable_encoder(output))
    return create_api_response("Success",data=output)
  except Exception as e:
    job_status = "Failure"
    error_message = str(e)
    update_node_prop = "SET s.status = '{}', s.errorMessgae = '{}'"
    graph.query('MERGE(s:Source {'+source_node.format(file_name)+'}) '+update_node_prop.format(job_status,error_message))
    print(f'Exception Stack trace: {traceback.print_exc()}')
    return create_api_response(job_status,error=error_message)


def get_source_list_from_graph(graph):
  """
   Returns a list of sources that are in the database by querying the graph and 
   sorting the list by the last updated date. 
   
   Agrs:
   graph : Neo4j graph object
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

class Property(BaseModel):
  """A single property consisting of key and value"""
  key: str = Field(..., description="key")
  value: str = Field(..., description="value")

class Node(BaseNode):
    properties: Optional[List[Property]] = Field(
        None, description="List of node properties")

class Relationship(BaseRelationship):
    properties: Optional[List[Property]] = Field(
        None, description="List of relationship properties"
    )
class KnowledgeGraph(BaseModel):
    """Generate a knowledge graph with entities and relationships."""
    nodes: List[Node] = Field(
        ..., description="List of nodes in the knowledge graph")
    rels: List[Relationship] = Field(
        ..., description="List of relationships in the knowledge graph"
    )
  
    
def format_property_key(s: str) -> str: 
    """
     Formats a property key to make it easier to read. 
     This is used to ensure that the keys are consistent across the server
     
     Args:
     	 s: The string to format.
     
     Returns: 
     	 The formatted string or the original string if there was no
    """
    
    words = s.split()
    # Returns the word if words is not empty.
    # Returns the word if words is not empty.
    if not words:
        return s
    first_word = words[0].lower()
    capitalized_words = [word.capitalize() for word in words[1:]]
    return "".join([first_word] + capitalized_words)


def props_to_dict(props) -> dict:
    """
     Convert properties to a dictionary. 
     This is used to convert a list of : class : ` Property ` objects to a dictionary
     
     Args:
     	 props: List of : class : ` Property ` objects
     
     Returns: 
     	 Dictionary of property keys and values or an empty dictionary
    """
    properties = {}
    if not props:
      return properties
    for p in props:
        properties[format_property_key(p.key)] = p.value
    return properties


def map_to_base_node(node: Node) -> BaseNode:
    """
     Map KnowledgeGraph Node to the Base Node. 
     This is used to generate Cypher statements that are derived from the knowledge graph
     
     Args:
     	 node: The node to be mapped
     
     Returns: 
     	 A mapping of the KnowledgeGraph Node to the BaseNode
    """
    properties = props_to_dict(node.properties) if node.properties else {}
    properties["name"] = node.id.title()
    return BaseNode(
        id=node.id.title(), type=node.type.capitalize(), properties=properties
    )


def map_to_base_relationship(rel: Relationship) -> BaseRelationship:
    """
     Map KnowledgeGraph relationships to the base Relationship. 
    
     Args:
     	 rel: The relationship to be mapped
     
     Returns: 
     	 The mapped : class : ` BaseRelationship ` 
    """
    source = map_to_base_node(rel.source)
    target = map_to_base_node(rel.target)
    properties = props_to_dict(rel.properties) if rel.properties else {}
    return BaseRelationship(
        source=source, target=target, type=rel.type, properties=properties
    )  


def get_extraction_chain(
    model_version,
    allowed_nodes: Optional[List[str]] = None,
    allowed_rels: Optional[List[str]] = None
    ):
    
    llm = ChatOpenAI(model= model_version, temperature=0)
    """
    Get a chain of nodes and relationships to extract from GPT. 
    This is an interactive function that prompts the user to select which nodes and relationships 
    to extract from the Knowledge Graph and returns them as a list of Node objects.
    
    Args:
     	 Optional allowed_nodes: A list of node IDs to be considered for extraction. 
         Optional allowed_rels: A list of relationships to be considered for extraction. 
         
         If None ( default ) all nodes are considered. If a list of strings is provided only nodes that match the string will be considered.
    """
    
    prompt = ChatPromptTemplate.from_messages(get_prompt_text(allowed_nodes,allowed_rels))
    return create_structured_output_chain(KnowledgeGraph, llm, prompt, verbose=False)


def extract_and_store_graph(
    model_version,
    graph: Neo4jGraph,
    document: Document,
    nodes:Optional[List[str]] = None,
    rels:Optional[List[str]]=None) -> None:
    
    """
     This is a wrapper around OpenAI functions to perform the extraction and 
     store the result into a Neo4jGraph.
     
     Args:
     	 graph: Neo4j graph to store the data into
     	 document: Langchain document to extract data from
     	 nodes: List of nodes to extract ( default : None )
     	 rels: List of relationships to extract ( default : None )
     
     Returns: 
     	 The GraphDocument that was extracted and stored into the Neo4jgraph
    """
   
    extract_chain = get_extraction_chain(model_version,nodes, rels)
    data = extract_chain.invoke(document.page_content)['function']

    graph_document = [GraphDocument(
      nodes = [map_to_base_node(node) for node in data.nodes],
      relationships = [map_to_base_relationship(rel) for rel in data.rels],
      source = document
    )]

    graph.add_graph_documents(graph_document)
    return graph_document   
 
    
def extract_graph_from_OpenAI(model_version,
                            graph: Neo4jGraph, 
                            chunks: List[Document],
                            nodes:Optional[List[str]] = None,
                            rels:Optional[List[str]]=None):
    """
        Extract graph from OpenAI and store it in database. 
        This is a wrapper for extract_and_store_graph
                                
        Args:
            graph: Neo4jGraph to be extracted.
            chunks: List of chunk documents created from input file
                                
        Returns: 
            List of langchain GraphDocument - used to generate graph
    """
    graph_document_list = []

    for i, chunk_document in tqdm(enumerate(chunks), total=len(chunks)):
        graph_document=extract_and_store_graph(model_version,graph,chunk_document)
        graph_document_list.append(graph_document[0])     
    return graph_document_list
                 