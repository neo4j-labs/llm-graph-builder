from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *
import asyncio


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
app.add_api_route("/health", health([healthy_condition, healthy]))


@app.post("/sources")
async def create_source_knowledge_graph(
    uri=Form(), userName=Form(), password=Form(), file: UploadFile = File(...)
):
    """
    Calls 'create_source_node_graph' function in a new thread to create
    source node in Neo4jGraph when a new file is uploaded.

    Args:
         uri: URI of Graph Service to connect to
         userName: Username to connect to Graph Service with ( default : None )
         password: Password to connect to Graph Service with ( default : None )
         file: File object containing the PDF file

    Returns:
         'Source' Node creation in Neo4j database
    """
    try:
        result = await asyncio.to_thread(
            create_source_node_graph, uri, userName, password, file
        )
        return result
    except Exception as e:
        job_status = "Failure"
        error_message = str(e)
        logging.exception(f"Exception Stack trace:{e}")
        return create_api_response(job_status, error=error_message)


@app.post("/extract")
async def extract_knowledge_graph_from_file(
    uri=Form(),
    userName=Form(),
    password=Form(),
    file: UploadFile = File(...),
    model=Form(),
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
        result = await asyncio.to_thread(
            extract_graph_from_file, uri, userName, password, file, model
        )
        return result
    except Exception as e:
        job_status = "Failure"
        error_message = str(e)
        logging.exception(f"Exception Stack trace:{e}")
        return create_api_response(job_status, error=error_message)


@app.get("/sources_list")
async def get_source_list():
    """
    Calls 'get_source_list_from_graph' which returns list of sources which alreday exist in databse
    """
    try:
        result = await asyncio.to_thread(get_source_list_from_graph)
        return result
    except Exception as e:
        job_status = "Failure"
        error_message = str(e)
        logging.exception(f"Exception Stack trace:{e}")
        return create_api_response(job_status, error=error_message)


if __name__ == "__main__":
    uvicorn.run(app)
