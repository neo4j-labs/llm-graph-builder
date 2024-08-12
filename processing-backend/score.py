from fastapi import FastAPI, File, UploadFile, Form
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *
from src.QA_integration_new import *
from src.shared.common_fn import *
import uvicorn
import asyncio
from langserve import add_routes
from langchain_google_vertexai import ChatVertexAI
from src.api_response import create_api_response
from src.graphDB_dataAccess import graphDBdataAccess
from starlette.middleware.sessions import SessionMiddleware
import os
from src.logger import CustomLogger
from datetime import datetime, timezone
import time
import gc

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

is_gemini_enabled = os.environ.get("GEMINI_ENABLED", "False").lower() in ("true", "1", "yes")
if is_gemini_enabled:
    add_routes(app,ChatVertexAI(), path="/vertexai")

app.add_api_route("/health", health([healthy_condition, healthy]))

app.add_middleware(SessionMiddleware, secret_key=os.urandom(24))

@app.post("/upload")
async def upload_large_file_into_chunks(file:UploadFile = File(...), chunkNumber=Form(None), totalChunks=Form(None), 
                                        originalname=Form(None), model=Form(None), uri=Form(), userName=Form(), 
                                        password=Form(), database=Form()):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(upload_file, graph, model, file, chunkNumber, totalChunks, originalname, uri, CHUNK_DIR, MERGED_DIR)
        josn_obj = {'api_name':'upload','db_url':uri, 'logging_time': formatted_time(datetime.now(timezone.utc))}
        logger.log_struct(josn_obj)
        if int(chunkNumber) == int(totalChunks):
            return create_api_response('Success',data=result, message='Source Node Created Successfully')
        else:
            return create_api_response('Success', message=result)
    except Exception as e:
        # job_status = "Failed"
        message="Unable to upload large file into chunks. "
        error_message = str(e)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')
        return create_api_response('Failed', message=message + error_message[:100], error=error_message, file_name = originalname)
    finally:
        gc.collect()

@app.post("/extract")
async def extract_knowledge_graph_from_file(
    uri=Form(),
    userName=Form(),
    password=Form(),
    model=Form(),
    database=Form(),
    source_url=Form(None),
    aws_access_key_id=Form(None),
    aws_secret_access_key=Form(None),
    wiki_query=Form(None),
    max_sources=Form(None),
    gcs_project_id=Form(None),
    gcs_bucket_name=Form(None),
    gcs_bucket_folder=Form(None),
    gcs_blob_filename=Form(None),
    source_type=Form(None),
    file_name=Form(None),
    allowedNodes=Form(None),
    allowedRelationship=Form(None),
    language=Form(None),
    access_token=Form(None)
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
                extract_graph_from_file_local_file, uri, userName, password, database, model, merged_file_path, file_name, allowedNodes, allowedRelationship)

        elif source_type == 's3 bucket' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_s3, uri, userName, password, database, model, source_url, aws_access_key_id, aws_secret_access_key, allowedNodes, allowedRelationship)
        
        elif source_type == 'web-url':
            result = await asyncio.to_thread(
                extract_graph_from_web_page, uri, userName, password, database, model, source_url, allowedNodes, allowedRelationship)

        elif source_type == 'youtube' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_youtube, uri, userName, password, database, model, source_url, allowedNodes, allowedRelationship)

        elif source_type == 'Wikipedia' and wiki_query:
            result = await asyncio.to_thread(
                extract_graph_from_file_Wikipedia, uri, userName, password, database, model, wiki_query, max_sources, language, allowedNodes, allowedRelationship)

        elif source_type == 'gcs bucket' and gcs_bucket_name:
            result = await asyncio.to_thread(
                extract_graph_from_file_gcs, uri, userName, password, database, model, gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, access_token, allowedNodes, allowedRelationship)
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')
        
        if result is not None:
            result['db_url'] = uri
            result['api_name'] = 'extract'
            result['source_url'] = source_url
            result['wiki_query'] = wiki_query
            result['source_type'] = source_type
            result['logging_time'] = formatted_time(datetime.now(timezone.utc))
        logger.log_struct(result)
        return create_api_response('Success', data=result, file_source= source_type)
    except Exception as e:
        message=f"Failed To Process File:{file_name} or LLM Unable To Parse Content "
        error_message = str(e)
        graphDb_data_Access.update_exception_db(file_name,error_message)
        gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
        if source_type == 'local file':
            if gcs_file_cache == 'True':
                folder_name = create_gcs_bucket_folder_name_hashed(uri,file_name)
                copy_failed_file(BUCKET_UPLOAD, BUCKET_FAILED_FILE, folder_name, file_name)
                time.sleep(5)
                delete_file_from_gcs(BUCKET_UPLOAD,folder_name,file_name)
            else:
                logging.info(f'Deleted File Path: {merged_file_path} and Deleted File Name : {file_name}')
                delete_uploaded_local_file(merged_file_path,file_name)
        josn_obj = {'message':message,'error_message':error_message, 'file_name': file_name,'status':'Failed','db_url':uri,'failed_count':1, 'source_type': source_type, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc))}
        logger.log_struct(josn_obj)
        logging.exception(f'File Failed in extraction: {josn_obj}')
        return create_api_response('Failed', message=message + error_message[:100], error=error_message, file_name = file_name)
    finally:
        gc.collect()

@app.post("/delete_document_and_entities")
async def delete_document_and_entities(uri=Form(), 
                                       userName=Form(), 
                                       password=Form(), 
                                       database=Form(), 
                                       filenames=Form(),
                                       source_types=Form(),
                                       deleteEntities=Form()):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result, files_list_size = await asyncio.to_thread(graphDb_data_Access.delete_file_from_graph, filenames, source_types, deleteEntities, MERGED_DIR, uri)
        entities_count = result[0]['deletedEntities'] if 'deletedEntities' in result[0] else 0
        message = f"Deleted {files_list_size} documents with {entities_count} entities from database"
        josn_obj = {'api_name':'delete_document_and_entities','db_url':uri, 'logging_time': formatted_time(datetime.now(timezone.utc))}
        logger.log_struct(josn_obj)
        return create_api_response('Success',message=message)
    except Exception as e:
        job_status = "Failed"
        message=f"Unable to delete document {filenames}"
        error_message = str(e)
        logging.exception(f'{message}:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

    
@app.post("/cancelled_job")
async def cancelled_job(uri=Form(), userName=Form(), password=Form(), database=Form(), filenames=Form(None), source_types=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = manually_cancelled_job(graph,filenames, source_types, MERGED_DIR, uri)
        
        return create_api_response('Success',message=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to cancelled the running job"
        error_message = str(e)
        logging.exception(f'Exception in cancelling the running job:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

        
if __name__ == "__main__":
    uvicorn.run(app)