from fastapi import FastAPI, File, UploadFile
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health
from fastapi.middleware.cors import CORSMiddleware
from src.main import *

def healthy_condition():
    return {"healthy": True}


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


@app.post('/extract')
async def body_kg_creation_predict_post(file: UploadFile = File(...)):
    return extract(file)

if __name__ == "__main__":
    uvicorn.run(app)
