import logging
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_neo4j import Neo4jGraph
from neo4j.exceptions import TransientError
from langchain_community.graphs.graph_document import GraphDocument
from typing import List
import time
from pathlib import Path

def get_chunk_and_graphDocument(graph_document_list):
    logging.info("creating list of chunks and graph documents in get_chunk_and_graphDocument func")
    lst_chunk_chunkId_document = []
    for graph_document in graph_document_list:
        for chunk_id in graph_document.source.metadata['combined_chunk_ids']:
            lst_chunk_chunkId_document.append({'graph_doc': graph_document, 'chunk_id': chunk_id})

    return lst_chunk_chunkId_document


def create_graph_database_connection(uri, userName, password, database):
    graph = Neo4jGraph(url=uri, database=database, username=userName, password=password, refresh_schema=True, sanitize=True)
    return graph


def load_embedding_model(embedding_model_name: str):
    embeddings = HuggingFaceEmbeddings(
        model_name="Qwen/Qwen3-Embedding-0.6B"  #, cache_folder="/embedding_model"
    )
    dimension = 1024
    logging.info(f"Embedding: Using Langchain HuggingFaceEmbeddings , Dimension:{dimension}")
    return embeddings, dimension


def save_graphDocuments_in_neo4j(graph: Neo4jGraph, graph_document_list: List[GraphDocument], max_retries=3, delay=1):
    retries = 0
    while retries < max_retries:
        try:
            graph.add_graph_documents(graph_document_list, baseEntityLabel=True)
            return
        except TransientError as e:
            if "DeadlockDetected" in str(e):
                retries += 1
                logging.info(f"Deadlock detected. Retrying {retries}/{max_retries} in {delay} seconds...")
                time.sleep(delay)  # Wait before retrying
            else:
                raise
    logging.error("Failed to execute query after maximum retries due to persistent deadlocks.")
    raise RuntimeError("Query execution failed after multiple retries due to deadlock.")


def handle_backticks_nodes_relationship_id_type(graph_document_list: List[GraphDocument]):
    for graph_document in graph_document_list:
        # Clean node id and types
        cleaned_nodes = []
        for node in graph_document.nodes:
            if node.type.strip() and node.id.strip():
                node.type = node.type.replace('`', '')
                cleaned_nodes.append(node)
        # Clean relationship id types and source/target node id and types
        cleaned_relationships = []
        for rel in graph_document.relationships:
            if rel.type.strip() and rel.source.id.strip() and rel.source.type.strip() and rel.target.id.strip() and rel.target.type.strip():
                rel.type = rel.type.replace('`', '')
                rel.source.type = rel.source.type.replace('`', '')
                rel.target.type = rel.target.type.replace('`', '')
                cleaned_relationships.append(rel)
        graph_document.relationships = cleaned_relationships
        graph_document.nodes = cleaned_nodes
    return graph_document_list


def execute_graph_query(graph: Neo4jGraph, query, params=None, max_retries=3, delay=2):
    retries = 0
    while retries < max_retries:
        try:
            return graph.query(query, params)
        except TransientError as e:
            if "DeadlockDetected" in str(e):
                retries += 1
                logging.info(f"Deadlock detected. Retrying {retries}/{max_retries} in {delay} seconds...")
                time.sleep(delay)  # Wait before retrying
            else:
                raise
    logging.error("Failed to execute query after maximum retries due to persistent deadlocks.")
    raise RuntimeError("Query execution failed after multiple retries due to deadlock.")


def delete_uploaded_local_file(merged_file_path, file_name):
    file_path = Path(merged_file_path)
    if file_path.exists():
        file_path.unlink()
        logging.info(f'file {file_name} deleted successfully')


def close_db_connection(graph, api_name):
    if not graph._driver._closed:
        logging.info(f"closing connection for {api_name} api")
        graph._driver.close()


def formatted_time(current_time):
    formatted_time = current_time.strftime('%Y-%m-%d %H:%M:%S %Z')
    return str(formatted_time)
