from langchain_text_splitters import TokenTextSplitter
from langchain.docstore.document import Document
from langchain_community.graphs import Neo4jGraph
import logging

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


class CreateChunksofDocument:
    def __init__(self, pages_content: str, graph: Neo4jGraph, file_name: str):
        self.pages_content = pages_content
        self.graph = graph
        self.file_name = file_name

    def split_file_into_chunks(self):
        """
        Split a list of documents(file pages) into chunks of fixed size.

        Args:
            pages: A list of pages to split. Each page is a list of text strings.

        Returns:
            A list of chunks each of which is a langchain Document.
        """
        logging.info("Split file into smaller chunks")
        full_document = Document(
            page_content = self.pages_content
        )
        text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
        chunks = text_splitter.split_documents([full_document])
        return chunks