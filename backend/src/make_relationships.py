from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from src.shared.common_fn import load_embedding_model
import logging
from typing import List
import os
import hashlib
import time

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def merge_relationship_between_chunk_and_entites(graph: Neo4jGraph, graph_documents_chunk_chunk_Id : list):
    batch_data = []
    logging.info("Create HAS_ENTITY relationship between chunks and entities")
    chunk_node_id_set = 'id:"{}"'
    for graph_doc_chunk_id in graph_documents_chunk_chunk_Id:
        for node in graph_doc_chunk_id['graph_doc'].nodes:
            query_data={
                'chunk_id': graph_doc_chunk_id['chunk_id'],
                'node_type': node.type,
                'node_id': node.id
            }
            batch_data.append(query_data)
            #node_id = node.id
            #Below query is also unable to change as parametrize because we can't make parameter of Label or node type
            #https://neo4j.com/docs/cypher-manual/current/syntax/parameters/
            #graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(graph_doc_chunk_id['chunk_id'])+'}) MERGE (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:HAS_ENTITY]->(n)')
          
    if batch_data:
        unwind_query = """
                    UNWIND $batch_data AS data
                    MATCH (c:Chunk {id: data.chunk_id})
                    CALL apoc.merge.node([data.node_type], {id: data.node_id}) YIELD node AS n
                    MERGE (c)-[:HAS_ENTITY]->(n)
                """
        graph.query(unwind_query, params={"batch_data": batch_data})

    
def update_embedding_create_vector_index(graph, chunkId_chunkDoc_list, file_name):
    #create embedding
    isEmbedding = os.getenv('IS_EMBEDDING')
    embedding_model = os.getenv('EMBEDDING_MODEL')
    
    embeddings, dimension = load_embedding_model(embedding_model)
    logging.info(f'embedding model:{embeddings} and dimesion:{dimension}')
    data_for_query = []
    logging.info(f"update embedding and vector index for chunks")
    for row in chunkId_chunkDoc_list:
        # for graph_document in row['graph_doc']:
        if isEmbedding.upper() == "TRUE":
            embeddings_arr = embeddings.embed_query(row['chunk_doc'].page_content)
            # logging.info(f'Embedding list {embeddings_arr}')
                                    
            data_for_query.append({
                "chunkId": row['chunk_id'],
                "embeddings": embeddings_arr
            })
            # graph.query("""MATCH (d:Document {fileName : $fileName})
            #                MERGE (c:Chunk {id:$chunkId}) SET c.embedding = $embeddings 
            #                MERGE (c)-[:PART_OF]->(d)
            #             """,
            #             {
            #                 "fileName" : file_name,
            #                 "chunkId": row['chunk_id'],
            #                 "embeddings" : embeddings_arr
            #             }
            #             )
            # logging.info('create vector index on chunk embedding')
            result = graph.query("SHOW INDEXES YIELD * WHERE labelsOrTypes = ['__Chunk__'] and name = 'vector'")
            if result:
                logging.info(f"vector index dropped for 'Chunk'")
                graph.query("DROP INDEX vector IF EXISTS;")

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
    
    query_to_create_embedding = """
        UNWIND $data AS row
        MATCH (d:Document {fileName: $fileName})
        MERGE (c:Chunk {id: row.chunkId})
        SET c.embedding = row.embeddings
        MERGE (c)-[:PART_OF]->(d)
    """       
    graph.query(query_to_create_embedding, params={"fileName":file_name, "data":data_for_query})
    
def create_relation_between_chunks(graph, file_name, chunks: List[Document])->list:
    logging.info("creating FIRST_CHUNK and NEXT_CHUNK relationships between chunks")
    current_chunk_id = ""
    lst_chunks_including_hash = []
    batch_data = []
    relationships = []
    offset=0
    for i, chunk in enumerate(chunks):
        page_content_sha1 = hashlib.sha1(chunk.page_content.encode())
        previous_chunk_id = current_chunk_id
        current_chunk_id = page_content_sha1.hexdigest()
        position = i + 1 
        if i>0:
            #offset += len(tiktoken.encoding_for_model("gpt2").encode(chunk.page_content))
            offset += len(chunks[i-1].page_content)
        if i == 0:
            firstChunk = True
        else:
            firstChunk = False  
        metadata = {"position": position,"length": len(chunk.page_content), "content_offset":offset}
        chunk_document = Document(
            page_content=chunk.page_content, metadata=metadata
        )
        
        chunk_data = {
            "id": current_chunk_id,
            "pg_content": chunk_document.page_content,
            "position": position,
            "length": chunk_document.metadata["length"],
            "f_name": file_name,
            "previous_id" : previous_chunk_id,
            "content_offset" : offset
        }
        
        if 'page_number' in chunk.metadata:
            chunk_data['page_number'] = chunk.metadata['page_number']
         
        if 'start_timestamp' in chunk.metadata and 'end_timestamp' in chunk.metadata:
            chunk_data['start_time'] = chunk.metadata['start_timestamp']
            chunk_data['end_time'] = chunk.metadata['end_timestamp'] 
               
        batch_data.append(chunk_data)
        
        lst_chunks_including_hash.append({'chunk_id': current_chunk_id, 'chunk_doc': chunk})
        
        # create relationships between chunks
        if firstChunk:
            relationships.append({"type": "FIRST_CHUNK", "chunk_id": current_chunk_id})
        else:
            relationships.append({
                "type": "NEXT_CHUNK",
                "previous_chunk_id": previous_chunk_id,  # ID of previous chunk
                "current_chunk_id": current_chunk_id
            })
          
    query_to_create_chunk_and_PART_OF_relation = """
        UNWIND $batch_data AS data
        MERGE (c:Chunk {id: data.id})
        SET c.text = data.pg_content, c.position = data.position, c.length = data.length, c.fileName=data.f_name, c.content_offset=data.content_offset
        WITH data, c
        SET c.page_number = CASE WHEN data.page_number IS NOT NULL THEN data.page_number END,
            c.start_time = CASE WHEN data.start_time IS NOT NULL THEN data.start_time END,
            c.end_time = CASE WHEN data.end_time IS NOT NULL THEN data.end_time END
        WITH data, c
        MATCH (d:Document {fileName: data.f_name})
        MERGE (c)-[:PART_OF]->(d)
    """
    graph.query(query_to_create_chunk_and_PART_OF_relation, params={"batch_data": batch_data})
    
    query_to_create_FIRST_relation = """ 
        UNWIND $relationships AS relationship
        MATCH (d:Document {fileName: $f_name})
        MATCH (c:Chunk {id: relationship.chunk_id})
        FOREACH(r IN CASE WHEN relationship.type = 'FIRST_CHUNK' THEN [1] ELSE [] END |
                MERGE (d)-[:FIRST_CHUNK]->(c))
        """
    graph.query(query_to_create_FIRST_relation, params={"f_name": file_name, "relationships": relationships})   
    
    query_to_create_NEXT_CHUNK_relation = """ 
        UNWIND $relationships AS relationship
        MATCH (c:Chunk {id: relationship.current_chunk_id})
        WITH c, relationship
        MATCH (pc:Chunk {id: relationship.previous_chunk_id})
        FOREACH(r IN CASE WHEN relationship.type = 'NEXT_CHUNK' THEN [1] ELSE [] END |
                MERGE (c)<-[:NEXT_CHUNK]-(pc))
        """
    graph.query(query_to_create_NEXT_CHUNK_relation, params={"relationships": relationships})   
    
    return lst_chunks_including_hash