from langchain_community.document_loaders import WebBaseLoader
from src.shared.common_fn import last_url_segment

def get_documents_from_web_page(source_url:str):
  try:
    pages = WebBaseLoader(source_url, verify_ssl=False).load()
    try:
      file_name = pages[0].metadata['title']
    except:
      file_name = last_url_segment(source_url)
    return file_name, pages
  except Exception as e:
    raise Exception(str(e))