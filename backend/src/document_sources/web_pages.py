from langchain_community.document_loaders import WebBaseLoader
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from src.shared.common_fn import last_url_segment

def get_documents_from_web_page(source_url:str):
  try:
    pages = WebBaseLoader(source_url, verify_ssl=False).load()
    return pages
  except Exception as e:
    raise LLMGraphBuilderException(str(e))
