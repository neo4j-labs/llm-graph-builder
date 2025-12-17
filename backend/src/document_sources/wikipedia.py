import logging
from langchain_community.document_loaders import WikipediaLoader
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

def get_documents_from_Wikipedia(wiki_query:str, language:str):
  try:
    pages = WikipediaLoader(query=wiki_query.strip(), lang=language, load_all_available_meta=False,doc_content_chars_max=100000,load_max_docs=1).load()
    file_name = wiki_query.strip()
    logging.info(f"Total Pages from Wikipedia = {len(pages)}") 
    return file_name, pages
  except Exception as e:
    message="Failed To Process Wikipedia Query"
    error_message = str(e)
    logging.exception(f'Failed To Process Wikipedia Query, Exception Stack trace: {error_message}')
    raise LLMGraphBuilderException(error_message+' '+message)
  