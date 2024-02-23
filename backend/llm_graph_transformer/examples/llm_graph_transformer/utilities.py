import boto3
from urllib.parse import urlparse
import logging
from langchain.text_splitter import TokenTextSplitter
from typing import List
from langchain.docstore.document import Document
    
def get_s3_files_info(s3_url,aws_access_key_id=None,aws_secret_access_key=None):
  """
  Returns the file keys along with the file sizes from s3 bucket url

  Args:
    s3_url: AWS S3 bucket url (Example- s3://<bucket-name>/<folder-name>/)
    aws_access_key_id: AWS access key id credentials ( default : None )
    aws_secret_access_ke: AWS access key id credentials ( default : None )

  Returns: 
    Dictionary of file keys and file size in the bucket directory
  """
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
         return {"status": "Failed","message": "Invalid AWS credentials"}

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
        logging.exception("An error occurred:", str(e))
        return []


def get_s3_pdf_content(s3_url,aws_access_key_id=None,aws_secret_access_key=None):
    """
    Loads and splits the PDF file using the S3DirectoryLoader by Langchain

    Args:
    s3_url: AWS S3 file url (Example- s3://<bucket-name>/<folder-name>/<file-name>)
    aws_access_key_id: AWS access key id credentials ( default : None )
    aws_secret_access_ke: AWS access key id credentials ( default : None )

    Returns: 
    List of Langchain Document object from Content of pages of the PDF file
    """

    try:
      # Extract bucket name and directory from the S3 URL
        parsed_url = urlparse(s3_url)
        bucket_name = parsed_url.netloc
      # Logging
        logging.info(f'bucket name : {bucket_name}')
        directory = parsed_url.path.lstrip('/')
      # Checking pdf files
        if directory.endswith('.pdf'):
          loader=S3DirectoryLoader(bucket_name, prefix=directory,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
          pages = loader.load_and_split()
          return pages
        else:
          return None
    
    except Exception as e:
        return None

      
def file_into_chunks(pages: List[Document]):
    """
     Split a list of documents(file pages) into chunks of fixed size.
     
     Args:
     	 pages: A list of pages to split. Each page is a list of text strings.
     
     Returns: 
     	 A list of chunks each of which is a langchain Document.
    """
    logging.info("Split file into smaller chunks")
    text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
    chunks = text_splitter.split_documents(pages)
    return chunks
  