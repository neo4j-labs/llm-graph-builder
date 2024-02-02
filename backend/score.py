from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *

def healthy_condition():
    output={"healthy": True}
    return output

def healthy():
    return True

def sick():
    return False

app = FastAPI();

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
    return create_source_node_graph(uri, userName, password, file)

@app.post('/extract')
async def extract_knowledge_graph_from_file(uri= Form(), userName= Form(), password= Form(),file: UploadFile = File(...)):
    return extract_graph_from_file(uri, userName, password, file)

@app.get('/sources_list')
async def get_source_list():
    return get_source_list_from_graph()

if __name__ == "__main__":
    uvicorn.run(app)