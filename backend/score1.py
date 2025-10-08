from src.main import *
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from src.graphDB_dataAccess import graphDBdataAccess
from typing import Optional
from src.response_format import create_response
from src.QA_integration import *
from src.shared.common_fn import *
import asyncio
from src.logger import CustomLogger
from datetime import datetime, timezone
import gc
from langchain_neo4j import Neo4jGraph
from dotenv import load_dotenv

load_dotenv(override=True)

logger = CustomLogger()
CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")


def sanitize_filename(filename):
    """
   Sanitize the user-provided filename to prevent directory traversal and remove unsafe characters.
   """
    # Remove path separators and collapse redundant separators
    filename = os.path.basename(filename)
    filename = os.path.normpath(filename)
    return filename


def validate_file_path(directory, filename):
    """
   Construct the full file path and ensure it is within the specified directory.
   """
    file_path = os.path.join(directory, filename)
    abs_directory = os.path.abspath(directory)
    abs_file_path = os.path.abspath(file_path)
    # Ensure the file path starts with the intended directory path
    if not abs_file_path.startswith(abs_directory):
        raise ValueError("Invalid file path")
    return abs_file_path


# Function to extract knowledge graph from a local file
async def extract_knowledge_graph_from_file(
        uri: str = "bolt://localhost:7687",
        userName: str = "neo4j",
        password: str = "password",
        model: str = "groq_gpt-oss-120b",
        database: str = "neo4j",
        file_name: str = None,
        allowedNodes: str = None,
        allowedRelationship: str = None,
        token_chunk_size: int = 300,
        chunk_overlap: int = 20,
        chunks_to_combine: int = 3,
        retry_condition: str = "delete_entities_and_start_from_beginning",
        additional_instructions: Optional[str] = None,

):
    """
    Calls 'extract_graph_from_file' in a new thread to create Neo4jGraph from a
    PDF file based on the model.

    Args:
          uri: URI of the graph to extract
          userName: Username to use for graph creation
          password: Password to use for graph creation
          file: File object containing the PDF file
          model: Type of model to use ('Diffbot'or'OpenAI GPT')

    Returns:
          Nodes and Relations created in Neo4j databse for the pdf file
    """
    try:
        start_time = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDBdataAccess(graph)

        file_name = sanitize_filename(file_name)
        merged_file_path = validate_file_path(MERGED_DIR, file_name)
        result = await extract_graph_from_file_local_file(uri, userName, password, database, model,
                                                          merged_file_path, file_name, allowedNodes,
                                                          allowedRelationship, token_chunk_size,
                                                          chunk_overlap, chunks_to_combine,
                                                          retry_condition, additional_instructions)

        extract_api_time = time.time() - start_time

        if result is not None:
            logging.info("Going for counting nodes and relationships in extract")
            count_node_time = time.time()
            graph = create_graph_database_connection(uri, userName, password, database)
            graphDb_data_Access = graphDBdataAccess(graph)
            count_response = graphDb_data_Access.update_node_relationship_count(file_name)
            logging.info("Nodes and Relationship Counts updated")
            if count_response:
                result['chunkNodeCount'] = count_response[file_name].get('chunkNodeCount', "0")
                result['chunkRelCount'] = count_response[file_name].get('chunkRelCount', "0")
                result['entityNodeCount'] = count_response[file_name].get('entityNodeCount', "0")
                result['entityEntityRelCount'] = count_response[file_name].get('entityEntityRelCount', "0")
                result['communityNodeCount'] = count_response[file_name].get('communityNodeCount', "0")
                result['communityRelCount'] = count_response[file_name].get('communityRelCount', "0")
                result['nodeCount'] = count_response[file_name].get('nodeCount', "0")
                result['relationshipCount'] = count_response[file_name].get('relationshipCount', "0")
                logging.info(f"counting completed in {(time.time() - count_node_time):.2f}")
            result['db_url'] = uri
            result['api_name'] = 'extract'
            result['logging_time'] = formatted_time(datetime.now(timezone.utc))
            result['elapsed_api_time'] = f'{extract_api_time:.2f}'
            result['userName'] = userName
            result['database'] = database
            result['retry_condition'] = retry_condition
        logger.log_struct(result, "INFO")
        logging.info(f"extraction completed in {extract_api_time:.2f} seconds for file name {file_name}")

        return create_response('Success', data=result)


    except LLMGraphBuilderException as e:
        error_message = str(e)
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.update_exception_db(file_name, error_message, retry_condition)

        failed_file_process(uri, file_name, merged_file_path)
        node_detail = graphDb_data_Access.get_current_status_document_node(file_name)
        # Set the status "Completed" in logging becuase we are treating these error already handled by application as like custom errors.
        json_obj = {'api_name': 'extract', 'message': error_message,
                    'file_created_at': formatted_time(node_detail[0]['created_time']), 'error_message': error_message,
                    'file_name': file_name, 'status': 'Completed',
                    'db_url': uri, 'userName': userName, 'database': database, 'success_count': 1,
                    'logging_time': formatted_time(datetime.now(timezone.utc)),
                    'allowedNodes': allowedNodes, 'allowedRelationship': allowedRelationship}
        logger.log_struct(json_obj, "INFO")
        logging.exception(f'File Failed in extraction: {e}')
        return create_response("Failed", message=error_message, error=error_message, file_name=file_name)
    except Exception as e:
        message = f"Failed To Process File:{file_name} or LLM Unable To Parse Content "
        error_message = str(e)
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.update_exception_db(file_name, error_message, retry_condition)

        failed_file_process(file_name, merged_file_path)
        node_detail = graphDb_data_Access.get_current_status_document_node(file_name)

        json_obj = {'api_name': 'extract', 'message': message,
                    'file_created_at': formatted_time(node_detail[0]['created_time']), 'error_message': error_message,
                    'file_name': file_name, 'status': 'Failed',
                    'db_url': uri, 'userName': userName, 'database': database, 'failed_count': 1,
                    'logging_time': formatted_time(datetime.now(timezone.utc)),
                    'allowedNodes': allowedNodes, 'allowedRelationship': allowedRelationship}
        logger.log_struct(json_obj, "ERROR")
        logging.exception(f'File Failed in extraction: {e}')
        return create_response('Failed', message=message + error_message[:100], error=error_message,
                               file_name=file_name)
    finally:
        gc.collect()


async def chat_bot(
        uri: str = "bolt://localhost:7687",
        model: str = "groq_gpt-oss-120b",
        userName: str = "neo4j",
        password: str = "password",
        database: str = "neo4j",
        history=None,
        question: str = None,
        document_names=None,
        mode: str = "graph_vector_fulltext"
):
    logging.info(f"QA_RAG called at {datetime.now()}")
    qa_rag_start_time = time.time()
    try:
        if mode == "graph":
            graph = Neo4jGraph(url=uri, username=userName, password=password, database=database, sanitize=True,
                               refresh_schema=True)
        else:
            graph = create_graph_database_connection(uri, userName, password, database)

        result = await asyncio.to_thread(QA_RAG, graph=graph, model=model, history=history, question=question,
                                         document_names=document_names, mode=mode)

        total_call_time = time.time() - qa_rag_start_time
        logging.info(f"Success: total Response time is  {total_call_time:.2f} seconds")

        return result

    except Exception as e:
        logging.exception(f'Exception in chat bot:{str(e)}')
        return "Failed: unable to get chat response"
    finally:
        gc.collect()


def main():
    result = chat_bot(question="What does the the 1963 sting ray costs?")
    print(result)


if __name__ == "__main__":
    main()
