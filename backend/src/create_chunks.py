from langchain_text_splitters import TokenTextSplitter
from langchain.docstore.document import Document
from langchain_community.graphs import Neo4jGraph
import logging
import os

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


class CreateChunksofDocument:
    def __init__(self, pages: list[Document], graph: Neo4jGraph, file_name: str):
        self.pages = pages
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
        # number_of_chunks_allowed = int(os.environ.get('NUMBER_OF_CHUNKS_ALLOWED'))
        text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
        chunks = text_splitter.split_documents(self.pages)
        logging.info(f'No of chunks created from document {len(chunks)}')
        # chunks = chunks[:number_of_chunks_allowed]
        # logging.info(f'No of chunks allowed to process {len(chunks)}')
        return chunks