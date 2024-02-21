from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *
import asyncio

def healthy_condition():
    output={"healthy": True}
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

@app.post('/sources')
async def create_source_knowledge_graph(uri= Form(), userName= Form(), password= Form(),file: UploadFile = File(...)):
    result = await asyncio.to_thread(create_source_node_graph, uri, userName, password, file)
    return result

@app.post('/bucket/scan')
async def create_source_knowledge_graph(uri= Form(), userName= Form(), password= Form(),s3_url_dir=Form(),aws_access_key_id=Form(None),aws_secret_access_key=Form(None)):
    return create_source_node_graph_s3(uri, userName, password, s3_url_dir,aws_access_key_id,aws_secret_access_key)

@app.post('/extract')
async def extract_knowledge_graph_from_file(uri= Form(), userName= Form(), password= Form(),file: UploadFile = File(None), model=Form(),s3_url=Form(None),aws_access_key_id=Form(None),aws_secret_access_key=Form(None)):
    if file:
        return await asyncio.to_thread(extract_graph_from_file,uri, userName, password, model,file=file,s3_url=None)
    elif s3_url:
        return await asyncio.to_thread(extract_graph_from_file,uri, userName, password, model,s3_url=s3_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
    else:
        return {"job_status":"Failure","error":"No file found"}
    
    


@app.get('/sources_list')
async def get_source_list():
    result = await asyncio.to_thread(get_source_list_from_graph)
    return result




if __name__ == "__main__":
    uvicorn.run(app)