from langchain_text_splitters import TokenTextSplitter
from langchain_core.documents import Document
from langchain_neo4j import Neo4jGraph
from src.shared.common_fn import get_value_from_env
import logging
from src.document_sources.youtube import get_chunks_with_timestamps, get_calculated_timestamps
import re
import os

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


class CreateChunksofDocument:
    def __init__(self, pages: list[Document], graph: Neo4jGraph):
        self.pages = pages
        self.graph = graph

    def split_file_into_chunks(self,token_chunk_size, chunk_overlap, email):
        """
        Split a list of documents(file pages) into chunks of fixed size.

        Args:
            pages: A list of pages to split. Each page is a list of text strings.

        Returns:
            A list of chunks each of which is a langchain Document.
        """
        logging.info("Split file into smaller chunks")
        text_splitter = TokenTextSplitter(chunk_size=token_chunk_size, chunk_overlap=chunk_overlap)
        MAX_TOKEN_CHUNK_SIZE = get_value_from_env("MAX_TOKEN_CHUNK_SIZE",10000, "int")
        chunk_to_be_created = int(MAX_TOKEN_CHUNK_SIZE / token_chunk_size)
        normalized_email = (email or "").strip().lower() or None
        is_neo4j_user = bool(normalized_email and normalized_email.endswith("@neo4j.com"))
        if 'page' in self.pages[0].metadata:
            chunks = []
            for i, document in enumerate(self.pages):
                page_number = i + 1
                for chunk in text_splitter.split_documents([document]):
                    chunks.append(Document(page_content=chunk.page_content, metadata={'page_number':page_number}))
        
        elif 'length' in self.pages[0].metadata:
            if len(self.pages) == 1  or (len(self.pages) > 1 and self.pages[1].page_content.strip() == ''): 
                match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*',self.pages[0].metadata['source'])
                youtube_id=match.group(1)   
                chunks_without_time_range = text_splitter.split_documents([self.pages[0]])
                chunks = get_calculated_timestamps(chunks_without_time_range, youtube_id)
            else: 
                chunks_without_time_range = text_splitter.split_documents(self.pages)
                chunks = get_chunks_with_timestamps(chunks_without_time_range)
        else:
            logging.info("No metadata found for pages, proceeding with normal chunking")
            chunks = text_splitter.split_documents(self.pages)
        logging.info(f'Total chunks created: {len(chunks)}')
        if not is_neo4j_user and len(chunks) > chunk_to_be_created:
            chunks = chunks[:chunk_to_be_created]
            logging.info(f'Non Neo4j user - limiting chunks to {chunk_to_be_created} from {len(chunks)}')

        return chunks