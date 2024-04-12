from langchain_community.graphs import Neo4jGraph
import os
from dotenv import load_dotenv 
from langchain_community.graphs.graph_document import (
    Node as BaseNode,
    Relationship as BaseRelationship,
    GraphDocument,
)
from langchain.schema import Document
from typing import List, Optional
from langchain.pydantic_v1 import Field, BaseModel
from langchain.chains.openai_functions import (
    create_openai_fn_chain,
    create_structured_output_chain,
)
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from datetime import datetime
import logging
import re
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import threading
import uuid
from langchain_experimental.graph_transformers import LLMGraphTransformer
from src.shared.common_fn import get_combined_chunks

load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def get_graph_from_OpenAI(model_version, graph, lst_chunks:List):
    futures=[]
    graph_document_list=[]
        
    combined_chunk_document_list = get_combined_chunks(lst_chunks)
    
    llm = ChatOpenAI(model= model_version, temperature=0)
    llm_transformer = LLMGraphTransformer(llm=llm)
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        for chunk in combined_chunk_document_list:
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
        
    
    
