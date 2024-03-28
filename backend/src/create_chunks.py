from langchain_text_splitters import TokenTextSplitter
from langchain.docstore.document import Document
from langchain_community.graphs import Neo4jGraph
from typing import List
import logging
import hashlib

logging.basicConfig(format="%(asctime)s - %(message)s", level="INFO")


class CreateChunksofDocument:
    def __init__(self, pages: List[Document], graph: Neo4jGraph, file_name: str):
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
        full_document_content = ""
        for page in self.pages:
            full_document_content += page.page_content
        full_document = Document(
            page_content=full_document_content, metadata=self.pages[0].metadata
        )
        text_splitter = TokenTextSplitter(chunk_size=200, chunk_overlap=20)
        chunks = text_splitter.split_documents([full_document])
        self.create_relation_between_chunks(chunks)
        return chunks

    def create_relation_between_chunks(self, chunks: List[Document]):
        logging.info("creating FIRST_CHUNK and NEXT_CHUNK relationships between chunks")
        current_chunk_id = ""

        for i, chunk in enumerate(chunks):
            page_content_sha1 = hashlib.sha1(chunk.page_content.encode())
            previous_chunk_id = current_chunk_id
            current_chunk_id = page_content_sha1.hexdigest()
            position = i + 1
            if i == 0:
                firstChunk = True
            else:
                firstChunk = False
            metadata = {"position": position, "length": len(chunk.page_content)}
            chunk_document = Document(
                page_content=chunk.page_content, metadata=metadata
            )

            # create chunk nodes
            self.graph.query(
                """MERGE (:Chunk {id: $chunk_id, text: $chunk_content, position: $position, length: $length})""",
                {
                    "chunk_id": current_chunk_id,
                    "chunk_content": chunk_document.page_content,
                    "position": position,
                    "length": chunk_document.metadata["length"],
                },
            )
            #create PART_OF realtion between chunk and Document node
            self.graph.query(
                """MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
                MERGE (c)-[:PART_OF]->(d)
                """,
                {"f_name": self.file_name, "chunk_id": current_chunk_id},
            )
            # create relationships between chunks
            if firstChunk:
                self.graph.query(
                    """MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
                MERGE (d)-[:FIRST_CHUNK]->(c)
                """,
                    {"f_name": self.file_name, "chunk_id": current_chunk_id},
                )
            else:
                self.graph.query(
                    """MATCH(pc:Chunk {id : $previous_chunk_id}) ,(cc:Chunk {id : $current_chunk_id}) 
                MERGE (pc)-[:NEXT_CHUNK]->(cc)
                """,
                    {
                        "previous_chunk_id": previous_chunk_id,
                        "current_chunk_id": current_chunk_id,
                    },
                )
