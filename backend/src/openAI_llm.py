from langchain_community.graphs import Neo4jGraph
import os
from dotenv import load_dotenv 
import logging
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from langchain_experimental.graph_transformers import LLMGraphTransformer
from src.llm import get_graph_document_list, get_combined_chunks, get_llm

load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def get_graph_from_OpenAI(model_version, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship):
    futures=[]
    graph_document_list=[]
        
    combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
    
    llm,model_name = get_llm(model_version)  
    return  get_graph_document_list(llm, combined_chunk_document_list, allowedNodes, allowedRelationship)
           
        
    
    
