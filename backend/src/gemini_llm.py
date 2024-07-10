from langchain_community.graphs import Neo4jGraph
from dotenv import load_dotenv
from langchain.schema import Document
import logging
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from typing import List
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_core.documents import Document
from typing import List
import google.auth 
from typing import List
from langchain_core.documents import Document
import vertexai
from src.llm import get_graph_document_list, get_combined_chunks, get_llm

load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='DEBUG')


def get_graph_from_Gemini(model_version,
                            graph: Neo4jGraph,
                            chunkId_chunkDoc_list: List, 
                            allowedNodes, 
                            allowedRelationship):
    """
        Extract graph from OpenAI and store it in database. 
        This is a wrapper for extract_and_store_graph
                                
        Args:
            model_version : identify the model of LLM
            graph: Neo4jGraph to be extracted.
            chunks: List of chunk documents created from input file
        Returns: 
            List of langchain GraphDocument - used to generate graph
    """
    logging.info(f"Get graphDocuments from {model_version}")
    futures = []
    graph_document_list = []
    location = "us-central1"
    #project_id = "llm-experiments-387609"                            
    credentials, project_id = google.auth.default()
    if hasattr(credentials, "service_account_email"):
      logging.info(credentials.service_account_email)
    else:
        logging.info("WARNING: no service account credential. User account credential?")                           
    vertexai.init(project=project_id, location=location)
    
    combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
     
    llm,model_name = get_llm(model_version)
    return  get_graph_document_list(llm, combined_chunk_document_list, allowedNodes, allowedRelationship)
           
       
