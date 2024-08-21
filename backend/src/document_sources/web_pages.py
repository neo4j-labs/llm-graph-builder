import logging
from langchain_community.document_loaders import WebBaseLoader
from src.api_response import create_api_response

def get_documents_from_web_page(source_url:str):
  try:
    pages = WebBaseLoader(source_url, verify_ssl=False).load()
    file_name = pages[0].metadata['title']
    return file_name, pages
  except Exception as e:
    raise Exception(str(e))