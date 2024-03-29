from langchain_community.graphs import Neo4jGraph
import os
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
    create_structured_output_chain,
)
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from datetime import datetime
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import TokenTextSplitter
from src.make_relationships import create_source_chunk_entity_relationship
from tqdm import tqdm
import logging
import re
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import threading
import uuid
from langchain_experimental.graph_transformers import LLMGraphTransformer

load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

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
    logging.debug("Returns the word if words is not empty.")
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
    properties["name"] = node.id.title().replace(' ','_')
    #replace all non alphanumeric characters and spaces with underscore
    node_type = re.sub(r'[^\w]+', '_', node.type.capitalize())
    return BaseNode(
        id=node.id.title().replace(' ','_'), type=node_type, properties=properties
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
    
    prompt = ChatPromptTemplate.from_messages(
        [(
          "system",
          f"""# Knowledge Graph Instructions for GPT-4
## 1. Overview
You are a top-tier algorithm designed for extracting information in structured formats to build a knowledge graph.
- **Nodes** represent entities and concepts. They're akin to Wikipedia nodes.
- The aim is to achieve simplicity and clarity in the knowledge graph, making it accessible for a vast audience.
## 2. Labeling Nodes
- **Consistency**: Ensure you use basic or elementary types for node labels.
  - For example, when you identify an entity representing a person, always label it as **"person"**. Avoid using more specific terms like "mathematician" or "scientist".
- **Node IDs**: Never utilize integers as node IDs. Node IDs should be names or human-readable identifiers found in the text.
{'- **Allowed Node Labels:**' + ", ".join(allowed_nodes) if allowed_nodes else ""}
{'- **Allowed Relationship Types**:' + ", ".join(allowed_rels) if allowed_rels else ""}
## 3. Handling Numerical Data and Dates
- Numerical data, like age or other related information, should be incorporated as attributes or properties of the respective nodes.
- **No Separate Nodes for Dates/Numbers**: Do not create separate nodes for dates or numerical values. Always attach them as attributes or properties of nodes.
- **Property Format**: Properties must be in a key-value format.
- **Quotation Marks**: Never use escaped single or double quotes within property values.
- **Naming Convention**: Use camelCase for property keys, e.g., `birthDate`.
## 4. Coreference Resolution
- **Maintain Entity Consistency**: When extracting entities, it's vital to ensure consistency.
If an entity, such as "John Doe", is mentioned multiple times in the text but is referred to by different names or pronouns (e.g., "Joe", "he"),
always use the most complete identifier for that entity throughout the knowledge graph. In this example, use "John Doe" as the entity ID.
Remember, the knowledge graph should be coherent and easily understandable, so maintaining consistency in entity references is crucial.
## 5. Strict Compliance
- **Not allowed Values** : Do not use 'Source' as label for any node and 'RELATIONSHIP' as relationship type for any relationships in graph.
- **Colon values** : You may encounter colon(:) in content (example: Time references, description of title after heading). Please 
treat them as text and do not treat them as dictionaries. For example, if time "10:00" is mentioned, considered it as part of text 
content, not as data structure.
Adhere to the rules strictly. Non-compliance will result in termination.
          """),
            ("human", "Use the given format to extract information from the following input: {input}"),
            ("human", "Tip: Make sure to answer in the correct format"),
        ])
    return create_structured_output_chain(KnowledgeGraph, llm, prompt, verbose=False)


def extract_and_store_graph(
    model_version,
    graph: Neo4jGraph,
    document: Document,
    file_name: str,
    uri: str,
    userName:str,
    password:str,
    firstChunk:bool,
    current_chunk_id:uuid,
    previous_chunk_id:uuid,
    nodes:Optional[List[str]] = None,
    rels:Optional[List[str]]=None) -> None:
    
    """
     This is a wrapper around OpenAI functions to perform the extraction and 
     store the result into a Neo4jGraph.
     
     Args:
        model_version: LLM model version
        graph: Neo4j graph to store the data into
        document: Langchain document to extract data from
        file_name (str): file name of input source
        uri: URI of the graph to extract
        userName: Username to use for graph creation ( if None will use username from config file )
        password: Password to use for graph creation ( if None will use password from config file )
        firstChunk : It's bool value to create FIRST_CHUNK AND NEXT_CHUNK relationship between chunk and document node.
        current_chunk_id : Unique id of chunk
        previous_chunk_id : Unique id of previous chunk
        nodes: List of nodes to extract ( default : None )
        rels: List of relationships to extract ( default : None )
     
     Returns: 
     	 The GraphDocument that was extracted and stored into the Neo4jgraph
    """
    logging.info(f"Processing chunk in thread: {threading.current_thread().name}")
    extract_chain = get_extraction_chain(model_version,nodes, rels)
    data = extract_chain.invoke(document.page_content)['function']

    for rel in data.rels:  
        if rel.type.casefold() == 'relationship'.casefold():
            rel.type = 'relation'
        
    graph_document = [GraphDocument(
      nodes = [map_to_base_node(node) for node in data.nodes],
      relationships = [map_to_base_relationship(rel) for rel in data.rels],
      source = document
    )]   

    graph.add_graph_documents(graph_document)
    lst_cypher_queries_chunk_relationship = create_source_chunk_entity_relationship(file_name,graph,graph_document,document,uri,userName,password,firstChunk,current_chunk_id,
    previous_chunk_id)
    return graph_document, lst_cypher_queries_chunk_relationship
 
    
# def extract_graph_from_OpenAI(model_version,
#                             graph: Neo4jGraph,
#                             chunks: List[Document],
#                             file_name : str,
#                             uri : str,
#                             userName : str,
#                             password : str):
#     """
#         Extract graph from OpenAI and store it in database. 
#         This is a wrapper for extract_and_store_graph
                                
#         Args:
#             model_version : identify the model of LLM
#             graph: Neo4jGraph to be extracted.
#             chunks: List of chunk documents created from input file
#             file_name (str) : file name of input source
#             uri: URI of the graph to extract
#             userName: Username to use for graph creation ( if None will use username from config file )
#             password: Password to use for graph creation ( if None will use password from config file )    
#         Returns: 
#             List of langchain GraphDocument - used to generate graph
#     """
#     openai_api_key = os.environ.get('OPENAI_API_KEY')
#     graph_document_list = []
#     relationship_cypher_list = []
#     futures=[]
#     logging.info(f"create relationship between source,chunk and entity nodes created from {model_version}")
    
#     with ThreadPoolExecutor(max_workers=10) as executor:
#         current_chunk_id= ''
#         for i, chunk_document in tqdm(enumerate(chunks), total=len(chunks)):
#             previous_chunk_id = current_chunk_id
#             current_chunk_id = str(uuid.uuid1())
#             position = i+1
#             if i == 0:
#                 firstChunk = True
#             else:
#                 firstChunk = False
#             metadata = {"position": position,"length": len(chunk_document.page_content)}
#             chunk_document = Document(page_content=chunk_document.page_content,metadata = metadata)
            
#             futures.append(executor.submit(extract_and_store_graph,model_version,graph,chunk_document,file_name,uri,userName,password,firstChunk,current_chunk_id,previous_chunk_id))   
#         for future in concurrent.futures.as_completed(futures):
#             graph_document,lst_cypher_queries_chunk_relationship = future.result()
            
#             graph_document_list.append(graph_document[0])
#             relationship_cypher_list.extend(lst_cypher_queries_chunk_relationship)
        
#     return graph_document_list, relationship_cypher_list

def extract_graph_from_OpenAI(model_version,
                            graph: Neo4jGraph,
                            chunks: List[Document],
                            file_name : str,
                            uri : str,
                            userName : str,
                            password : str):
    """
        Extract graph from OpenAI and store it in database. 
        This is a wrapper for extract_and_store_graph
                                
        Args:
            model_version : identify the model of LLM
            graph: Neo4jGraph to be extracted.
            chunks: List of chunk documents created from input file
            file_name (str) : file name of input source
            uri: URI of the graph to extract
            userName: Username to use for graph creation ( if None will use username from config file )
            password: Password to use for graph creation ( if None will use password from config file )    
        Returns: 
            List of langchain GraphDocument - used to generate graph
    """
    
    llm = ChatOpenAI(model= model_version, temperature=0)
    llm_transformer = LLMGraphTransformer(llm=llm)
    
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    graph_document_list = []
    relationship_cypher_list = []
    futures=[]
    graph_document_list_for_post_processing = {}
    logging.info(f"create relationship between source,chunk and entity nodes created from {model_version}")
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        current_chunk_id= ''
        # for i, chunk_document in tqdm(enumerate(chunks), total=len(chunks)):
        #     futures.append(executor.submit(llm_transformer.convert_to_graph_documents,[chunk_document]))   
        for chunk_document in chunks:
            futures.append(executor.submit(llm_transformer.convert_to_graph_documents,[chunk_document]))   
        
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            graph_document = future.result()
            for node in graph_document[0].nodes:
                node.id = node.id.title().replace(' ','_')
                #replace all non alphanumeric characters and spaces with underscore
                node.type = re.sub(r'[^\w]+', '_', node.type.capitalize())
            graph.add_graph_documents(graph_document)
            graph_document_list.append(graph_document[0])
        
        for graph_document in graph_document_list:
            for index, chunk in enumerate(chunks):
                if graph_document.source.page_content == chunk.page_content:
                    position = index+1
                    #graph_document_list_for_post_processing.append(graph_document_list[position])
                    graph_document_list_for_post_processing[position]=graph_document
                    break
        sorted_graph_document_list_for_post_processing = dict(sorted(graph_document_list_for_post_processing.items()))
        for i, graph_document in enumerate(list(sorted_graph_document_list_for_post_processing.values())):  
            previous_chunk_id = current_chunk_id
            current_chunk_id = str(uuid.uuid1())
            #position = i+1
            if i == 0:
                firstChunk = True
            else:
                firstChunk = False
            metadata = {"position": position,"length": len(graph_document.source.page_content)}
            chunk_document = Document(page_content=graph_document.source.page_content,metadata = metadata)
            
            lst_cypher_queries_chunk_relationship = create_source_chunk_entity_relationship(file_name,graph,[graph_document],chunk_document,uri,userName,password,firstChunk,current_chunk_id,previous_chunk_id)
            #graph_document_list.append(graph_document[0])
            relationship_cypher_list.extend(lst_cypher_queries_chunk_relationship)
    graph.refresh_schema()    
    return graph_document_list, relationship_cypher_list

def get_graph_from_OpenAI(model_version, graph, chunks:List):
    futures=[]
    graph_document_list=[]
    llm = ChatOpenAI(model= model_version, temperature=0)
    llm_transformer = LLMGraphTransformer(llm=llm)
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        for chunk in chunks:
            futures.append(executor.submit(llm_transformer.convert_to_graph_documents,[chunk]))   
        
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            graph_document = future.result()
            for node in graph_document[0].nodes:
                node.id = node.id.title().replace(' ','_')
                #replace all non alphanumeric characters and spaces with underscore
                node.type = re.sub(r'[^\w]+', '_', node.type.capitalize())
            graph_document_list.append(graph_document[0])

    graph.add_graph_documents(graph_document_list)
    return  graph_document_list        
        
    
    
