from langchain.document_loaders import S3DirectoryLoader
import os 
from dotenv import load_dotenv 
load_dotenv()
def s3_loader(url):
    url='s3://bucket_name/dir'
    loader = S3DirectoryLoader(
    # os.environ.get('BUCKET'), 
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"), 
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"), 
    )
    documents = loader.load()
    return documents