from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *
from src.main import analyze_risk_api
from src.QA_integration import *
from src.shared.common_fn import *
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
import uvicorn
import asyncio
import base64
from langserve import add_routes
from langchain_google_vertexai import ChatVertexAI
from src.api_response import create_api_response
from src.graphDB_dataAccess import graphDBdataAccess
from src.graph_query import get_graph_results,get_chunktext_results,visualize_schema
from src.chunkid_entities import get_entities_from_chunkids
from src.post_processing import create_vector_fulltext_indexes, create_entity_embedding, graph_schema_consolidation
from sse_starlette.sse import EventSourceResponse
from src.communities import create_communities
from src.neighbours import get_neighbour_nodes
from src.risk_monitor import perform_risk_monitoring
from src.mcp_service import mcp_service
import json
from typing import List, Optional
from google.oauth2.credentials import Credentials
import os
from src.logger import CustomLogger
from datetime import datetime, timezone
import time
import gc
from Secweb.XContentTypeOptions import XContentTypeOptions
from Secweb.XFrameOptions import XFrame
from fastapi.middleware.gzip import GZipMiddleware
# from src.ragas_eval import *
from starlette.types import ASGIApp, Receive, Scope, Send
from langchain_neo4j import Neo4jGraph
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
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

def healthy_condition():
    output = {"healthy": True}
    return output

def healthy():
    return True

def sick():
    return False
class CustomGZipMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        paths: List[str],
        minimum_size: int = 1000,
        compresslevel: int = 5
    ):
        self.app = app
        self.paths = paths
        self.minimum_size = minimum_size
        self.compresslevel = compresslevel
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
 
        path = scope["path"]
        should_compress = any(path.startswith(gzip_path) for gzip_path in self.paths)
        
        if not should_compress:
            return await self.app(scope, receive, send)
        
        gzip_middleware = GZipMiddleware(
            app=self.app,
            minimum_size=self.minimum_size,
            compresslevel=self.compresslevel
        )
        await gzip_middleware(scope, receive, send)
app = FastAPI()
app.add_middleware(XContentTypeOptions)
app.add_middleware(XFrame, Option={'X-Frame-Options': 'DENY'})
app.add_middleware(CustomGZipMiddleware, minimum_size=1000, compresslevel=5,paths=["/sources_list","/url/scan","/extract","/chat_bot","/chunk_entities","/get_neighbours","/graph_query","/schema","/populate_graph_schema","/get_unconnected_nodes_list","/get_duplicate_nodes","/fetch_chunktext","/schema_visualization","/search_nodes","/get_subgraph","/search_and_get_subgraph","/diagnose_entities"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.urandom(24))

is_gemini_enabled = os.environ.get("GEMINI_ENABLED", "False").lower() in ("true", "1", "yes")
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
    model=Form(),
    gcs_bucket_name=Form(None),
    gcs_bucket_folder=Form(None),
    source_type=Form(None),
    gcs_project_id=Form(None),
    access_token=Form(None),
    email=Form(None)
    ):
    
    try:
        start = time.time()
        if source_url is not None:
            source = source_url
        else:
            source = wiki_query
            
        graph = create_graph_database_connection(uri, userName, password, database)
        if source_type == 's3 bucket' and aws_access_key_id and aws_secret_access_key:
            lst_file_name,success_count,failed_count = await asyncio.to_thread(create_source_node_graph_url_s3,graph, model, source_url, aws_access_key_id, aws_secret_access_key, source_type
            )
        elif source_type == 'gcs bucket':
            lst_file_name,success_count,failed_count = create_source_node_graph_url_gcs(graph, model, gcs_project_id, gcs_bucket_name, gcs_bucket_folder, source_type,Credentials(access_token)
            )
        elif source_type == 'web-url':
            lst_file_name,success_count,failed_count = await asyncio.to_thread(create_source_node_graph_web_url,graph, model, source_url, source_type
            )  
        elif source_type == 'youtube':
            lst_file_name,success_count,failed_count = await asyncio.to_thread(create_source_node_graph_url_youtube,graph, model, source_url, source_type
            )
        elif source_type == 'Wikipedia':
            lst_file_name,success_count,failed_count = await asyncio.to_thread(create_source_node_graph_url_wikipedia,graph, model, wiki_query, source_type
            )
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')

        message = f"Source Node created successfully for source type: {source_type} and source: {source}"
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'url_scan','db_url':uri,'url_scanned_file':lst_file_name, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','userName':userName, 'database':database, 'aws_access_key_id':aws_access_key_id,
                            'model':model, 'gcs_bucket_name':gcs_bucket_name, 'gcs_bucket_folder':gcs_bucket_folder, 'source_type':source_type,
                            'gcs_project_id':gcs_project_id, 'logging_time': formatted_time(datetime.now(timezone.utc)),'email':email}
        logger.log_struct(json_obj, "INFO")
        result ={'elapsed_api_time' : f'{elapsed_time:.2f}'}
        return create_api_response("Success",message=message,success_count=success_count,failed_count=failed_count,file_name=lst_file_name,data=result)
    except LLMGraphBuilderException as e:
        error_message = str(e)
        message = f" Unable to create source node for source type: {source_type} and source: {source}"
        # Set the status "Success" becuase we are treating these error already handled by application as like custom errors.
        json_obj = {'error_message':error_message, 'status':'Success','db_url':uri, 'userName':userName, 'database':database,'success_count':1, 'source_type': source_type, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc)),'email':email}
        logger.log_struct(json_obj, "INFO")
        logging.exception(f'File Failed in upload: {e}')
        return create_api_response('Failed',message=message + error_message[:80],error=error_message,file_source=source_type)
    except Exception as e:
        error_message = str(e)
        message = f" Unable to create source node for source type: {source_type} and source: {source}"
        json_obj = {'error_message':error_message, 'status':'Failed','db_url':uri, 'userName':userName, 'database':database,'failed_count':1, 'source_type': source_type, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc)),'email':email}
        logger.log_struct(json_obj, "ERROR")
        logging.exception(f'Exception Stack trace upload:{e}')
        return create_api_response('Failed',message=message + error_message[:80],error=error_message,file_source=source_type)
    finally:
        gc.collect()

@app.post("/extract")
async def extract_knowledge_graph_from_file(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    model=Form(),
    database=Form(None),
    source_url=Form(None),
    aws_access_key_id=Form(None),
    aws_secret_access_key=Form(None),
    wiki_query=Form(None),
    gcs_project_id=Form(None),
    gcs_bucket_name=Form(None),
    gcs_bucket_folder=Form(None),
    gcs_blob_filename=Form(None),
    source_type=Form(None),
    file_name=Form(None),
    allowedNodes=Form(None),
    allowedRelationship=Form(None),
    token_chunk_size: Optional[int] = Form(None),
    chunk_overlap: Optional[int] = Form(None),
    chunks_to_combine: Optional[int] = Form(None),
    language=Form(None),
    access_token=Form(None),
    retry_condition=Form(None),
    additional_instructions=Form(None),
    email=Form(None)
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
        graphDb_data_Access = graphDBdataAccess(graph)
        if source_type == 'local file':
            file_name = sanitize_filename(file_name)
            merged_file_path = validate_file_path(MERGED_DIR, file_name)
            uri_latency, result = await extract_graph_from_file_local_file(uri, userName, password, database, model, merged_file_path, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)

        elif source_type == 's3 bucket' and source_url:
            uri_latency, result = await extract_graph_from_file_s3(uri, userName, password, database, model, source_url, aws_access_key_id, aws_secret_access_key, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)
        
        elif source_type == 'web-url':
            uri_latency, result = await extract_graph_from_web_page(uri, userName, password, database, model, source_url, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)

        elif source_type == 'youtube' and source_url:
            uri_latency, result = await extract_graph_from_file_youtube(uri, userName, password, database, model, source_url, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)

        elif source_type == 'Wikipedia' and wiki_query:
            uri_latency, result = await extract_graph_from_file_Wikipedia(uri, userName, password, database, model, wiki_query, language, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)

        elif source_type == 'gcs bucket' and gcs_bucket_name:
            uri_latency, result = await extract_graph_from_file_gcs(uri, userName, password, database, model, gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, access_token, file_name, allowedNodes, allowedRelationship, token_chunk_size, chunk_overlap, chunks_to_combine, retry_condition, additional_instructions)
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')
        extract_api_time = time.time() - start_time
        if result is not None:
            logging.info("Going for counting nodes and relationships in extract")
            count_node_time = time.time()
            graph = create_graph_database_connection(uri, userName, password, database)   
            graphDb_data_Access = graphDBdataAccess(graph)
            count_response = graphDb_data_Access.update_node_relationship_count(file_name)
            logging.info("Nodes and Relationship Counts updated")
            if count_response :
                result['chunkNodeCount'] = count_response[file_name].get('chunkNodeCount',"0")
                result['chunkRelCount'] =  count_response[file_name].get('chunkRelCount',"0")
                result['entityNodeCount']=  count_response[file_name].get('entityNodeCount',"0")
                result['entityEntityRelCount']=  count_response[file_name].get('entityEntityRelCount',"0")
                result['communityNodeCount']=  count_response[file_name].get('communityNodeCount',"0")
                result['communityRelCount']= count_response[file_name].get('communityRelCount',"0")
                result['nodeCount'] = count_response[file_name].get('nodeCount',"0")
                result['relationshipCount']  = count_response[file_name].get('relationshipCount',"0")
                logging.info(f"counting completed in {(time.time()-count_node_time):.2f}")
            result['db_url'] = uri
            result['api_name'] = 'extract'
            result['source_url'] = source_url
            result['wiki_query'] = wiki_query
            result['source_type'] = source_type
            result['logging_time'] = formatted_time(datetime.now(timezone.utc))
            result['elapsed_api_time'] = f'{extract_api_time:.2f}'
            result['userName'] = userName
            result['database'] = database
            result['aws_access_key_id'] = aws_access_key_id
            result['gcs_bucket_name'] = gcs_bucket_name
            result['gcs_bucket_folder'] = gcs_bucket_folder
            result['gcs_blob_filename'] = gcs_blob_filename
            result['gcs_project_id'] = gcs_project_id
            result['language'] = language
            result['retry_condition'] = retry_condition
            result['email'] = email
        logger.log_struct(result, "INFO")
        result.update(uri_latency)
        logging.info(f"extraction completed in {extract_api_time:.2f} seconds for file name {file_name}")
        
        # 🚀 AUTOMATIC SUBGRAPH MONITORING - Trigger after successful document processing
        try:
            logging.info(f"Triggering automatic subgraph monitoring after document processing: {file_name}")
            
            # Import and use SubgraphMonitor
            from src.subgraph_monitor import SubgraphMonitor
            subgraph_monitor = SubgraphMonitor()
            
            # Monitor all entities for subgraph changes with risk assessment
            monitoring_result = await subgraph_monitor.monitor_all_entities(
                neo4j_uri=uri,
                neo4j_username=userName,
                neo4j_password=password,
                neo4j_database=database,
                model=model  # Pass the model for LLM-based risk assessment
            )
            
            if monitoring_result.get("changes_detected", 0) > 0:
                logging.info(f"🚨 Subgraph changes detected: {monitoring_result['changes_detected']} entities with changes")
                # Store monitoring result for potential alert generation
                result['subgraph_monitoring'] = monitoring_result
            else:
                logging.info(f"✅ No subgraph changes detected for monitored entities")
                
        except Exception as e:
            logging.warning(f"Subgraph monitoring failed after document processing: {str(e)}")
            # Don't fail the main extraction if monitoring fails
            result['subgraph_monitoring_error'] = str(e)
        
        return create_api_response('Success', data=result, file_source= source_type)
    except LLMGraphBuilderException as e:
        error_message = str(e)
        graph = create_graph_database_connection(uri, userName, password, database)   
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.update_exception_db(file_name,error_message, retry_condition)
        if source_type == 'local file':
            failed_file_process(uri,file_name, merged_file_path)
        node_detail = graphDb_data_Access.get_current_status_document_node(file_name)
        # Set the status "Completed" in logging becuase we are treating these error already handled by application as like custom errors.
        json_obj = {'api_name':'extract','message':error_message,'file_created_at':formatted_time(node_detail[0]['created_time']),'error_message':error_message, 'file_name': file_name,'status':'Completed',
                    'db_url':uri, 'userName':userName, 'database':database,'success_count':1, 'source_type': source_type, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc)),'email':email,
                    'allowedNodes': allowedNodes, 'allowedRelationship': allowedRelationship}
        logger.log_struct(json_obj, "INFO")
        logging.exception(f'File Failed in extraction: {e}')
        return create_api_response("Failed", message = error_message, error=error_message, file_name=file_name)
    except Exception as e:
        message=f"Failed To Process File:{file_name} or LLM Unable To Parse Content "
        error_message = str(e)
        graph = create_graph_database_connection(uri, userName, password, database)   
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.update_exception_db(file_name,error_message, retry_condition)
        if source_type == 'local file':
            failed_file_process(uri,file_name, merged_file_path)
        node_detail = graphDb_data_Access.get_current_status_document_node(file_name)
        
        json_obj = {'api_name':'extract','message':message,'file_created_at':formatted_time(node_detail[0]['created_time']),'error_message':error_message, 'file_name': file_name,'status':'Failed',
                    'db_url':uri, 'userName':userName, 'database':database,'failed_count':1, 'source_type': source_type, 'source_url':source_url, 'wiki_query':wiki_query, 'logging_time': formatted_time(datetime.now(timezone.utc)),'email':email,
                    'allowedNodes': allowedNodes, 'allowedRelationship': allowedRelationship}
        logger.log_struct(json_obj, "ERROR")
        logging.exception(f'File Failed in extraction: {e}')
        return create_api_response('Failed', message=message + error_message[:100], error=error_message, file_name = file_name)
    finally:
        gc.collect()
            
@app.post("/sources_list")
async def get_source_list(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    email=Form(None)):
    """
    Calls 'get_source_list_from_graph' which returns list of sources which already exist in databse
    """
    try:
        start = time.time()
        result = await asyncio.to_thread(get_source_list_from_graph,uri,userName,password,database)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'sources_list','db_url':uri, 'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response("Success",data=result, message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        job_status = "Failed"
        message="Unable to fetch source list"
        error_message = str(e)
        logging.exception(f'Exception:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/post_processing")
async def post_processing(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None), tasks=Form(None), email=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        tasks = set(map(str.strip, json.loads(tasks)))
        api_name = 'post_processing'
        count_response = []
        start = time.time()
        if "materialize_text_chunk_similarities" in tasks:
            await asyncio.to_thread(update_graph, graph)
            api_name = 'post_processing/update_similarity_graph'
            logging.info(f'Updated KNN Graph')

        if "enable_hybrid_search_and_fulltext_search_in_bloom" in tasks:
            await asyncio.to_thread(create_vector_fulltext_indexes, uri=uri, username=userName, password=password, database=database)
            api_name = 'post_processing/enable_hybrid_search_and_fulltext_search_in_bloom'
            logging.info(f'Full Text index created')

        if os.environ.get('ENTITY_EMBEDDING','False').upper()=="TRUE" and "materialize_entity_similarities" in tasks:
            await asyncio.to_thread(create_entity_embedding, graph)
            api_name = 'post_processing/create_entity_embedding'
            logging.info(f'Entity Embeddings created')

        if "graph_schema_consolidation" in tasks :
            await asyncio.to_thread(graph_schema_consolidation, graph)
            api_name = 'post_processing/graph_schema_consolidation'
            logging.info(f'Updated nodes and relationship labels')
            
        if "enable_communities" in tasks:
            api_name = 'create_communities'
            await asyncio.to_thread(create_communities, uri, userName, password, database)  
            
            logging.info(f'created communities')
        graph = create_graph_database_connection(uri, userName, password, database)   
        graphDb_data_Access = graphDBdataAccess(graph)
        document_name = ""
        count_response = graphDb_data_Access.update_node_relationship_count(document_name)
        if count_response:
            count_response = [{"filename": filename, **counts} for filename, counts in count_response.items()]
            logging.info(f'Updated source node with community related counts')
        
        end = time.time()
        elapsed_time = end - start
        
        # 🚀 AUTOMATIC SUBGRAPH MONITORING - Trigger after post-processing completion
        try:
            logging.info(f"Triggering automatic subgraph monitoring after post-processing tasks")
            
            # Import and use SubgraphMonitor
            from src.subgraph_monitor import SubgraphMonitor
            subgraph_monitor = SubgraphMonitor()
            
            # Monitor all entities for subgraph changes
            monitoring_result = await subgraph_monitor.monitor_all_entities(
                neo4j_uri=uri,
                neo4j_username=userName,
                neo4j_password=password,
                neo4j_database=database,
                model="openai_gpt_4o"  # Default model for post-processing monitoring
            )
            
            if monitoring_result.get("changes_detected", 0) > 0:
                logging.info(f"🚨 Post-processing subgraph changes detected: {monitoring_result['changes_detected']} entities with changes")
                # Add monitoring result to response
                count_response.append({"subgraph_monitoring": monitoring_result})
            else:
                logging.info(f"✅ No subgraph changes detected after post-processing")
                
        except Exception as e:
            logging.warning(f"Post-processing subgraph monitoring failed: {str(e)}")
            # Don't fail the main post-processing if monitoring fails
            count_response.append({"subgraph_monitoring_error": str(e)})
        
        json_obj = {'api_name': api_name, 'db_url': uri, 'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj)
        return create_api_response('Success', data=count_response, message='All tasks completed successfully')
    
    except Exception as e:
        job_status = "Failed"
        error_message = str(e)
        message = f"Unable to complete tasks"
        logging.exception(f'Exception in post_processing tasks: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    
    finally:
        gc.collect()
                
@app.post("/chat_bot")
async def chat_bot(uri=Form(None),model=Form(None),userName=Form(None), password=Form(None), database=Form(None),question=Form(None), document_names=Form(None),session_id=Form(None),mode=Form(None),email=Form(None)):
    logging.info(f"QA_RAG called at {datetime.now()}")
    qa_rag_start_time = time.time()
    try:
        if mode == "graph":
            graph = Neo4jGraph( url=uri,username=userName,password=password,database=database,sanitize = True, refresh_schema=True)
        else:
            graph = create_graph_database_connection(uri, userName, password, database)
        
        graph_DB_dataAccess = graphDBdataAccess(graph)
        write_access = graph_DB_dataAccess.check_account_access(database=database)
        result = await asyncio.to_thread(QA_RAG,graph=graph,model=model,question=question,document_names=document_names,session_id=session_id,mode=mode,write_access=write_access)

        total_call_time = time.time() - qa_rag_start_time
        logging.info(f"Total Response time is  {total_call_time:.2f} seconds")
        result["info"]["response_time"] = round(total_call_time, 2)
        
        json_obj = {'api_name':'chat_bot','db_url':uri, 'userName':userName, 'database':database, 'question':question,'document_names':document_names,
                             'session_id':session_id, 'mode':mode, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{total_call_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get chat response"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message,data=mode)
    finally:
        gc.collect()

@app.post("/chunk_entities")
async def chunk_entities(uri=Form(None),userName=Form(None), password=Form(None), database=Form(None), nodedetails=Form(None),entities=Form(),mode=Form(),email=Form(None)):
    try:
        start = time.time()
        result = await asyncio.to_thread(get_entities_from_chunkids,nodedetails=nodedetails,entities=entities,mode=mode,uri=uri, username=userName, password=password, database=database)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'chunk_entities','db_url':uri, 'userName':userName, 'database':database, 'nodedetails':nodedetails,'entities':entities,
                            'mode':mode, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result,message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        job_status = "Failed"
        message="Unable to extract entities from chunk ids"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/get_neighbours")
async def get_neighbours(uri=Form(None),userName=Form(None), password=Form(None), database=Form(None), elementId=Form(None),email=Form(None)):
    try:
        start = time.time()
        result = await asyncio.to_thread(get_neighbour_nodes,uri=uri, username=userName, password=password,database=database, element_id=elementId)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'get_neighbours', 'userName':userName, 'database':database,'db_url':uri, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result,message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        job_status = "Failed"
        message="Unable to extract neighbour nodes for given element ID"
        error_message = str(e)
        logging.exception(f'Exception in get neighbours :{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/graph_query")
async def graph_query(
    uri: str = Form(None),
    database: str = Form(None),
    userName: str = Form(None),
    password: str = Form(None),
    document_names: str = Form(None),
    email=Form(None)
):
    try:
        start = time.time()
        result = await asyncio.to_thread(
            get_graph_results,
            uri=uri,
            username=userName,
            password=password,
            database=database,
            document_names=document_names
        )
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'graph_query','db_url':uri, 'userName':userName, 'database':database, 'document_names':document_names, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result,message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get graph query response"
        error_message = str(e)
        logging.exception(f'Exception in graph query: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
    

@app.post("/clear_chat_bot")
async def clear_chat_bot(uri=Form(None),userName=Form(None), password=Form(None), database=Form(None), session_id=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(clear_chat_history,graph=graph,session_id=session_id)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'clear_chat_bot', 'db_url':uri, 'userName':userName, 'database':database, 'session_id':session_id, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to clear chat History"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
            
@app.post("/connect")
async def connect(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(connection_check_and_get_vector_dimensions, graph, database)
        gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'connect','db_url':uri, 'userName':userName, 'database':database, 'count':1, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        result['elapsed_api_time'] = f'{elapsed_time:.2f}'
        result['gcs_file_cache'] = gcs_file_cache
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Connection failed to connect Neo4j database"
        error_message = str(e)
        logging.exception(f'Connection failed to connect Neo4j database:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/upload")
async def upload_large_file_into_chunks(file:UploadFile = File(...), chunkNumber=Form(None), totalChunks=Form(None), 
                                        originalname=Form(None), model=Form(None), uri=Form(None), userName=Form(None), 
                                        password=Form(None), database=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(upload_file, graph, model, file, chunkNumber, totalChunks, originalname, uri, CHUNK_DIR, MERGED_DIR)
        end = time.time()
        elapsed_time = end - start
        if int(chunkNumber) == int(totalChunks):
            json_obj = {'api_name':'upload','db_url':uri,'userName':userName, 'database':database, 'chunkNumber':chunkNumber,'totalChunks':totalChunks,
                                'original_file_name':originalname,'model':model, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
            logger.log_struct(json_obj, "INFO")
        if int(chunkNumber) == int(totalChunks):
            return create_api_response('Success',data=result, message='Source Node Created Successfully')
        else:
            return create_api_response('Success', message=result)
    except Exception as e:
        message="Unable to upload file in chunks"
        error_message = str(e)
        graph = create_graph_database_connection(uri, userName, password, database)   
        graphDb_data_Access = graphDBdataAccess(graph)
        graphDb_data_Access.update_exception_db(originalname,error_message)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')
        return create_api_response('Failed', message=message + error_message[:100], error=error_message, file_name = originalname)
    finally:
        gc.collect()
            
@app.post("/schema")
async def get_structured_schema(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),email=Form(None)):
    try:
        start = time.time()
        result = await asyncio.to_thread(get_labels_and_relationtypes, uri, userName, password, database)
        end = time.time()
        elapsed_time = end - start
        logging.info(f'Schema result from DB: {result}')
        json_obj = {'api_name':'schema','db_url':uri, 'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result,message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        message="Unable to get the labels and relationtypes from neo4j database"
        error_message = str(e)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')
        return create_api_response("Failed", message=message, error=error_message)
    finally:
        gc.collect()
            
def decode_password(pwd):
    sample_string_bytes = base64.b64decode(pwd)
    decoded_password = sample_string_bytes.decode("utf-8")
    return decoded_password

def encode_password(pwd):
    data_bytes = pwd.encode('ascii')
    encoded_pwd_bytes = base64.b64encode(data_bytes)
    return encoded_pwd_bytes

@app.get("/update_extract_status/{file_name}")
async def update_extract_status(request: Request, file_name: str, uri:str=None, userName:str=None, password:str=None, database:str=None):
    async def generate():
        status = ''
        
        if password is not None and password != "null":
            decoded_password = decode_password(password)
        else:
            decoded_password = None

        url = uri
        if url and " " in url:
            url= url.replace(" ","+")
            
        graph = create_graph_database_connection(url, userName, decoded_password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        while True:
            try:
                if await request.is_disconnected():
                    logging.info(" SSE Client disconnected")
                    break
                # get the current status of document node
                
                else:
                    result = graphDb_data_Access.get_current_status_document_node(file_name)
                    if len(result) > 0:
                        status = json.dumps({'fileName':file_name, 
                        'status':result[0]['Status'],
                        'processingTime':result[0]['processingTime'],
                        'nodeCount':result[0]['nodeCount'],
                        'relationshipCount':result[0]['relationshipCount'],
                        'model':result[0]['model'],
                        'total_chunks':result[0]['total_chunks'],
                        'fileSize':result[0]['fileSize'],
                        'processed_chunk':result[0]['processed_chunk'],
                        'fileSource':result[0]['fileSource'],
                        'chunkNodeCount' : result[0]['chunkNodeCount'],
                        'chunkRelCount' : result[0]['chunkRelCount'],
                        'entityNodeCount' : result[0]['entityNodeCount'],
                        'entityEntityRelCount' : result[0]['entityEntityRelCount'],
                        'communityNodeCount' : result[0]['communityNodeCount'],
                        'communityRelCount' : result[0]['communityRelCount']
                        })
                    yield status
            except asyncio.CancelledError:
                logging.info("SSE Connection cancelled")
    
    return EventSourceResponse(generate(),ping=60)

@app.post("/delete_document_and_entities")
async def delete_document_and_entities(uri=Form(None), 
                                       userName=Form(None), 
                                       password=Form(None), 
                                       database=Form(None), 
                                       filenames=Form(),
                                       source_types=Form(),
                                       deleteEntities=Form(),
                                       email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        files_list_size = await asyncio.to_thread(graphDb_data_Access.delete_file_from_graph, filenames, source_types, deleteEntities, MERGED_DIR, uri)
        message = f"Deleted {files_list_size} documents with entities from database"
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'delete_document_and_entities','db_url':uri, 'userName':userName, 'database':database, 'filenames':filenames,'deleteEntities':deleteEntities,
                            'source_types':source_types, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',message=message)
    except Exception as e:
        job_status = "Failed"
        message=f"Unable to delete document {filenames}"
        error_message = str(e)
        logging.exception(f'{message}:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

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
        if len(result) > 0:
            status = {'fileName':file_name, 
                'status':result[0]['Status'],
                'processingTime':result[0]['processingTime'],
                'nodeCount':result[0]['nodeCount'],
                'relationshipCount':result[0]['relationshipCount'],
                'model':result[0]['model'],
                'total_chunks':result[0]['total_chunks'],
                'fileSize':result[0]['fileSize'],
                'processed_chunk':result[0]['processed_chunk'],
                'fileSource':result[0]['fileSource'],
                'chunkNodeCount' : result[0]['chunkNodeCount'],
                'chunkRelCount' : result[0]['chunkRelCount'],
                'entityNodeCount' : result[0]['entityNodeCount'],
                'entityEntityRelCount' : result[0]['entityEntityRelCount'],
                'communityNodeCount' : result[0]['communityNodeCount'],
                'communityRelCount' : result[0]['communityRelCount']
                }
        else:
            status = {'fileName':file_name, 'status':'Failed'}
        logging.info(f'Result of document status in refresh : {result}')
        return create_api_response('Success',message="",file_name=status)
    except Exception as e:
        message=f"Unable to get the document status"
        error_message = str(e)
        logging.exception(f'{message}:{error_message}')
        return create_api_response('Failed',message=message)
    
@app.post("/cancelled_job")
async def cancelled_job(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None), filenames=Form(None), source_types=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        result = manually_cancelled_job(graph,filenames, source_types, MERGED_DIR, uri)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'cancelled_job','db_url':uri, 'userName':userName, 'database':database, 'filenames':filenames,
                            'source_types':source_types, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',message=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to cancelled the running job"
        error_message = str(e)
        logging.exception(f'Exception in cancelling the running job:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/populate_graph_schema")
async def populate_graph_schema(input_text=Form(None), model=Form(None), is_schema_description_checked=Form(None),is_local_storage=Form(None),email=Form(None)):
    try:
        start = time.time()
        result = populate_graph_schema_from_text(input_text, model, is_schema_description_checked, is_local_storage)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'populate_graph_schema', 'model':model, 'is_schema_description_checked':is_schema_description_checked, 'input_text':input_text, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get the schema from text"
        error_message = str(e)
        logging.exception(f'Exception in getting the schema from text:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/get_unconnected_nodes_list")
async def get_unconnected_nodes_list(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        nodes_list, total_nodes = graphDb_data_Access.list_unconnected_nodes()
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'get_unconnected_nodes_list','db_url':uri, 'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=nodes_list,message=total_nodes)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get the list of unconnected nodes"
        error_message = str(e)
        logging.exception(f'Exception in getting list of unconnected nodes:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/delete_unconnected_nodes")
async def delete_orphan_nodes(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),unconnected_entities_list=Form(),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result = graphDb_data_Access.delete_unconnected_nodes(unconnected_entities_list)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'delete_unconnected_nodes','db_url':uri, 'userName':userName, 'database':database,'unconnected_entities_list':unconnected_entities_list, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result,message="Unconnected entities delete successfully")
    except Exception as e:
        job_status = "Failed"
        message="Unable to delete the unconnected nodes"
        error_message = str(e)
        logging.exception(f'Exception in delete the unconnected nodes:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/get_duplicate_nodes")
async def get_duplicate_nodes(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        nodes_list, total_nodes = graphDb_data_Access.get_duplicate_nodes_list()
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'get_duplicate_nodes','db_url':uri,'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=nodes_list, message=total_nodes)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get the list of duplicate nodes"
        error_message = str(e)
        logging.exception(f'Exception in getting list of duplicate nodes:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/merge_duplicate_nodes")
async def merge_duplicate_nodes(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None),duplicate_nodes_list=Form(),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result = graphDb_data_Access.merge_duplicate_nodes(duplicate_nodes_list)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'merge_duplicate_nodes','db_url':uri, 'userName':userName, 'database':database,
                            'duplicate_nodes_list':duplicate_nodes_list, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',data=result,message="Duplicate entities merged successfully")
    except Exception as e:
        job_status = "Failed"
        message="Unable to merge the duplicate nodes"
        error_message = str(e)
        logging.exception(f'Exception in merge the duplicate nodes:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/drop_create_vector_index")
async def drop_create_vector_index(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None), isVectorIndexExist=Form(),email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        graphDb_data_Access = graphDBdataAccess(graph)
        result = graphDb_data_Access.drop_create_vector_index(isVectorIndexExist)
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'drop_create_vector_index', 'db_url':uri, 'userName':userName, 'database':database,
                            'isVectorIndexExist':isVectorIndexExist, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success',message=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to drop and re-create vector index with correct dimesion as per application configuration"
        error_message = str(e)
        logging.exception(f'Exception into drop and re-create vector index with correct dimesion as per application configuration:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()
        
@app.post("/retry_processing")
async def retry_processing(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None), file_name=Form(), retry_condition=Form(), email=Form(None)):
    try:
        start = time.time()
        graph = create_graph_database_connection(uri, userName, password, database)
        chunks = execute_graph_query(graph,QUERY_TO_GET_CHUNKS,params={"filename":file_name})
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'retry_processing', 'db_url':uri, 'userName':userName, 'database':database, 'file_name':file_name,'retry_condition':retry_condition,
                            'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}','email':email}
        logger.log_struct(json_obj, "INFO")
        if chunks[0]['text'] is None or chunks[0]['text']=="" or not chunks :
            return create_api_response('Success',message=f"Chunks are not created for the file{file_name}. Please upload again the file to re-process.",data=chunks)
        else:
            await asyncio.to_thread(set_status_retry, graph,file_name,retry_condition)
            return create_api_response('Success',message=f"Status set to Ready to Reprocess for filename : {file_name}")
    except Exception as e:
        job_status = "Failed"
        message="Unable to set status to Retry"
        error_message = str(e)
        logging.exception(f'{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()    

@app.post('/metric')
async def calculate_metric(question: str = Form(),
                           context: str = Form(),
                           answer: str = Form(),
                           model: str = Form(),
                           mode: str = Form()):
    try:
        start = time.time()
        context_list = [str(item).strip() for item in json.loads(context)] if context else []
        answer_list = [str(item).strip() for item in json.loads(answer)] if answer else []
        mode_list = [str(item).strip() for item in json.loads(mode)] if mode else []

        result = await asyncio.to_thread(
            get_ragas_metrics, question, context_list, answer_list, model
        )
        if result is None or "error" in result:
            return create_api_response(
                'Failed',
                message='Failed to calculate evaluation metrics.',
                error=result.get("error", "Ragas evaluation returned null")
            )
        data = {mode: {metric: result[metric][i] for metric in result} for i, mode in enumerate(mode_list)}
        end = time.time()
        elapsed_time = end - start
        json_obj = {'api_name':'metric', 'question':question, 'context':context, 'answer':answer, 'model':model,'mode':mode,
                            'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}'}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=data)
    except Exception as e:
        logging.exception(f"Error while calculating evaluation metrics: {e}")
        return create_api_response(
            'Failed',
            message="Error while calculating evaluation metrics",
            error=str(e)
        )
    finally:
        gc.collect()
       

@app.post('/additional_metrics')
async def calculate_additional_metrics(question: str = Form(),
                                        context: str = Form(),
                                        answer: str = Form(),
                                        reference: str = Form(),
                                        model: str = Form(),
                                        mode: str = Form(),
):
   try:
       context_list = [str(item).strip() for item in json.loads(context)] if context else []
       answer_list = [str(item).strip() for item in json.loads(answer)] if answer else []
       mode_list = [str(item).strip() for item in json.loads(mode)] if mode else []
       result = await get_additional_metrics(question, context_list,answer_list, reference, model)
       if result is None or "error" in result:
           return create_api_response(
               'Failed',
               message='Failed to calculate evaluation metrics.',
               error=result.get("error", "Ragas evaluation returned null")
           )
       data = {mode: {metric: result[i][metric] for metric in result[i]} for i, mode in enumerate(mode_list)}
       return create_api_response('Success', data=data)
   except Exception as e:
       logging.exception(f"Error while calculating evaluation metrics: {e}")
       return create_api_response(
           'Failed',
           message="Error while calculating evaluation metrics",
           error=str(e)
       )
   finally:
       gc.collect()

@app.post("/fetch_chunktext")
async def fetch_chunktext(
   uri: str = Form(None),
   database: str = Form(None),
   userName: str = Form(None),
   password: str = Form(None),
   document_name: str = Form(),
   page_no: int = Form(1),
   email=Form(None)
):
   try:
       start = time.time()
       result = await asyncio.to_thread(
           get_chunktext_results,
           uri=uri,
           username=userName,
           password=password,
           database=database,
           document_name=document_name,
           page_no=page_no
       )
       end = time.time()
       elapsed_time = end - start
       json_obj = {
           'api_name': 'fetch_chunktext',
           'db_url': uri,
           'userName': userName,
           'database': database,
           'document_name': document_name,
           'page_no': page_no,
           'logging_time': formatted_time(datetime.now(timezone.utc)),
           'elapsed_api_time': f'{elapsed_time:.2f}',
           'email': email
       }
       logger.log_struct(json_obj, "INFO")
       return create_api_response('Success', data=result, message=f"Total elapsed API time {elapsed_time:.2f}")
   except Exception as e:
       job_status = "Failed"
       message = "Unable to get chunk text response"
       error_message = str(e)
       logging.exception(f'Exception in fetch_chunktext: {error_message}')
       return create_api_response(job_status, message=message, error=error_message)
   finally:
       gc.collect()


@app.post("/backend_connection_configuration")
async def backend_connection_configuration():
    try:
        start = time.time()
        uri = os.getenv('NEO4J_URI')
        username= os.getenv('NEO4J_USERNAME')
        database= os.getenv('NEO4J_DATABASE')
        password= os.getenv('NEO4J_PASSWORD')
        gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
        if all([uri, username, database, password]):
            graph = Neo4jGraph(url=uri, username=username, password=password, database=database)
            logging.info(f'login connection status of object: {graph}')
            if graph is not None:
                graph_connection = True        
                graphDb_data_Access = graphDBdataAccess(graph)
                result = graphDb_data_Access.connection_check_and_get_vector_dimensions(database)
                result['gcs_file_cache'] = gcs_file_cache
                result['uri'] = uri
                end = time.time()
                elapsed_time = end - start
                result['api_name'] = 'backend_connection_configuration'
                result['elapsed_api_time'] = f'{elapsed_time:.2f}'
                result['graph_connection'] = f'{graph_connection}',
                result['connection_from'] = 'backendAPI'
                logger.log_struct(result, "INFO")
                return create_api_response('Success',message=f"Backend connection successful",data=result)
        else:
            graph_connection = False
            return create_api_response('Success',message=f"Backend connection is not successful",data=graph_connection)
    except Exception as e:
        graph_connection = False
        job_status = "Failed"
        message="Unable to connect backend DB"
        error_message = str(e)
        logging.exception(f'{error_message}')
        return create_api_response(job_status, message=message, error=error_message.rstrip('.') + ', or fill from the login dialog.', data=graph_connection)
    finally:
        gc.collect()
    
@app.post("/schema_visualization")
async def get_schema_visualization(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)):
    try:
        start = time.time()
        result = await asyncio.to_thread(visualize_schema,
           uri=uri,
           userName=userName,
           password=password,
           database=database)
        if result:
            logging.info("Graph schema visualization query successful")
        end = time.time()
        elapsed_time = end - start
        logging.info(f'Schema result from DB: {result}')
        json_obj = {'api_name':'schema_visualization','db_url':uri, 'userName':userName, 'database':database, 'logging_time': formatted_time(datetime.now(timezone.utc)), 'elapsed_api_time':f'{elapsed_time:.2f}'}
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result,message=f"Total elapsed API time {elapsed_time:.2f}")
    except Exception as e:
        message="Unable to get schema visualization from neo4j database"
        error_message = str(e)
        logging.info(message)
        logging.exception(f'Exception:{error_message}')
        return create_api_response("Failed", message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/search_nodes")
async def search_nodes_endpoint(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    search_term=Form(),
    node_type=Form("Person"),
    max_results=Form(50),
    prefer_vector=Form(True),
    use_hybrid=Form(True)
):
    """
    Search for nodes across all documents in the database with hybrid vector and fuzzy text search support.
    """
    try:
        start = time.time()
        result = await asyncio.to_thread(
            search_nodes_api,
            uri=uri,
            userName=userName,
            password=password,
            database=database,
            search_term=search_term,
            node_type=node_type,
            max_results=int(max_results),
            prefer_vector=str(prefer_vector).lower() == 'true',
            use_hybrid=str(use_hybrid).lower() == 'true'
        )
        end = time.time()
        elapsed_time = end - start
        json_obj = {
            'api_name': 'search_nodes',
            'db_url': uri,
            'userName': userName,
            'database': database,
            'search_term': search_term,
            'node_type': node_type,
            'max_results': max_results,
            'prefer_vector': prefer_vector,
            'use_hybrid': use_hybrid,
            'total_results': result.get('total_results', 0),
            'search_method': result.get('search_method', 'unknown'),
            'vector_available': result.get('search_metadata', {}).get('vector_available', False),
            'embedding_coverage': result.get('search_metadata', {}).get('embedding_coverage', 0),
            'logging_time': formatted_time(datetime.now(timezone.utc)),
            'elapsed_api_time': f'{elapsed_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result, message=f"Search completed in {elapsed_time:.2f}s")
    except Exception as e:
        message = "Unable to search nodes"
        error_message = str(e)
        logging.exception(f'Exception in search_nodes: {error_message}')
        return create_api_response('Failed', message=message, error=error_message)
    finally:
        gc.collect()


@app.post("/get_subgraph")
async def get_subgraph_endpoint(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    node_id=Form(),
    depth=Form(4),
    max_nodes=Form(1000)
):
    """
    Extract a subgraph from a specific node with configurable depth.
    """
    try:
        start = time.time()
        result = await asyncio.to_thread(
            get_subgraph_api,
            uri=uri,
            userName=userName,
            password=password,
            database=database,
            node_id=node_id,
            depth=int(depth),
            max_nodes=int(max_nodes)
        )
        end = time.time()
        elapsed_time = end - start
        json_obj = {
            'api_name': 'get_subgraph',
            'db_url': uri,
            'userName': userName,
            'database': database,
            'node_id': node_id,
            'depth': depth,
            'max_nodes': max_nodes,
            'nodes_count': len(result.get('nodes', [])),
            'relationships_count': len(result.get('relationships', [])),
            'logging_time': formatted_time(datetime.now(timezone.utc)),
            'elapsed_api_time': f'{elapsed_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result, message=f"Subgraph extracted in {elapsed_time:.2f}s")
    except Exception as e:
        message = "Unable to extract subgraph"
        error_message = str(e)
        logging.exception(f'Exception in get_subgraph: {error_message}')
        return create_api_response('Failed', message=message, error=error_message)
    finally:
        gc.collect()


@app.post("/search_and_get_subgraph")
async def search_and_get_subgraph_endpoint(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    search_term=Form(),
    node_type=Form("Person"),
    depth=Form(4),
    max_results=Form(10),
    extract_best_match_only=Form(True)
):
    """
    Search for nodes and extract their subgraphs in one operation.
    """
    try:
        start = time.time()
        result = await asyncio.to_thread(
            search_and_get_subgraph_api,
            uri=uri,
            userName=userName,
            password=password,
            database=database,
            search_term=search_term,
            node_type=node_type,
            depth=int(depth),
            max_results=int(max_results),
            extract_best_match_only=str(extract_best_match_only).lower() == 'true'
        )
        end = time.time()
        elapsed_time = end - start
        json_obj = {
            'api_name': 'search_and_get_subgraph',
            'db_url': uri,
            'userName': userName,
            'database': database,
            'search_term': search_term,
            'node_type': node_type,
            'depth': depth,
            'max_results': max_results,
            'extract_best_match_only': extract_best_match_only,
            'total_results': result.get('total_results', 0),
            'subgraphs_count': len(result.get('subgraphs', [])),
            'best_match': result.get('best_match', {}).get('node_name', 'None'),
            'best_match_score': result.get('best_match', {}).get('score', 'N/A'),
            'logging_time': formatted_time(datetime.now(timezone.utc)),
            'elapsed_api_time': f'{elapsed_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result, message=f"Search and subgraph extraction completed in {elapsed_time:.2f}s")
    except Exception as e:
        message = "Unable to search and extract subgraphs"
        error_message = str(e)
        logging.exception(f'Exception in search_and_get_subgraph: {error_message}')
        return create_api_response('Failed', message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/diagnose_entities")
async def diagnose_entities_endpoint(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None)
):
    """
    Diagnostic endpoint to check what entities exist in the database.
    """
    try:
        start = time.time()
        result = await asyncio.to_thread(
            diagnose_database_entities_api,
            uri=uri,
            userName=userName,
            password=password,
            database=database
        )
        end = time.time()
        elapsed_time = end - start
        json_obj = {
            'api_name': 'diagnose_entities',
            'db_url': uri,
            'userName': userName,
            'database': database,
            'total_entity_types': result.get('total_entity_types', 0),
            'total_sample_entities': result.get('total_sample_entities', 0),
            'logging_time': formatted_time(datetime.now(timezone.utc)),
            'elapsed_api_time': f'{elapsed_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result, message=f"Diagnosis completed in {elapsed_time:.2f}s")
    except Exception as e:
        message = "Unable to diagnose database entities"
        error_message = str(e)
        logging.exception(f'Exception in diagnose_entities: {error_message}')
        return create_api_response('Failed', message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/analyze_risk")
async def analyze_risk_endpoint(
    uri=Form(None),
    userName=Form(None),
    password=Form(None),
    database=Form(None),
    entity_name=Form(),
    entity_type=Form(),
    risk_indicators=Form(),  # JSON string of risk indicators
    depth=Form(4),
    max_results=Form(10)
):
    """
    Analyze research security risk of an entity based on graph data.
    """
    try:
        start = time.time()
        
        # Parse risk indicators JSON
        try:
            risk_indicators_dict = json.loads(risk_indicators)
        except json.JSONDecodeError as e:
            return create_api_response('Failed', message="Invalid risk indicators JSON format", error=str(e))
        
        result = await asyncio.to_thread(
            analyze_risk_api,
            uri=uri,
            userName=userName,
            password=password,
            database=database,
            entity_name=entity_name,
            entity_type=entity_type,
            risk_indicators=risk_indicators_dict,
            depth=int(depth),
            max_results=int(max_results)
        )
        
        end = time.time()
        elapsed_time = end - start
        
        json_obj = {
            'api_name': 'analyze_risk',
            'db_url': uri,
            'userName': userName,
            'database': database,
            'entity_name': entity_name,
            'entity_type': entity_type,
            'depth': depth,
            'max_results': max_results,
            'chunks_analyzed': result.get('analysis_metadata', {}).get('chunks_analyzed', 0),
            'subgraph_nodes': result.get('analysis_metadata', {}).get('subgraph_nodes', 0),
            'overall_score': result.get('calculation', {}).get('overallScore', 'N/A'),
            'traffic_light': result.get('finalAssessment', {}).get('trafficLight', 'N/A'),
            'logging_time': formatted_time(datetime.now(timezone.utc)),
            'elapsed_api_time': f'{elapsed_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        return create_api_response('Success', data=result, message=f"Risk analysis completed in {elapsed_time:.2f}s")
    except Exception as e:
        message = "Unable to analyze risk"
        error_message = str(e)
        logging.exception(f'Exception in analyze_risk: {error_message}')
        return create_api_response('Failed', message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/list_documents")
async def list_documents(
    uri=Form("neo4j+s://9379df68.databases.neo4j.io:7687"),
    userName=Form("neo4j"), 
    password=Form(None), 
    database=Form("neo4j")
):
    """List all available documents in the database for debugging."""
    try:
        # Database connection setup
        graph = create_graph_database_connection(uri, userName, password, database)
        
        # Query all documents
        query = """
        MATCH (d:Document)
        OPTIONAL MATCH (c:Chunk)-[:PART_OF]->(d)
        WITH d, count(c) AS chunk_count
        RETURN d.fileName AS filename, d.id AS id, d.size AS size, 
               d.created_date AS created_date, chunk_count
        ORDER BY d.created_date DESC
        LIMIT 20
        """
        
        result = graph.query(query, {})
        return create_api_response('Success', data={
            "documents": result,
            "total_count": len(result)
        })
        
    except Exception as e:
        logging.error(f"Error listing documents: {str(e)}")
        return create_api_response('Failed', message="Unable to list documents", error=str(e))

@app.post("/risk_monitor")
async def risk_monitor(
    uri=Form("neo4j+s://9379df68.databases.neo4j.io:7687"),
    userName=Form("neo4j"), 
    password=Form(None), 
    database=Form("neo4j"),
    document_name=Form("[\"Abiy Ahmed\"]"),           # JSON string of documents to monitor
    monitored_names=Form("[\"Abiy Ahmed\"]"),         # JSON string of names to monitor
    risk_indicators=Form("[\"Dual-Use Technology Exposure\", \"Direct connections with foreign military entities\"]"),         # JSON string of risk indicators
    risk_threshold=Form(0.7),          # Risk score threshold
    model=Form("openai_gpt_4.1"),               # LLM model to use
    mode=Form("graph_vector_fulltext"),
    email=Form(None)
):
    """
    Monitor a document for specific names and risk indicators.
    Returns information for creating risk alerts if any are detected.
    """
    logging.info(f"Risk monitoring called at {datetime.now()}")
    risk_monitor_start_time = time.time()
    
    try:
        # Helper function to parse JSON arrays or comma-separated strings
        def parse_list_input(input_str):
            if not input_str:
                return []
            try:
                # Try to parse as JSON first
                return json.loads(input_str)
            except json.JSONDecodeError:
                # If JSON parsing fails, treat as comma-separated string
                return [item.strip() for item in input_str.split(',') if item.strip()]
        
        # Parse inputs (handles both JSON arrays and comma-separated strings)
        document_names_list = parse_list_input(document_name)
        monitored_names_list = parse_list_input(monitored_names)
        risk_indicators_list = parse_list_input(risk_indicators)
        
        # Validate inputs
        if not document_names_list:
            return create_api_response('Failed', message="Document names are required", error="Missing document_name parameter")
        
        if not monitored_names_list and not risk_indicators_list:
            return create_api_response('Failed', message="At least one of monitored_names or risk_indicators must be provided", error="Both parameters are empty")
        
        # Database connection setup
        if mode == "graph":
            graph = Neo4jGraph(url=uri, username=userName, password=password, database=database, sanitize=True, refresh_schema=True)
        else:
            graph = create_graph_database_connection(uri, userName, password, database)
        
        # Access control
        graph_DB_dataAccess = graphDBdataAccess(graph)
        write_access = graph_DB_dataAccess.check_account_access(database=database)
        
        # Core risk monitoring for multiple documents
        all_results = []
        for doc_name in document_names_list:
            result = await asyncio.to_thread(
                perform_risk_monitoring,
                graph=graph,
                document_name=doc_name,
                monitored_names=monitored_names_list,
                risk_indicators=risk_indicators_list,
                risk_threshold=float(risk_threshold),
                model=model,
                mode=mode
            )
            logging.info(f"Risk monitoring result for {doc_name}: {result}")
            all_results.append(result)
        
        # Combine results from all documents and format for frontend
        all_alerts = []
        entities_checked = 0
        
        for result in all_results:
            if result.get("success"):
                # Collect all alerts from all documents
                all_alerts.extend(result.get("alerts", []))
                
                # Track entities checked (count unique entities from alerts)
                unique_entities = set()
                for alert in result.get("alerts", []):
                    if alert.get("entity_name") and alert.get("entity_name") != "Unknown":
                        unique_entities.add(alert.get("entity_name"))
                entities_checked += len(unique_entities)
        
        # Format response to match frontend MonitoringResult interface
        combined_result = {
            "timestamp": datetime.now().isoformat(),
            "entities_checked": entities_checked,
            "alerts": all_alerts,
            "processing_time": 0
        }
        result = combined_result
        
        # Performance tracking
        total_call_time = time.time() - risk_monitor_start_time
        logging.info(f"Total Response time is {total_call_time:.2f} seconds")
        result["processing_time"] = round(total_call_time, 2)
        
        # Structured logging
        json_obj = {
            'api_name': 'risk_monitor',
            'db_url': uri, 
            'userName': userName, 
            'database': database, 
            'document_name': document_name,
            'monitored_names_count': len(monitored_names_list),
            'risk_indicators_count': len(risk_indicators_list),
            'risk_threshold': risk_threshold,
            'model': model,
            'mode': mode, 
            'logging_time': formatted_time(datetime.now(timezone.utc)), 
            'elapsed_api_time': f'{total_call_time:.2f}',
            'email': email
        }
        logger.log_struct(json_obj, "INFO")
        
        return create_api_response('Success', data=result)
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to perform risk monitoring"
        error_message = str(e)
        logging.exception(f'Exception in risk_monitor: {error_message}')
        return create_api_response(job_status, message=message, error=error_message, data=mode)
    finally:
        gc.collect()

@app.post("/monitoring/check_entities")
async def check_monitored_entities(
    monitored_entities=Form("[]"),  # JSON string of entity names to monitor
    model=Form("openai_gpt_4o"),
    uri=Form(None),  # Neo4j connection URI
    userName=Form(None),  # Neo4j username
    password=Form(None),  # Neo4j password
    database=Form(None)  # Neo4j database
):
    """
    Enhanced risk monitoring: Check if risk has increased for monitored entities.
    This endpoint analyzes sub-graphs and generates LLM-based alerts.
    Called after each document upload/URL scan.
    """
    logging.info(f"Enhanced monitoring check called at {datetime.now()}")
    monitoring_start_time = time.time()
    
    try:
        # Parse monitored entities
        try:
            monitored_entities_list = json.loads(monitored_entities) if monitored_entities else []
        except json.JSONDecodeError as e:
            return create_api_response('Failed', message="Invalid JSON format in monitored_entities", error=str(e))
        
        # Validate inputs
        if not monitored_entities_list:
            return create_api_response('Failed', message="No monitored entities provided", error="monitored_entities parameter is empty")
        
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Setup Neo4j connection for sub-graph analysis
        graph_connection = None
        if uri and userName and password and database:
            try:
                from src.shared.common_fn import create_graph_database_connection
                graph_connection = create_graph_database_connection(uri, userName, password, database)
                logging.info(f"Neo4j connection established for enhanced monitoring")
            except Exception as e:
                logging.warning(f"Failed to establish Neo4j connection: {e}. Using basic monitoring.")
        
        # Check for risk changes with enhanced monitoring
        result = await monitoring_service.check_entity_risk_changes(monitored_entities_list, model, graph_connection)
        
        # Performance tracking
        total_call_time = time.time() - monitoring_start_time
        logging.info(f"Monitoring check response time: {total_call_time:.2f} seconds")
        
        # Add timing info to result
        if isinstance(result, dict):
            result["processing_time"] = round(total_call_time, 2)
        
        # Structured logging
        monitoring_type = "enhanced" if graph_connection else "basic"
        json_obj = {
            'api_name': 'monitoring_check_entities',
            'monitoring_type': monitoring_type,
            'monitored_entities_count': len(monitored_entities_list),
            'model': model,
            'neo4j_connected': graph_connection is not None,
            'logging_time': formatted_time(datetime.now(timezone.utc)), 
            'elapsed_api_time': f'{total_call_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        
        return create_api_response('Success', data=result)
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to check monitored entities"
        error_message = str(e)
        logging.exception(f'Exception in check_monitored_entities: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/monitoring/subgraph_monitor")
async def subgraph_monitor_entities(
    uri=Form(None),  # Neo4j connection URI
    userName=Form(None),  # Neo4j username
    password=Form(None),  # Neo4j password
    database=Form(None)  # Neo4j database
):
    """
    Automatic subgraph monitoring: Check all monitored entities for subgraph changes.
    This endpoint is designed to be called after each document upload/processing.
    """
    logging.info(f"Subgraph monitoring called at {datetime.now()}")
    monitoring_start_time = time.time()
    
    try:
        # Import and use SubgraphMonitor
        from src.subgraph_monitor import SubgraphMonitor
        subgraph_monitor = SubgraphMonitor()
        
        # Validate Neo4j connection parameters
        if not all([uri, userName, password, database]):
            return create_api_response('Failed', message="Neo4j connection parameters required", error="uri, userName, password, and database must be provided")
        
        # Monitor all entities for subgraph changes
        result = await subgraph_monitor.monitor_all_entities(
            neo4j_uri=uri,
            neo4j_username=userName,
            neo4j_password=password,
            neo4j_database=database
        )
        
        # Performance tracking
        total_call_time = time.time() - monitoring_start_time
        logging.info(f"Subgraph monitoring response time: {total_call_time:.2f} seconds")
        
        # Add timing info to result
        if isinstance(result, dict):
            result["processing_time"] = round(total_call_time, 2)
        
        # Structured logging
        json_obj = {
            'api_name': 'subgraph_monitor_entities',
            'neo4j_connected': True,
            'logging_time': formatted_time(datetime.now(timezone.utc)), 
            'elapsed_api_time': f'{total_call_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        
        return create_api_response('Success', data=result)
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to perform subgraph monitoring"
        error_message = str(e)
        logging.exception(f'Exception in subgraph_monitor_entities: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.post("/monitoring/store_entities")
async def store_monitored_entities(
    entities=Form()  # JSON string of entities to store
):
    """
    Store monitored entities in PostgreSQL database.
    This allows the system to persist monitoring configuration.
    """
    logging.info(f"Store monitored entities called at {datetime.now()}")
    store_start_time = time.time()
    
    try:
        # Parse entities JSON
        try:
            entities_list = json.loads(entities) if entities else []
        except json.JSONDecodeError as e:
            return create_api_response('Failed', message="Invalid JSON format in entities", error=str(e))
        
        # Validate inputs
        if not entities_list:
            return create_api_response('Failed', message="No entities provided", error="entities parameter is empty")
        
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Initialize schema
        monitoring_service.initialize_monitoring_schema()
        
        # Store each entity
        stored_entities = []
        for entity_data in entities_list:
            try:
                entity_id = monitoring_service.store_monitored_entity(entity_data)
                stored_entities.append({
                    "original": entity_data,
                    "stored_id": entity_id,
                    "status": "success"
                })
            except Exception as e:
                stored_entities.append({
                    "original": entity_data,
                    "stored_id": None,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Performance tracking
        total_call_time = time.time() - store_start_time
        logging.info(f"Store entities response time: {total_call_time:.2f} seconds")
        
        # Structured logging
        json_obj = {
            'api_name': 'store_monitored_entities',
            'monitored_entities_count': len(entities_list),
            'successful_stores': len([e for e in stored_entities if e['status'] == 'success']),
            'failed_stores': len([e for e in stored_entities if e['status'] == 'failed']),
            'logging_time': formatted_time(datetime.now(timezone.utc)), 
            'elapsed_api_time': f'{total_call_time:.2f}'
        }
        logger.log_struct(json_obj, "INFO")
        
        return create_api_response('Success', data={
            "entities_stored": len(stored_entities),
            "successful": len([e for e in stored_entities if e['status'] == 'success']),
            "failed": len([e for e in stored_entities if e['status'] == 'failed']),
            "results": stored_entities,
            "processing_time": round(total_call_time, 2)
        })
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to store monitored entities"
        error_message = str(e)
        logging.exception(f'Exception in store_monitored_entities: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)
    finally:
        gc.collect()

@app.get("/monitoring/entities")
async def get_monitored_entities():
    """
    Retrieve all monitored entities from PostgreSQL database.
    """
    logging.info(f"Get monitored entities called at {datetime.now()}")
    
    try:
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Get entities from database
        entities = monitoring_service.get_monitored_entities_from_db()
        
        return create_api_response('Success', data=entities)
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to retrieve monitored entities"
        error_message = str(e)
        logging.exception(f'Exception in get_monitored_entities: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.get("/monitoring/alerts")
async def get_monitoring_alerts():
    """
    Get all monitoring alerts from PostgreSQL database.
    """
    logging.info(f"Get monitoring alerts called at {datetime.now()}")
    
    try:
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Get alerts from database
        alerts = monitoring_service.get_monitoring_alerts()
        
        return create_api_response('Success', data=alerts)
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get monitoring alerts"
        error_message = str(e)
        logging.exception(f'Exception in get_monitoring_alerts: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/monitoring/alerts/{alert_id}/acknowledge")
async def acknowledge_monitoring_alert(
    alert_id: str
):
    """
    Acknowledge a monitoring alert, marking it as inactive.
    """
    logging.info(f"Acknowledge monitoring alert called at {datetime.now()}")
    
    try:
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Acknowledge alert in database
        success = monitoring_service.acknowledge_alert(int(alert_id))
        
        if success:
            return create_api_response('Success', data={"message": f"Alert {alert_id} acknowledged successfully"})
        else:
            return create_api_response('Failed', message="Alert not found or could not be acknowledged")
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to acknowledge monitoring alert"
        error_message = str(e)
        logging.exception(f'Exception in acknowledge_monitoring_alert: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.get("/monitoring/entities/{entity_id}/subgraph")
async def get_entity_subgraph(
    entity_id: str,
    uri=Form(None),  # Neo4j connection URI
    userName=Form(None),  # Neo4j username
    password=Form(None),  # Neo4j password
    database=Form(None)  # Neo4j database
):
    """
    Get subgraph information for a specific monitored entity.
    """
    logging.info(f"Get entity subgraph called at {datetime.now()}")
    
    try:
        # Import and use SubgraphMonitor
        from src.subgraph_monitor import SubgraphMonitor
        subgraph_monitor = SubgraphMonitor()
        
        # Get entity details first
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        entity = monitoring_service.get_monitored_entity_by_id(int(entity_id))
        
        if not entity:
            return create_api_response('Failed', message="Entity not found", error=f"Entity with ID {entity_id} not found")
        
        # Validate Neo4j connection parameters
        if not all([uri, userName, password, database]):
            return create_api_response('Failed', message="Neo4j connection parameters required", error="uri, userName, password, and database must be provided")
        
        # Extract subgraph for the entity
        from src.shared.common_fn import create_graph_database_connection
        graph_connection = create_graph_database_connection(uri, userName, password, database)
        
        subgraph_data = subgraph_monitor.extract_entity_subgraph(entity["name"], graph_connection)
        
        if subgraph_data:
            return create_api_response('Success', data={
                "entity": entity,
                "subgraph": subgraph_data
            })
        else:
            return create_api_response('Failed', message="Could not extract subgraph", error="No subgraph data found for entity")
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to get entity subgraph"
        error_message = str(e)
        logging.exception(f'Exception in get_entity_subgraph: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.delete("/monitoring/entities/{entity_id}")
async def remove_monitored_entity(
    entity_id: str
):
    """
    Remove a monitored entity from PostgreSQL database.
    """
    logging.info(f"Remove monitored entity called at {datetime.now()}")
    
    try:
        # Import and use MonitoringServicePG
        from src.monitoring_service_pg import MonitoringServicePG
        monitoring_service = MonitoringServicePG()
        
        # Remove entity from database
        success = monitoring_service.remove_monitored_entity(entity_id)
        
        if success:
            return create_api_response('Success', data={"message": f"Entity {entity_id} removed successfully"})
        else:
            return create_api_response('Failed', message="Entity not found or could not be removed")
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to remove monitored entity"
        error_message = str(e)
        logging.exception(f'Exception in remove_monitored_entity: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/mcp/generate_chart")
async def generate_chart_with_mcp(
    query=Form(""),  # Natural language query
    uri=Form(None),  # Neo4j URI - will use env var if not provided
    userName=Form(None),  # Neo4j username - will use env var if not provided
    password=Form(None),  # Neo4j password - will use env var if not provided
    database=Form(None),  # Neo4j database - will use env var if not provided
):
    """
    Generate charts from natural language queries using MCP Neo4j integration.
    The LLM will infer the appropriate chart type based on the query.
    
    Args:
        query: Natural language description of what data to visualize
        uri: Neo4j connection URI
        userName: Neo4j username
        password: Neo4j password
        database: Neo4j database name
    
    Returns:
        Chart data in format suitable for frontend visualization
    """
    logging.info(f"MCP chart generation called at {datetime.now()}")
    chart_start_time = time.time()
    
    try:
        # Validate required parameters
        if not query.strip():
            return create_api_response('Failed', message="Query is required", error="Missing query parameter")
        
        # Get Neo4j configuration from parameters or environment variables
        if not uri:
            uri = os.getenv("NEO4J_URI")
        if not userName:
            userName = os.getenv("NEO4J_USERNAME", "neo4j")
        if not password:
            password = os.getenv("NEO4J_PASSWORD")
        if not database:
            database = os.getenv("NEO4J_DATABASE", "neo4j")
        
        # Validate Neo4j configuration
        if not uri:
            return create_api_response('Failed', message="Neo4j URI is required", error="Missing uri parameter or NEO4J_URI environment variable")
        if not password:
            return create_api_response('Failed', message="Neo4j password is required", error="Missing password parameter or NEO4J_PASSWORD environment variable")
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return create_api_response('Failed', message="OpenAI API key is required", error="Missing OPENAI_API_KEY environment variable")
        
        
        # Neo4j configuration
        neo4j_config = {
            "uri": uri,
            "username": userName,
            "password": password,
            "database": database
        }
        
        # Start MCP server if not already running
        if not mcp_service.mcp_process or mcp_service.mcp_process.poll() is not None:
            logging.info("Starting MCP server...")
            if not await mcp_service.start_mcp_server(neo4j_config):
                return create_api_response('Failed', message="Failed to start MCP server", error="MCP server startup failed")
        
        # Process the natural language query
        logging.info(f"Processing query: {query}")
        result = await mcp_service.process_natural_language_query(
            query=query,
            openai_api_key=openai_api_key,
            model="gpt-4"  # Use default model from environment
        )
        
        if result["success"]:
            chart_end_time = time.time()
            processing_time = chart_end_time - chart_start_time
            
            response_data = {
                "chartData": result["chartData"],
                "chartConfig": result["chartConfig"], 
                "type": result.get("chartType", "bar")
            }
            
            return create_api_response(
                'Success', 
                message=f"Chart generated successfully in {processing_time:.2f} seconds",
                data=response_data
            )
        else:
            return create_api_response(
                'Failed', 
                message="Failed to generate chart",
                error=result.get("error", "Unknown error occurred")
            )
        
    except Exception as e:
        job_status = "Failed"
        message = "Unable to generate chart"
        error_message = str(e)
        logging.exception(f'Exception in generate_chart_with_mcp: {error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/mcp/stop_server")
async def stop_mcp_server():
    """
    Stop the MCP Neo4j server.
    """
    try:
        await mcp_service.stop_mcp_server()
        return create_api_response('Success', message="MCP server stopped successfully")
    except Exception as e:
        return create_api_response('Failed', message="Failed to stop MCP server", error=str(e))

if __name__ == "__main__":
    uvicorn.run(app)