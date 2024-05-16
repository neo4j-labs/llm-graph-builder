from fastapi import FastAPI, File, UploadFile, Form, Query
from fastapi import FastAPI
from fastapi import FastAPI, File, UploadFile, Form
from fastapi import FastAPI, Request
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *
from src.QA_integration import *
from src.entities.user_credential import user_credential
from src.shared.common_fn import *
import uvicorn
import asyncio
import base64
from langserve import add_routes
from langchain_google_vertexai import ChatVertexAI
from src.api_response import create_api_response
from src.graphDB_dataAccess import graphDBdataAccess
from src.graph_query import get_graph_results
from sse_starlette.sse import EventSourceResponse
import json
from typing import List
from google.cloud import logging as gclogger
from src.logger import CustomLogger

logger = CustomLogger()
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

is_gemini_enabled = os.environ.get("GEMINI_ENABLED", "True").lower() in ("true", "1", "yes")
if is_gemini_enabled:
    add_routes(app,ChatVertexAI(), path="/vertexai")

app.add_api_route("/health", health([healthy_condition, healthy]))

@app.post("/url/scan")
async def create_source_knowledge_graph_url(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    source_url=Form(None),
    database=Form(None),
    aws_access_key_id=Form(None),
    aws_secret_access_key=Form(None),
    wiki_query=Form(None),
    model=Form(None),
    gcs_bucket_name=Form(None),
    gcs_bucket_folder=Form(None),
    source_type=Form(None)
    ):
    try:
        if source_url is not None:
            source = source_url
        else:
            source = wiki_query
            
        graph = create_graph_database_connection(uri, userName, password, database)
        if source_type == 's3 bucket' and aws_access_key_id and aws_secret_access_key:
            lst_file_name,success_count,failed_count = create_source_node_graph_url_s3(graph, model, source_url, aws_access_key_id, aws_secret_access_key, source_type
            )
        elif source_type == 'gcs bucket':
            lst_file_name,success_count,failed_count = create_source_node_graph_url_gcs(graph, model, gcs_bucket_name, gcs_bucket_folder, source_type
            )
        elif source_type == 'youtube':
            lst_file_name,success_count,failed_count = create_source_node_graph_url_youtube(graph, model, source_url, source_type
            )
        elif source_type == 'Wikipedia':
            lst_file_name,success_count,failed_count = create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type
            )
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')

        message = f"Source Node created successfully for source type: {source_type} and source: {source}"
        josn_obj = {'api_name':'url_scan','db_url':uri,'url_scanned_file':lst_file_name}
        logger.log_struct(josn_obj)
        return create_api_response("Success",message=message,success_count=success_count,failed_count=failed_count,file_name=lst_file_name)    
    except Exception as e:
        error_message = str(e)
        message = f" Unable to create source node for source type: {source_type} and source: {source}"
        logging.exception(f'Exception Stack trace:')
        return create_api_response('Failed',message=message + error_message[:80],error=error_message,file_source=source_type)


@app.post("/extract")
async def extract_knowledge_graph_from_file(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    model=Form(None),
    database=Form(None),
    source_url=Form(None),
    aws_access_key_id=Form(None),
    aws_secret_access_key=Form(None),
    wiki_query=Form(None),
    max_sources=Form(None),
    gcs_bucket_name=Form(None),
    gcs_bucket_folder=Form(None),
    gcs_blob_filename=Form(None),
    source_type=Form(None),
    file_name=Form(None),
    allowedNodes=Form(None),
    allowedRelationship=Form(None)
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
        if source_type == 'local file':
            merged_file_path = os.path.join(MERGED_DIR,file_name)
            logging.info(f'File path:{merged_file_path}')
            result = await asyncio.to_thread(
                extract_graph_from_file_local_file, graph, model, file_name, merged_file_path, allowedNodes, allowedRelationship)

        elif source_type == 's3 bucket' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_s3, graph, model, source_url, aws_access_key_id, aws_secret_access_key, allowedNodes, allowedRelationship)

        elif source_type == 'youtube' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_youtube, graph, model, source_url, allowedNodes, allowedRelationship)

        elif source_type == 'Wikipedia' and wiki_query:
            result = await asyncio.to_thread(
                extract_graph_from_file_Wikipedia, graph, model, wiki_query, max_sources, allowedNodes, allowedRelationship)

        elif source_type == 'gcs bucket' and gcs_bucket_name:
            result = await asyncio.to_thread(
                extract_graph_from_file_gcs, graph, model, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, allowedNodes, allowedRelationship)
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')
        result['db_url'] = uri
        result['api_name'] = 'extract'
        logger.log_struct(result)
        return create_api_response('Success', data=result, file_source= source_type)
    except Exception as e:
        message=f"Failed To Process File:{file_name} or LLM Unable To Parse Content "
        error_message = str(e)
        graphDb_data_Access.update_exception_db(file_name,error_message)
        if source_type == 'local file':
            delete_uploaded_local_file(merged_file_path, file_name)
        josn_obj = {'message':message,'error_message':error_message, 'file_name': file_name,'status':'Failed','db_url':uri,'failed_count':1, 'source_type': source_type}
        logger.log_struct(josn_obj)
        logging.exception(f'File Failed in extraction: {josn_obj}')
        return create_api_response('Failed', message=message + error_message[:100], error=error_message, file_name = file_name)

@app.get("/sources_list")
async def get_source_list(uri:str, userName:str, password:str, database:str=None):
    """
    Calls 'get_source_list_from_graph' which returns list of sources which alreday exist in databse
    """
    try:
        decoded_password = decode_password(password)
        if " " in uri:
            uri= uri.replace(" ","+")
            result = await asyncio.to_thread(get_source_list_from_graph,uri,userName,decoded_password,database)
            josn_obj = {'api_name':'sources_list','db_url':uri}
            logger.log_struct(josn_obj)
            return create_api_response("Success",data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to fetch source list"
        error_message = str(e)
        logging.exception(f'Exception:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/update_similarity_graph")
async def update_similarity_graph(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)):
    """
    Calls 'update_graph' which post the query to update the similiar nodes in the graph
    """
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(update_graph, graph)
        logging.info(f"result : {result}")
        josn_obj = {'api_name':'update_similarity_graph','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success',message='Updated KNN Graph',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to update KNN Graph"
        error_message = str(e)
        logging.exception(f'Exception in update KNN graph:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
        
@app.post("/chat_bot")
async def chat_bot(uri=Form(None),model=Form(None),userName=Form(None), password=Form(None), database=Form(None),question=Form(None), session_id=Form(None)):
    try:
        # database = "neo4j"
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(QA_RAG,graph=graph,model=model,question=question,session_id=session_id)
        josn_obj = {'api_name':'chat_bot','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get chat response"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)


@app.post("/graph_query")
async def graph_query(
    uri: str = Form(None),
    userName: str = Form(None),
    password: str = Form(None),
    query_type: str = Form(None),
    doc_limit: int = Form(None),
    document_name: str = Form(None)
):
    try:
        result = await asyncio.to_thread(
            get_graph_results,
            uri=uri,
            username=userName,
            password=password,
            query_type=query_type,
            doc_limit=doc_limit,
            document_name=document_name
        )
        josn_obj = {'api_name':'graph_query','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success', data=result)
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get graph query response"
        error_message = str(e)
        logging.exception(f'Exception in graph query: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/clear_chat_bot")
async def clear_chat_bot(uri=Form(None),userName=Form(None), password=Form(None), database=Form(None), session_id=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(clear_chat_history,graph=graph,session_id=session_id)
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to clear chat History"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
@app.post("/connect")
async def connect(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(connection_check, graph)
        josn_obj = {'api_name':'connect','db_url':uri,'status':result, 'count':1}
        logger.log_struct(josn_obj)
        return create_api_response('Success',message=result)
    except Exception as e:
        job_status = "Failed"
        message="Connection failed to connect Neo4j database"
        error_message = str(e)
        logging.exception(f'Connection failed to connect Neo4j database:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/upload")
async def upload_large_file_into_chunks(file:UploadFile = File(...), chunkNumber=Form(None), totalChunks=Form(None), 
                                        originalname=Form(None), model=Form(None), uri=Form(None), userName=Form(None), 
                                        password=Form(None), database=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(upload_file, graph, model, file, chunkNumber, totalChunks, originalname, CHUNK_DIR, MERGED_DIR)
        josn_obj = {'api_name':'upload','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success', message=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to upload large file into chunks or saving the chunks"
        error_message = str(e)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')

@app.post("/schema")
async def get_structured_schema(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(get_labels_and_relationtypes, graph)
        josn_obj = {'api_name':'schema','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success', data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get the labels and relationtypes from neo4j database"
        error_message = str(e)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')

def decode_password(pwd):
    sample_string_bytes = base64.b64decode(pwd)
    decoded_password = sample_string_bytes.decode("utf-8")
    return decoded_password

@app.get("/update_extract_status/{file_name}")
async def update_extract_status(request:Request, file_name, url, userName, password, database):
    async def generate():
        status = ''
        decoded_password = decode_password(password)
        if " " in url:
            uri= url.replace(" ","+")
        while True:
            if await request.is_disconnected():
                logging.info("Request disconnected")
                break
            #get the current status of document node
            graph = create_graph_database_connection(uri, userName, decoded_password, database)
            graphDb_data_Access = graphDBdataAccess(graph)
            result = graphDb_data_Access.get_current_status_document_node(file_name)
            if result is not None:
                status = json.dumps({'fileName':file_name, 
                'status':result[0]['Status'],
                'processingTime':result[0]['processingTime'],
                'nodeCount':result[0]['nodeCount'],
                'relationshipCount':result[0]['relationshipCount'],
                'model':result[0]['model'],
                'total_chunks':result[0]['total_chunks'],
                'total_pages':result[0]['total_pages']
                })
            else:
                status = json.dumps({'fileName':file_name, 'status':'Failed'})
            yield status
    
    return EventSourceResponse(generate(),ping=60)

@app.post("/delete_document_and_entities")
async def delete_document_and_entities(uri=Form(None), 
                                       userName=Form(None), 
                                       password=Form(None), 
                                       database=Form(None), 
                                       filenames=Form(None),
                                       source_types=Form(None),
                                       deleteEntities=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result, files_list_size = await asyncio.to_thread(graphDb_data_Access.delete_file_from_graph, filenames, source_types, deleteEntities)
        entities_count = result[0]['deletedEntities'] if 'deletedEntities' in result[0] else 0
        message = f"Deleted {files_list_size} documents with {entities_count} entities from database"
        josn_obj = {'api_name':'delete_document_and_entities','db_url':uri}
        logger.log_struct(josn_obj)
        return create_api_response('Success',message=message)
    except Exception as e:
        job_status = "Failed"
        message=f"Unable to delete document {filenames}"
        error_message = str(e)
        logging.exception(f'{message}:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.get('/document_status/{file_name}')
async def get_document_status(file_name, url, userName, password, database):
    decoded_password = decode_password(password)
   
    try:
        if " " in url:
            uri= url.replace(" ","+")
        else:
            uri=url
        graph = create_graph_database_connection(uri, userName, decoded_password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result = graphDb_data_Access.get_current_status_document_node(file_name)
        if result is not None:
            status = {'fileName':file_name, 
                'status':result[0]['Status'],
                'processingTime':result[0]['processingTime'],
                'nodeCount':result[0]['nodeCount'],
                'relationshipCount':result[0]['relationshipCount'],
                'model':result[0]['model'],
                'total_chunks':result[0]['total_chunks'],
                'total_pages':result[0]['total_pages']
                }
        else:
            status = {'fileName':file_name, 'status':'Failed'}
        return create_api_response('Success',message="",file_name=status)
    except Exception as e:
        message=f"Unable to get the document status"
        error_message = str(e)
        logging.exception(f'{message}:{error_message}')
        return create_api_response('Failed',message=message)
    
    
if __name__ == "__main__":
    uvicorn.run(app)