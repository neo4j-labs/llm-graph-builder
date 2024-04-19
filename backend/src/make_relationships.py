from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from src.shared.common_fn import load_embedding_model
import logging
from typing import List
import os
import hashlib

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def merge_relationship_between_chunk_and_entites(graph: Neo4jGraph, graph_documents_chunk_chunk_Id : list):
    logging.info("Create HAS_ENTITY relationship between chunks and entities")
    chunk_node_id_set = 'id:"{}"'
    for graph_doc_chunk_id in graph_documents_chunk_chunk_Id:
        for node in graph_doc_chunk_id['graph_doc'].nodes:
            node_id = node.id
            #Below query is also unable to change as parametrize because we can't make parameter of Label or node type
            #https://neo4j.com/docs/cypher-manual/current/syntax/parameters/

            graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(graph_doc_chunk_id['chunk_id'])+'}) MERGE (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:HAS_ENTITY]->(n)')

def update_embedding_create_vector_index(graph, chunkId_chunkDoc_list, file_name):
    #create embedding
    isEmbedding = os.getenv('IS_EMBEDDING')
    embedding_model = os.getenv('EMBEDDING_MODEL')
    
    embeddings, dimension = load_embedding_model(embedding_model)
    logging.info(f'embedding model:{embeddings} and dimesion:{dimension}')
    for row in chunkId_chunkDoc_list:
        # for graph_document in row['graph_doc']:
        embeddings_arr = embeddings.embed_query(row['chunk_doc'].page_content)
        # logging.info(f'Embedding list {embeddings}')
        if isEmbedding.upper() == "TRUE":
            logging.info(f"update embedding for {row['chunk_id']}")
            graph.query("""MATCH (d:Document {fileName : $fileName})
                           MERGE (c:Chunk {id:$chunkId}) SET c.embedding = $embeddings 
                           MERGE (c)-[:PART_OF]->(d)
                        """,
                        {
                            "fileName" : file_name,
                            "chunkId": row['chunk_id'],
                            "embeddings" : embeddings_arr
                        }
                        )
            logging.info('create vector index on chunk embedding')
            graph.query("""CREATE VECTOR INDEX `vector` if not exists for (c:Chunk) on (c.embedding)
                            OPTIONS {indexConfig: {
                            `vector.dimensions`: $dimensions,
                            `vector.similarity_function`: 'cosine'
                            }}
                        """,
                        {
                            "dimensions" : dimension
                        }
                        )

def create_relation_between_chunks(graph, file_name, chunks: List[Document])->list:
    logging.info("creating FIRST_CHUNK and NEXT_CHUNK relationships between chunks")
    current_chunk_id = ""
    lst_chunks_including_hash = []
    for i, chunk in enumerate(chunks):
        page_content_sha1 = hashlib.sha1(chunk.page_content.encode())
        previous_chunk_id = current_chunk_id
        current_chunk_id = page_content_sha1.hexdigest()
        position = i + 1
        if i == 0:
            firstChunk = True
        else:
            firstChunk = False  
        metadata = {"position": position,"length": len(chunk.page_content)}
        chunk_document = Document(
            page_content=chunk.page_content, metadata=metadata
        )
        
        # create chunk nodes
        graph.query("""MERGE(c:Chunk {id : $id}) SET c.text = $pg_content, c.position = $position, 
        c.length = $length
        """,
        {"id":current_chunk_id,"pg_content":chunk_document.page_content, "position": position,
            "length": chunk_document.metadata["length"]
        })
        
        #create PART_OF realtion between chunk and Document node
        graph.query(
            """MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
            MERGE (c)-[:PART_OF]->(d)
            """,
            {"f_name": file_name, "chunk_id": current_chunk_id},
        )
        # create relationships between chunks
        if firstChunk:
            graph.query(
                """MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
            MERGE (d)-[:FIRST_CHUNK]->(c)
            """,
                {"f_name": file_name, "chunk_id": current_chunk_id},
            )
        else:
            graph.query(
                """MATCH(pc:Chunk {id : $previous_chunk_id}) ,(cc:Chunk {id : $current_chunk_id}) 
            MERGE (pc)-[:NEXT_CHUNK]->(cc)
            """,
                {
                    "previous_chunk_id": previous_chunk_id,
                    "current_chunk_id": current_chunk_id,
                },
            )
        lst_chunks_including_hash.append({'chunk_id': current_chunk_id, 'chunk_doc': chunk})
    return lst_chunks_including_hash