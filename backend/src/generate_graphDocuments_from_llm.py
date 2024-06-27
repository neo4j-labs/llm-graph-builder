import logging
from typing import List

from langchain_community.graphs import Neo4jGraph

from src.openAI_llm import get_graph_from_OpenAI
from src.shared.constants import *

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


def generate_graphDocuments(
    model: str,
    graph: Neo4jGraph,
    chunkId_chunkDoc_list: List,
    allowedNodes=None,
    allowedRelationship=None,
):

    if allowedNodes is None or allowedNodes == "":
        allowedNodes = []
    else:
        allowedNodes = allowedNodes.split(",")
    if allowedRelationship is None or allowedRelationship == "":
        allowedRelationship = []
    else:
        allowedRelationship = allowedRelationship.split(",")

    logging.info(
        f"allowedNodes: {allowedNodes}, allowedRelationship: {allowedRelationship}"
    )

    graph_documents = get_graph_from_OpenAI(
        MODEL_VERSIONS[model],
        graph,
        chunkId_chunkDoc_list,
        allowedNodes,
        allowedRelationship,
    )

    logging.info(f"graph_documents = {len(graph_documents)}")
    return graph_documents
