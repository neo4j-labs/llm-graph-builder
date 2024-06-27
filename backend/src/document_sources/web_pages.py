import logging
from langchain_community.document_loaders import WebBaseLoader
from src.api_response import create_api_response

def get_documents_from_web_page(source_url:str):
  try:
    pages = WebBaseLoader(source_url).load()
    file_name = pages[0].metadata['title']
    return file_name, pages
  except Exception as e:
    job_status = "Failed"
    message="Failed To Process Web URL"
    error_message = str(e)
    logging.error(f"Failed To Process Web URL: {file_name}")
    logging.exception(f'Exception Stack trace: {error_message}')
    return create_api_response(job_status,message=message,error=error_message,file_name=file_name) 