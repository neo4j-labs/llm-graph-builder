import os
import logging
from enum import Enum
from dotenv import load_dotenv
from langchain.docstore.document import Document
from langchain_community.graphs import Neo4jGraph
from langchain_text_splitters import (
    TokenTextSplitter,
    CharacterTextSplitter,
    RecursiveCharacterTextSplitter,
)

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")

load_dotenv()

CHUNK_SIZE: int | None = int(os.getenv("CHUNK_SIZE"))
CHUNK_OVERLAP_SIZE: int | None = int(os.getenv("CHUNK_OVERLAP_SIZE"))
TEXT_SPLITTER: str | None = os.getenv("TEXT_SPLITTER")

# For Character Splitter
SEPERATOR = "\n\n"


class TextSplitters(Enum):
    RECURSIVE_CHARACTER_TEXT_SPLITTER = 1
    CHARACTER_TEXT_SPLITTER = 2


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

        # Defind text_splitter on basis of chosen chunking strategy
        if TEXT_SPLITTER == TextSplitters(1).name:
            logging.info("Performing RecursiveCharacterTextSplitter")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP_SIZE,
                length_function=len,
                is_separator_regex=False,
            )
        elif TEXT_SPLITTER == TextSplitters(2).name:
            logging.info("Performing CharacterTextSplitter")
            text_splitter = CharacterTextSplitter(
                separator=SEPERATOR,
                chunk_size=CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP_SIZE,
                length_function=len,
                is_separator_regex=False,
            )
        else:
            logging.info("Performing TokenTextSplitter")
            # OPENAI_API_KEY missing error is handled already
            text_splitter = TokenTextSplitter(
                chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP_SIZE
            )

        chunks = text_splitter.split_documents(self.pages)
        logging.info(f"No of chunks created from document {len(chunks)}")
        # chunks = chunks[:number_of_chunks_allowed]
        # logging.info(f'No of chunks allowed to process {len(chunks)}')
        return chunks
