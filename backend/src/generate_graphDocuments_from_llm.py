from langchain_community.graphs import Neo4jGraph
from src.diffbot_transformer import get_graph_from_diffbot
from src.openAI_llm import get_graph_from_OpenAI
from src.gemini_llm import get_graph_from_Gemini
from src.groq_llama3_llm import get_graph_from_Groq_Llama3
from typing import List
import logging
from src.shared.constants import *

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(model: str, graph: Neo4jGraph, chunkId_chunkDoc_list: List, allowedNodes=None, allowedRelationship=None):
    
    if  allowedNodes is None or allowedNodes=="":
        allowedNodes =[]
    else:
        allowedNodes = allowedNodes.split(',')    
    if  allowedRelationship is None or allowedRelationship=="":   
        allowedRelationship=[]
    else:
        allowedRelationship = allowedRelationship.split(',')
    
    logging.info(f"allowedNodes: {allowedNodes}, allowedRelationship: {allowedRelationship}")

    graph_documents = []
    if model == "Diffbot":
        graph_documents = get_graph_from_diffbot(graph, chunkId_chunkDoc_list)

    elif model in OPENAI_MODELS:
        graph_documents = get_graph_from_OpenAI(MODEL_VERSIONS[model], graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)

    elif model in GEMINI_MODELS:
        graph_documents = get_graph_from_Gemini(MODEL_VERSIONS[model], graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)

    elif model in GROQ_MODELS :
        graph_documents = get_graph_from_Groq_Llama3(MODEL_VERSIONS[model], graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)
    else:
        raise Exception('Invalid LLM Model')

    logging.info(f"graph_documents = {len(graph_documents)}")
    return graph_documents
