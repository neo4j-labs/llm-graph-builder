from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from src.diffbot_transformer import get_graph_from_diffbot
from src.openAI_llm import get_graph_from_OpenAI
from src.gemini_llm import get_graph_from_Gemini
from typing import List
import logging

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(model: str, graph: Neo4jGraph, lst_chunks: List):
    if model == "Diffbot":
        graph_documents = get_graph_from_diffbot(graph, lst_chunks)

    elif model == "OpenAI GPT 3.5":
        model_version = "gpt-3.5-turbo-16k"
        graph_documents_chunk_chunk_Id = get_graph_from_OpenAI(model_version, graph, lst_chunks)

    elif model == "OpenAI GPT 4":
        model_version = "gpt-4-0125-preview"
        graph_documents_chunk_chunk_Id = get_graph_from_OpenAI(model_version, graph, lst_chunks)
    
    elif model == "Gemini Pro" :
        model_version = "gemini-1.0-pro"
        graph_documents_chunk_chunk_Id = get_graph_from_Gemini(model_version, graph, lst_chunks)

    logging.info(f"graph_documents = {len(graph_documents_chunk_chunk_Id)}")
    return graph_documents_chunk_chunk_Id
