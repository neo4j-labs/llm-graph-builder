from langchain_community.document_loaders import WebBaseLoader
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
        pages = WebBaseLoader(source_url, verify_ssl=False).load()
        return pages
    except Exception as exc:
        raise LLMGraphBuilderException(str(exc)) from exc
