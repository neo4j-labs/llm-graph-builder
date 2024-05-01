from langchain_community.graphs import Neo4jGraph
from src.diffbot_transformer import get_graph_from_diffbot
from src.openAI_llm import get_graph_from_OpenAI
from src.gemini_llm import get_graph_from_Gemini
from typing import List
import logging

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(model: str, graph: Neo4jGraph, chunkId_chunkDoc_list: List, allowedNodes, allowedRelationship):
    
    if  allowedNodes is None or allowedNodes=="":
        allowedNodes = allowedNodes.split(',')
    else:
        allowedNodes =[]    
    
    if  allowedRelationship is None or allowedRelationship=="":   
        allowedRelationship = allowedRelationship.split(',')
    else:
        allowedRelationship=[]    
    logging.info(f"allowedNodes: {allowedNodes}, allowedRelationship: {allowedRelationship}")

    
    if model == "Diffbot":
        graph_documents = get_graph_from_diffbot(graph, chunkId_chunkDoc_list)

    elif model == "OpenAI GPT 3.5":
        model_version = "gpt-3.5-turbo-16k"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)

    elif model == "OpenAI GPT 4":
        model_version = "gpt-4-0125-preview"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)
    
    elif model == "Gemini 1.0 Pro" :
        model_version = "gemini-1.0-pro-001"
        graph_documents = get_graph_from_Gemini(model_version, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)

    elif model == "Gemini 1.5 Pro" :
        model_version = "gemini-1.5-pro-preview-0409"
        graph_documents = get_graph_from_Gemini(model_version, graph, chunkId_chunkDoc_list, allowedNodes, allowedRelationship)

    logging.info(f"graph_documents = {len(graph_documents)}")
    return graph_documents
