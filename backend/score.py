from fastapi import FastAPI, File, UploadFile
import uvicorn
from fastapi import FastAPI, Depends
from fastapi_health import health

from src.pdf_kg_neo import *
def healthy_condition():
    return {"healthy": True}


def healthy():
    return True

def sick():
    return False

app = FastAPI()
app.add_api_route("/health", health([healthy_condition, healthy]))


@app.post('/predict')
# async def predict():
#     return predict(filename)
#     # return batch_predict()

async def kg_creation(file: UploadFile = File(...)):
    # file_name = file.filename.split(".")[-1] in ("pdf")
    # print(extension)
    return predict(file.file)

if __name__ == "__main__":
    uvicorn.run(app)
