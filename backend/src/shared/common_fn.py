import hashlib
import logging
import os
import re
from pathlib import Path
from typing import List

from langchain.docstore.document import Document
from langchain.embeddings import CacheBackedEmbeddings
from langchain.storage import LocalFileStore
from langchain_community.graphs import Neo4jGraph
from langchain_community.graphs.graph_document import GraphDocument
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings

# from neo4j.debug import watch

# watch("neo4j")

store = LocalFileStore("./cache/")


def get_combined_chunks(chunkId_chunkDoc_list):
    chunks_to_combine = int(os.environ.get("NUMBER_OF_CHUNKS_TO_COMBINE"))
    logging.info(f"Combining {chunks_to_combine} chunks before sending request to LLM")
    combined_chunk_document_list = []
    combined_chunks_page_content = [
        "".join(
            document["chunk_doc"].page_content
            for document in chunkId_chunkDoc_list[i : i + chunks_to_combine]
        )
        for i in range(0, len(chunkId_chunkDoc_list), chunks_to_combine)
    ]
    combined_chunks_ids = [
        [
            document["chunk_id"]
            for document in chunkId_chunkDoc_list[i : i + chunks_to_combine]
        ]
        for i in range(0, len(chunkId_chunkDoc_list), chunks_to_combine)
    ]

    for i in range(len(combined_chunks_page_content)):
        combined_chunk_document_list.append(
            Document(
                page_content=combined_chunks_page_content[i],
                metadata={"combined_chunk_ids": combined_chunks_ids[i]},
            )
        )
    return combined_chunk_document_list


def get_chunk_and_graphDocument(graph_document_list, chunkId_chunkDoc_list):
    logging.info(
        "creating list of chunks and graph documents in get_chunk_and_graphDocument func"
    )
    lst_chunk_chunkId_document = []
    for graph_document in graph_document_list:
        for chunk_id in graph_document.source.metadata["combined_chunk_ids"]:
            lst_chunk_chunkId_document.append(
                {"graph_doc": graph_document, "chunk_id": chunk_id}
            )

    return lst_chunk_chunkId_document


def create_graph_database_connection(uri, userName, password, database):
    graph = Neo4jGraph(
        url=uri,
        database=database,
        username=userName,
        password=password,
        refresh_schema=False,
        sanitize=True,
    )
    # driver_config={'user_agent':os.environ.get('NEO4J_USER_AGENT')}
    return graph


def load_embedding_model(embedding_model_name: str):
    underlying_embeddings = AzureOpenAIEmbeddings(
        azure_deployment=os.environ["EMBEDDINGS_NAME"],
    )

    store = LocalFileStore("./cache/")

    embeddings = CacheBackedEmbeddings.from_bytes_store(
        underlying_embeddings, store, namespace=underlying_embeddings.model
    )
    dimension = 1536
    logging.info(f"Embedding: Using OpenAI Embeddings , Dimension:{dimension}")

    return embeddings, dimension


def save_graphDocuments_in_neo4j(
    graph: Neo4jGraph, graph_document_list: List[GraphDocument]
):
    # graph.add_graph_documents(graph_document_list, baseEntityLabel=True)
    graph.add_graph_documents(graph_document_list)


def delete_uploaded_local_file(merged_file_path, file_name):
    file_path = Path(merged_file_path)
    if file_path.exists():
        file_path.unlink()
        logging.info(f"file {file_name} deleted successfully")


def close_db_connection(graph, api_name):
    if not graph._driver._closed:
        logging.info(f"closing connection for {api_name} api")
        # graph._driver.close()


def get_llm(model_version: str):
    """Retrieve the specified language model based on the model name."""

    llm = AzureChatOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_GPT3_ENDPOINT"],
        deployment_name=os.environ["GPT3_DEPLOYMENT_NAME"],
        api_key=os.environ["GPT3_OPENAI_API_KEY"],
        api_version=os.environ["OPENAI_API_VERSION"],
        temperature=0.4,
        max_tokens=1000,
    )

    logging.info(f"Model created - Model Version: {model_version}")
    return llm
