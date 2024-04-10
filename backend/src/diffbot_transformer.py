from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from typing import List
import os
import logging
import uuid

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def get_graph_from_diffbot(graph,chunks):
    diffbot_api_key = os.environ.get('DIFFBOT_API_KEY')
    diffbot_nlp = DiffbotGraphTransformer(diffbot_api_key=diffbot_api_key)
    graph_documents = diffbot_nlp.convert_to_graph_documents(chunks)
    graph.add_graph_documents(graph_documents)
    return graph_documents

    