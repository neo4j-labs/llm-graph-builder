import logging
import re
import urllib.parse
import requests
from langchain_core.documents import Document
from requests.exceptions import JSONDecodeError
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

logger = logging.getLogger(__name__)

USER_AGENT = "llm-graph-builder/1.0"
REQUEST_TIMEOUT = (5, 20)  # (connect, read) seconds; the wikipedia lib sets no timeout and can hang on Cloud Run
MAX_CONTENT_CHARS = 100000
LANGUAGE_CODE_PATTERN = re.compile(r"[a-z]{2,3}")


def _api_get(session: requests.Session, language: str, params: dict) -> dict:
    # The language becomes part of the hostname, so only plain language codes are allowed (SSRF guard).
    language = language.strip().lower()
    if not LANGUAGE_CODE_PATTERN.fullmatch(language):
        raise LLMGraphBuilderException(f"Invalid Wikipedia language code: '{language}'")
    response = session.get(
        f"https://{language}.wikipedia.org/w/api.php",
        params={**params, "format": "json", "formatversion": 2},
        timeout=REQUEST_TIMEOUT,
        allow_redirects=False,
    )
    response.raise_for_status()
    return response.json()


def _fetch_page(session: requests.Session, language: str, title: str):
    """Fetch plain text and canonical url of a page in a single request, following redirects."""
    data = _api_get(session, language, {
        "action": "query",
        "titles": title,
        "redirects": 1,
        "prop": "extracts|info",
        "explaintext": 1,
        "inprop": "url",
    })
    pages = data.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing") or pages[0].get("invalid"):
        return None
    return pages[0]


def get_documents_from_wikipedia(wiki_query: str, language: str):
    """
    Loads documents from Wikipedia for a given query and language.

    Args:
        wiki_query (str): The Wikipedia page title (as found in the url).
        language (str): The language code for Wikipedia.

    Returns:
        tuple: (file_name, list of Document objects)

    Raises:
        LLMGraphBuilderException: If the Wikipedia query fails.
    """
    try:
        title = urllib.parse.unquote(wiki_query).replace('_', ' ')
        docs = []
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT})
            page = _fetch_page(session, language, title)
            if page is None:
                # Fall back to a search when the exact title does not exist
                search = _api_get(session, language, {
                    "action": "query", "list": "search", "srsearch": title, "srlimit": 1,
                })
                results = search.get("query", {}).get("search", [])
                if not results:
                    raise LLMGraphBuilderException(f"No Wikipedia results found for query '{wiki_query}' in language '{language}'")
                page = _fetch_page(session, language, results[0]["title"])
        if page is not None and page.get("extract"):
            docs.append(Document(
                page_content=page["extract"][:MAX_CONTENT_CHARS],
                metadata={"title": page["title"], "source": page["fullurl"]},
            ))
        else:
            logger.warning("No content returned for Wikipedia query '%s'", wiki_query)
        file_name = wiki_query.strip()
        logger.info("Total Pages from Wikipedia = %d", len(docs))
        return file_name, docs
    except LLMGraphBuilderException:
        raise
    except (JSONDecodeError, ValueError) as exc:
        message = "Wikipedia returned an invalid response, possibly due to rate limiting."
        logger.exception("Failed to process Wikipedia query: %s", str(exc))
        raise LLMGraphBuilderException(message) from exc
    except Exception as exc:
        message = "Failed To Process Wikipedia Query"
        error_message = str(exc)
        logger.exception("Failed To Process Wikipedia Query, Exception Stack trace: %s", error_message)
        raise LLMGraphBuilderException(f"{error_message} {message}") from exc
