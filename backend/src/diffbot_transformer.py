from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from typing import List
import os
import logging
import uuid
from src.shared.common_fn import get_combined_chunks

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def get_graph_from_diffbot(graph,chunkId_chunkDoc_list:List):
    combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
    diffbot_api_key = os.environ.get('DIFFBOT_API_KEY')
    diffbot_nlp = DiffbotGraphTransformer(diffbot_api_key=diffbot_api_key)
    graph_documents = diffbot_nlp.convert_to_graph_documents(combined_chunk_document_list)
    return graph_documents

    