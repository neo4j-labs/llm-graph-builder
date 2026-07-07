from langchain_community.document_loaders import WebBaseLoader
import ipaddress
import socket
from urllib.parse import urlparse

from src.shared.llm_graph_builder_exception import LLMGraphBuilderException


def assert_public_http_url(source_url: str) -> str:
    parsed = urlparse(source_url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise ValueError("Invalid URL hostname")

    try:
        addr_info = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise ValueError("Unable to resolve hostname") from exc

    for _, _, _, _, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if any([
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        ]):
            raise ValueError("Access to internal or reserved network addresses is blocked")
    return source_url

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
        source_url = assert_public_http_url(source_url)
        pages = WebBaseLoader(source_url, verify_ssl=True).load()
        return pages
    except Exception as exc:
        raise LLMGraphBuilderException(str(exc)) from exc
