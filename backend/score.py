import asyncio
import base64
import json
import os
import time
from datetime import datetime

import uvicorn
from fastapi import Body, FastAPI, File, Form, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi_health import health
from langserve import add_routes
from sse_starlette.sse import EventSourceResponse
from starlette.middleware.sessions import SessionMiddleware

from src.api_response import create_api_response
from src.chunkid_entities import get_entities_from_chunkids
from src.graph_query import get_graph_results
from src.graphDB_dataAccess import graphDBdataAccess
from src.main import *
# from src.QA_integration import *
from src.QA_integration_new import *
from src.shared.common_fn import *

CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")


def healthy_condition():
    output = {"healthy": True}
    return output


def healthy():
    return True


def sick():
    return False


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

is_gemini_enabled = os.environ.get("GEMINI_ENABLED", "False").lower() in (
    "true",
    "1",
    "yes",
)

app.add_api_route("/health", health([healthy_condition, healthy]))

app.add_middleware(SessionMiddleware, secret_key=os.urandom(24))


@app.post("/extract")
async def extract_knowledge_graph_from_file(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    model=Form(None),
    database=Form(None),
    source_type=Form(None),
    file_name=Form(None),
    allowedNodes=Form(None),
    allowedRelationship=Form(None),
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
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        if source_type == "local file":
            merged_file_path = os.path.join(MERGED_DIR, file_name)
            logging.info(f"File path:{merged_file_path}")
            result = await asyncio.to_thread(
                extract_graph_from_file_local_file,
                graph,
                model,
                merged_file_path,
                file_name,
                allowedNodes,
                allowedRelationship,
                uri,
            )

        else:
            return create_api_response(
                "Failed", message="source_type is other than accepted source"
            )
        if result is not None:
            result["db_url"] = uri
            result["api_name"] = "extract"
        return create_api_response("Success", data=result, file_source=source_type)
    except Exception as e:
        message = f"Failed To Process File:{file_name} or LLM Unable To Parse Content "
        error_message = str(e)
        graphDb_data_Access.update_exception_db(file_name, error_message)
        logging.info(
            f"Deleted File Path: {merged_file_path} and Deleted File Name : {file_name}"
        )
        delete_uploaded_local_file(merged_file_path, file_name)
        josn_obj = {
            "message": message,
            "error_message": error_message,
            "file_name": file_name,
            "status": "Failed",
            "db_url": uri,
            "failed_count": 1,
            "source_type": source_type,
        }
        logging.exception(f"File Failed in extraction: {josn_obj}")
        return create_api_response(
            "Failed",
            message=message + error_message[:100],
            error=error_message,
            file_name=file_name,
        )
    finally:
        close_db_connection(graph, "extract")


@app.get("/sources_list")
async def get_source_list(uri: str, userName: str, password: str, database: str = None):
    """
    Calls 'get_source_list_from_graph' which returns list of sources which already exist in databse
    """
    try:
        decoded_password = decode_password(password)
        if " " in uri:
            uri = uri.replace(" ", "+")
        result = await asyncio.to_thread(
            get_source_list_from_graph, uri, userName, decoded_password, database
        )
        josn_obj = {"api_name": "sources_list", "db_url": uri}
        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to fetch source list"
        error_message = str(e)
        logging.exception(f"Exception:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/update_similarity_graph")
async def update_similarity_graph(
    uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)
):
    """
    Calls 'update_graph' which post the query to update the similiar nodes in the graph
    """
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        await asyncio.to_thread(update_graph, graph)

        return create_api_response("Success", message="Updated KNN Graph")
    except Exception as e:
        job_status = "Failed"
        message = "Unable to update KNN Graph"
        error_message = str(e)
        logging.exception(f"Exception in update KNN graph:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        close_db_connection(graph, "update_similarity_graph")


@app.post("/chat_bot")
async def chat_bot(
    uri=Form(None),
    model=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    question=Form(None),
    session_id=Form(None),
):
    logging.info(f"QA_RAG called at {datetime.now()}")
    qa_rag_start_time = time.time()
    try:
        # database = "neo4j"
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(
            QA_RAG, graph=graph, model=model, question=question, session_id=session_id
        )

        total_call_time = time.time() - qa_rag_start_time
        logging.info(f"Total Response time is  {total_call_time:.2f} seconds")
        result["info"]["response_time"] = round(total_call_time, 2)

        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get chat response"
        error_message = str(e)
        logging.exception(f"Exception in chat bot:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/chunk_entities")
async def chunk_entities(
    uri=Form(None), userName=Form(None), password=Form(None), chunk_ids=Form(None)
):
    try:
        logging.info(
            f"URI: {uri}, Username: {userName},password:{password}, chunk_ids: {chunk_ids}"
        )
        result = await asyncio.to_thread(
            get_entities_from_chunkids,
            uri=uri,
            username=userName,
            password=password,
            chunk_ids=chunk_ids,
        )
        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to extract entities from chunk ids"
        error_message = str(e)
        logging.exception(f"Exception in chat bot:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/graph_query")
async def graph_query(
    uri: str = Form(None),
    userName: str = Form(None),
    password: str = Form(None),
    query_type: str = Form(None),
    document_names: str = Form(None),
):
    try:
        print(document_names)
        result = await asyncio.to_thread(
            get_graph_results,
            uri=uri,
            username=userName,
            password=password,
            query_type=query_type,
            document_names=document_names,
        )
        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get graph query response"
        error_message = str(e)
        logging.exception(f"Exception in graph query: {error_message}")
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/clear_chat_bot")
async def clear_chat_bot(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    session_id=Form(None),
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(
            clear_chat_history, graph=graph, session_id=session_id
        )
        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to clear chat History"
        error_message = str(e)
        logging.exception(f"Exception in chat bot:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        close_db_connection(graph, "clear_chat_bot")


@app.post("/connect")
async def connect(
    uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(connection_check, graph)
        return create_api_response("Success", message=result)
    except Exception as e:
        job_status = "Failed"
        message = "Connection failed to connect Neo4j database"
        error_message = str(e)
        logging.exception(
            f"Connection failed to connect Neo4j database:{error_message}"
        )
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/upload")
async def upload_large_file_into_chunks(
    file: UploadFile = File(...),
    chunkNumber=Form(None),
    totalChunks=Form(None),
    originalname=Form(None),
    model=Form(None),
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(
            upload_file,
            graph,
            model,
            file,
            chunkNumber,
            totalChunks,
            originalname,
            uri,
            CHUNK_DIR,
            MERGED_DIR,
        )
        if int(chunkNumber) == int(totalChunks):
            return create_api_response(
                "Success", data=result, message="Source Node Created Successfully"
            )
        else:
            return create_api_response("Success", message=result)
    except Exception as e:
        # job_status = "Failed"
        message = "Unable to upload large file into chunks. "
        error_message = str(e)
        logging.info(message)
        logging.exception(f"Exception:{error_message}")
        return create_api_response(
            "Failed",
            message=message + error_message[:100],
            error=error_message,
            file_name=originalname,
        )
    finally:
        close_db_connection(graph, "upload")


@app.post("/schema")
async def get_structured_schema(
    uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(get_labels_and_relationtypes, graph)
        logging.info(f"Schema result from DB: {result}")
        return create_api_response("Success", data=result)
    except Exception as e:
        message = "Unable to get the labels and relationtypes from neo4j database"
        error_message = str(e)
        logging.info(message)
        logging.exception(f"Exception:{error_message}")
        return create_api_response("Failed", message=message, error=error_message)
    finally:
        close_db_connection(graph, "schema")


def decode_password(pwd):
    sample_string_bytes = base64.b64decode(pwd)
    decoded_password = sample_string_bytes.decode("utf-8")
    return decoded_password


@app.get("/update_extract_status/{file_name}")
async def update_extract_status(
    request: Request, file_name, url, userName, password, database
):
    async def generate():
        status = ""
        decoded_password = decode_password(password)
        uri = url
        if " " in url:
            uri = url.replace(" ", "+")
        while True:
            if await request.is_disconnected():
                logging.info("Request disconnected")
                break
            # get the current status of document node
            graph = create_graph_database_connection(
                uri, userName, decoded_password, database
            )
            graphDb_data_Access = graphDBdataAccess(graph)
            result = graphDb_data_Access.get_current_status_document_node(file_name)
            if result is not None:
                status = json.dumps(
                    {
                        "fileName": file_name,
                        "status": result[0]["Status"],
                        "processingTime": result[0]["processingTime"],
                        "nodeCount": result[0]["nodeCount"],
                        "relationshipCount": result[0]["relationshipCount"],
                        "model": result[0]["model"],
                        "total_chunks": result[0]["total_chunks"],
                        "total_pages": result[0]["total_pages"],
                        "fileSize": result[0]["fileSize"],
                        "processed_chunk": result[0]["processed_chunk"],
                        "fileSource": result[0]["fileSource"],
                    }
                )
            else:
                status = json.dumps({"fileName": file_name, "status": "Failed"})
            yield status

    return EventSourceResponse(generate(), ping=60)


@app.post("/delete_document_and_entities")
async def delete_document_and_entities(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    filenames=Form(None),
    source_types=Form(None),
    deleteEntities=Form(None),
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result, files_list_size = await asyncio.to_thread(
            graphDb_data_Access.delete_file_from_graph,
            filenames,
            source_types,
            deleteEntities,
            MERGED_DIR,
            uri,
        )
        entities_count = (
            result[0]["deletedEntities"] if "deletedEntities" in result[0] else 0
        )
        message = f"Deleted {files_list_size} documents with {entities_count} entities from database"
        return create_api_response("Success", message=message)
    except Exception as e:
        job_status = "Failed"
        message = f"Unable to delete document {filenames}"
        error_message = str(e)
        logging.exception(f"{message}:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        close_db_connection(graph, "delete_document_and_entities")


@app.get("/document_status/{file_name}")
async def get_document_status(file_name, url, userName, password, database):
    decoded_password = decode_password(password)

    try:
        if " " in url:
            uri = url.replace(" ", "+")
        else:
            uri = url
        graph = create_graph_database_connection(
            uri, userName, decoded_password, database
        )
        graphDb_data_Access = graphDBdataAccess(graph)
        result = graphDb_data_Access.get_current_status_document_node(file_name)
        if result is not None:
            status = {
                "fileName": file_name,
                "status": result[0]["Status"],
                "processingTime": result[0]["processingTime"],
                "nodeCount": result[0]["nodeCount"],
                "relationshipCount": result[0]["relationshipCount"],
                "model": result[0]["model"],
                "total_chunks": result[0]["total_chunks"],
                "total_pages": result[0]["total_pages"],
                "fileSize": result[0]["fileSize"],
                "processed_chunk": result[0]["processed_chunk"],
                "fileSource": result[0]["fileSource"],
            }
        else:
            status = {"fileName": file_name, "status": "Failed"}
        return create_api_response("Success", message="", file_name=status)
    except Exception as e:
        message = f"Unable to get the document status"
        error_message = str(e)
        logging.exception(f"{message}:{error_message}")
        return create_api_response("Failed", message=message)


@app.post("/cancelled_job")
async def cancelled_job(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    filenames=Form(None),
    source_types=Form(None),
):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = manually_cancelled_job(graph, filenames, source_types, MERGED_DIR, uri)

        return create_api_response("Success", message=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to cancelled the running job"
        error_message = str(e)
        logging.exception(f"Exception in cancelling the running job:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        close_db_connection(graph, "cancelled_job")


@app.post("/populate_graph_schema")
async def populate_graph_schema(
    input_text=Form(None), model=Form(None), is_schema_description_checked=Form(None)
):
    try:
        result = populate_graph_schema_from_text(
            input_text, model, is_schema_description_checked
        )
        return create_api_response("Success", data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get the schema from text"
        error_message = str(e)
        logging.exception(f"Exception in getting the schema from text:{error_message}")
        return create_api_response(job_status, message=message, error=error_message)


if __name__ == "__main__":
    uvicorn.run(app)
