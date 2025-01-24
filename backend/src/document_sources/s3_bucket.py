from langchain_community.document_loaders import S3DirectoryLoader
import logging
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
import boto3
import os
from urllib.parse import urlparse

def get_s3_files_info(s3_url,aws_access_key_id=None,aws_secret_access_key=None):
  try:
      # Extract bucket name and directory from the S3 URL
      parsed_url = urlparse(s3_url)
      bucket_name = parsed_url.netloc
      directory = parsed_url.path.lstrip('/')
      try:
        # Connect to S3
        s3 = boto3.client('s3',aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)

        # List objects in the specified directory
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=directory)
      except Exception as e:
         raise Exception("Invalid AWS credentials")
      
      files_info = []

      # Check each object for file size and type
      for obj in response.get('Contents', []):
          file_key = obj['Key']
          file_name = os.path.basename(file_key)
          logging.info(f'file_name : {file_name}  and file key : {file_key}')
          file_size = obj['Size']

          # Check if file is a PDF
          if file_name.endswith('.pdf'):
            files_info.append({'file_key': file_key, 'file_size_bytes': file_size})
            
      return files_info
  except Exception as e:
    error_message = str(e)
    logging.error(f"Error while reading files from s3: {error_message}")
    raise Exception(error_message)


def get_s3_pdf_content(s3_url,aws_access_key_id=None,aws_secret_access_key=None):
    try:
      # Extract bucket name and directory from the S3 URL
        parsed_url = urlparse(s3_url)
        bucket_name = parsed_url.netloc
        logging.info(f'bucket name : {bucket_name}')
        directory = parsed_url.path.lstrip('/')
        if directory.endswith('.pdf'):
          loader=S3DirectoryLoader(bucket_name, prefix=directory,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
          pages = loader.load_and_split()
          return pages
        else:
          return None
    
    except Exception as e:
        logging.error(f"getting error while reading content from s3 files:{e}")
        raise Exception(e)


def get_documents_from_s3(s3_url, aws_access_key_id, aws_secret_access_key):
    try:
      parsed_url = urlparse(s3_url)
      bucket = parsed_url.netloc
      file_key = parsed_url.path.lstrip('/')
      file_name=file_key.split('/')[-1]
      s3=boto3.client('s3',aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
      response=s3.head_object(Bucket=bucket,Key=file_key)
      file_size=response['ContentLength']
      
      logging.info(f'bucket : {bucket},file_name:{file_name},  file key : {file_key},  file size : {file_size}')
      pages=get_s3_pdf_content(s3_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
      return file_name,pages
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in reading content from S3:{error_message}')
      raise LLMGraphBuilderException(error_message)    