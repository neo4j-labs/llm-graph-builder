from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *

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


@app.post('/bucket/scan')
async def create_source_knowledge_graph(uri= Form(), userName= Form(), password= Form(),s3_url_dir=Form()):
    return create_source_node_graph_s3(uri, userName, password, s3_url_dir)

@app.post('/extract')
async def extract_knowledge_graph_from_file(uri= Form(), userName= Form(), password= Form(), model=Form(),file: UploadFile = File(None),s3_url=Form(None)):
    if file:
        return extract_graph_from_file(uri, userName, password, model,file=file,s3_url=None)
    elif s3_url:
        return extract_graph_from_file(uri, userName, password, model,s3_url=s3_url)
    else:
        return {"job_status":"Failure","error":"No file found"}
    
@app.get('/sources_list')
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
