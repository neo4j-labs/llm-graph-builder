import logging
from langchain_community.document_loaders import WikipediaLoader
from src.api_response import create_api_response

def get_documents_from_Wikipedia(wiki_query:str, language:str):
  try:
    pages = WikipediaLoader(query=wiki_query.strip(), lang=language, load_max_docs=1, load_all_available_meta=False).load()
    file_name = wiki_query.strip()
    logging.info(f"Total Pages from Wikipedia = {len(pages)}") 
    return file_name, pages
  except Exception as e:
    job_status = "Failed"
    message="Failed To Process Wikipedia Query"
    error_message = str(e)
    logging.error(f"Failed To Process Wikipedia Query: {file_name}")
    logging.exception(f'Exception Stack trace: {error_message}')
    return create_api_response(job_status,message=message,error=error_message,file_name=file_name) 