# from langchain_community.document_loaders import WebBaseLoader
from langchain_core.documents import Document
import requests
from bs4 import BeautifulSoup
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

def get_documents_from_web_page(source_url: str):
    """
    Loads documents from a web page for a given URL.

    Args:
        source_url (str): The URL of the web page.

    Returns:
        list: List of Document objects.

    Raises:
        LLMGraphBuilderException: If loading the web page fails.
    """
    try:
        if not source_url.startswith(('http://', 'https://')):
            source_url = 'https://' + source_url
        response = requests.get(source_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        return [Document(page_content=text, metadata={"source": source_url})]
    except Exception as exc:
        raise LLMGraphBuilderException(str(exc)) from exc
