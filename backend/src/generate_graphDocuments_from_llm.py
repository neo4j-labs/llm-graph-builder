from langchain_community.graphs import Neo4jGraph
from src.diffbot_transformer import get_graph_from_diffbot
from src.openAI_llm import get_graph_from_OpenAI
from src.gemini_llm import get_graph_from_Gemini
from typing import List
import logging

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(model: str, graph: Neo4jGraph, chunkId_chunkDoc_list: List):
    if model == "Diffbot":
        graph_documents = get_graph_from_diffbot(graph, chunkId_chunkDoc_list)

    elif model == "OpenAI GPT 3.5":
        model_version = "gpt-3.5-turbo-16k"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunkId_chunkDoc_list)

    elif model == "OpenAI GPT 4":
        model_version = "gpt-4-0125-preview"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunkId_chunkDoc_list)
    
    elif model == "Gemini Pro" :
        model_version = "gemini-1.0-pro"
        graph_documents = get_graph_from_Gemini(model_version, graph, chunkId_chunkDoc_list)

    logging.info(f"graph_documents = {len(graph_documents)}")
    return graph_documents
