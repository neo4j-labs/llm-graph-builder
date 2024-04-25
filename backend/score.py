from fastapi import FastAPI, File, UploadFile, Form
from fastapi import FastAPI
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

add_routes(app,ChatVertexAI(), path="/vertexai")

app.add_api_route("/health", health([healthy_condition, healthy]))

# @app.post("/sources")
# async def create_source_knowledge_graph(
#     uri=Form(None), userName=Form(None), password=Form(None), file: UploadFile = File(...), model=Form(),database=Form(None), 
# ):
#     """
#     Calls 'create_source_node_graph' function in a new thread to create
#     source node in Neo4jGraph when a new file is uploaded.

#     Args:
#          uri: URI of Graph Service to connect to
#          userName: Username to connect to Graph Service with ( default : None )
#          password: Password to connect to Graph Service with ( default : None )
#          file: File object containing the PDF file

#     Returns:
#          'Source' Node creation in Neo4j database
#     """
#     try:
#         result = await asyncio.to_thread(
#             create_source_node_graph_local_file, uri, userName, password, file, model, database
#         )
#         return create_api_response("Success",message="Source Node created successfully",file_source=result.file_source, file_name=result.file_name)
#     except Exception as e:
#         # obj_source_node = sourceNode()
#         job_status = "Failed"
#         message = "Unable to create source node"
#         error_message = str(e)
#         logging.error(f"Error in creating document node: {error_message}")
#         #update exception in source node
#         # obj_source_node.update_exception_db(file.filename, error_message)
#         return create_api_response(job_status, message=message,error=error_message,file_source='local file',file_name=file.filename)

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
        return create_api_response("Success",message=message,success_count=success_count,failed_count=failed_count,file_name=lst_file_name)    
    except Exception as e:
        error_message = str(e)[:80]
        message = f" Unable to create source node for source type: {source_type} and source: {source}"
        logging.exception(f'Exception Stack trace:')
        return create_api_response('Failed',message=message + error_message,error=error_message,file_source=source_type)


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
    file_name=Form(None)
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
            result = await asyncio.to_thread(
                extract_graph_from_file_local_file, graph, model, file_name)

        elif source_type == 's3 bucket' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_s3, graph, model, source_url, aws_access_key_id, aws_secret_access_key)

        elif source_type == 'youtube' and source_url:
            result = await asyncio.to_thread(
                extract_graph_from_file_youtube, graph, model, source_url)

        elif source_type == 'Wikipedia' and wiki_query:
            result = await asyncio.to_thread(
                extract_graph_from_file_Wikipedia, graph, model, wiki_query, max_sources)

        elif source_type == 'gcs bucket' and gcs_bucket_name:
            result = await asyncio.to_thread(
                extract_graph_from_file_gcs, graph, model, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename)
        else:
            return create_api_response('Failed',message='source_type is other than accepted source')
        
        return create_api_response('Success', data=result)
    except Exception as e:
        message=f" Failed To Process File:{file_name} or LLM Unable To Parse Content"
        logging.info(message)
        error_message = str(e)[:100]
        graphDb_data_Access.update_exception_db(file_name,error_message)
        logging.exception(f'Exception Stack trace: {error_message}')
        return create_api_response('Failed', message=message + error_message, error=error_message, file_name = file_name)

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
        return create_api_response('Success',message='Updated KNN Graph',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to update KNN Graph"
        error_message = str(e)
        logging.exception(f'Exception in update KNN graph:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)
        
@app.post("/chat_bot")
async def chat_bot(uri=Form(None),model=Form(None),userName=Form(None), password=Form(None), question=Form(None), session_id=Form(None)):
    try:
        result = await asyncio.to_thread(QA_RAG,uri=uri,model=model,userName=userName,password=password,question=question,session_id=session_id)
        return create_api_response('Success',data=result)
    except Exception as e:
        job_status = "Failed"
        message="Unable to get chat response"
        error_message = str(e)
        logging.exception(f'Exception in chat bot:{error_message}')
        return create_api_response(job_status, message=message, error=error_message)

@app.post("/connect")
async def connect(uri=Form(None), userName=Form(None), password=Form(None), database=Form(None)):
    try:
        graph = create_graph_database_connection(uri, userName, password, database)
        result = await asyncio.to_thread(connection_check, graph)
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
        result = await asyncio.to_thread(upload_file, graph, model, file, chunkNumber, totalChunks, originalname)
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
    
if __name__ == "__main__":
    uvicorn.run(app)
