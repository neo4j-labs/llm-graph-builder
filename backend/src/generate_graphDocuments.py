from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from src.diffbot_transformer import get_graph_from_diffbot
from src.openAI_llm import get_graph_from_OpenAI
from typing import List
import logging

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(model: str, graph: Neo4jGraph, chunks: List[Document]):
    if model == "Diffbot":
        graph_documents = get_graph_from_diffbot(graph, chunks)

    elif model == "OpenAI GPT 3.5":
        model_version = "gpt-3.5-turbo-16k"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunks)

    elif model == "OpenAI GPT 4":
        model_version = "gpt-4-0125-preview"
        graph_documents = get_graph_from_OpenAI(model_version, graph, chunks)

    logging.info(f"graph_documents = {len(graph_documents)}")
    return graph_documents
