import logging
from langchain_community.document_loaders import WikipediaLoader
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

logger = logging.getLogger(__name__)

def get_documents_from_wikipedia(wiki_query: str, language: str):
    """
    Loads documents from Wikipedia for a given query and language.

    Args:
        wiki_query (str): The Wikipedia search query.
        language (str): The language code for Wikipedia.

    Returns:
        tuple: (file_name, list of Document objects)

    Raises:
        LLMGraphBuilderException: If the Wikipedia query fails.
    """
    try:
        pages = WikipediaLoader(
            query=wiki_query.strip(),
            lang=language,
            load_all_available_meta=False,
            doc_content_chars_max=100000,
            load_max_docs=1
        ).load()
        file_name = wiki_query.strip()
        logger.info("Total Pages from Wikipedia = %d", len(pages))
        return file_name, pages
    except Exception as exc:
        message = "Failed To Process Wikipedia Query"
        error_message = str(exc)
        logger.exception('Failed To Process Wikipedia Query, Exception Stack trace: %s', error_message)
        raise LLMGraphBuilderException(f"{error_message} {message}") from exc
