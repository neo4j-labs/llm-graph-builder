from typing import List
import logging
from src.llm import get_combined_chunks, get_llm

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def get_graph_from_diffbot(graph,chunkId_chunkDoc_list:List):
    combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
    llm,model_name = get_llm('diffbot')
    graph_documents = llm.convert_to_graph_documents(combined_chunk_document_list)
    return graph_documents
