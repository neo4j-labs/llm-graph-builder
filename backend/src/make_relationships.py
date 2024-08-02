from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain_openai import OpenAIEmbeddings
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.embeddings.sentence_transformer import SentenceTransformerEmbeddings
import logging
from typing import List
import os
import uuid
import hashlib

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def merge_relationship_between_chunk_and_entites(graph: Neo4jGraph, graph_documents_chunk_chunk_Id : list):
    batch_data = []
    logging.info("Create __HAS_ENTITY__ relationship between chunks and entities")
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
            #graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(graph_doc_chunk_id['chunk_id'])+'}) MERGE (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:__HAS_ENTITY__]->(n)')
          
    if batch_data:
        unwind_query = """
                    UNWIND $batch_data AS data
                    MATCH (c:__Chunk__ {id: data.chunk_id})
                    CALL apoc.merge.node([data.node_type], {id: data.node_id}) YIELD node AS n
                    MERGE (c)-[:__HAS_ENTITY__]->(n)
                """
        graph.query(unwind_query, params={"batch_data": batch_data})

            graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(graph_doc_chunk_id['chunk_id'])+'}) MERGE (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:HAS_ENTITY]->(n)')

def load_embedding_model(embedding_model_name: str):
    if embedding_model_name == "openai":
        embeddings = OpenAIEmbeddings()
        dimension = 1536
        logging.info("Embedding: Using OpenAI")
    elif embedding_model_name == "vertexai":        
        embeddings = VertexAIEmbeddings(
            model="textembedding-gecko@003"
        )
        dimension = 768
        logging.info("Embedding: Using Vertex AI Embeddings")
    else:
        embeddings = SentenceTransformerEmbeddings(
            model_name="all-MiniLM-L6-v2"#, cache_folder="/embedding_model"
        )
        dimension = 384
        logging.info("Embedding: Using SentenceTransformer")
    return embeddings, dimension

def update_embedding_create_vector_index(graph, chunkId_chunkDoc_list, file_name):
    #create embedding
    isEmbedding = os.getenv('IS_EMBEDDING')
    embedding_model = os.getenv('EMBEDDING_MODEL')
    
    embeddings, dimension = load_embedding_model(embedding_model)
    logging.info(f'embedding model:{embeddings} and dimesion:{dimension}')
    for row in chunkId_chunkDoc_list:
        # for graph_document in row['graph_doc']:
        if isEmbedding.upper() == "TRUE":
            embeddings_arr = embeddings.embed_query(row['chunk_doc'].page_content)
            # logging.info(f'Embedding list {embeddings_arr}')
                                    
            data_for_query.append({
                "chunkId": row['chunk_id'],
                "embeddings": embeddings_arr
            })
            # graph.query("""MATCH (d:__Document__ {fileName : $fileName})
            #                MERGE (c:__Chunk__ {id:$chunkId}) SET c.embedding = $embeddings 
            #                MERGE (c)-[:__PART_OF__]->(d)
            #             """,
            #             {
            #                 "fileName" : file_name,
            #                 "chunkId": row['chunk_id'],
            #                 "embeddings" : embeddings_arr
            #             }
            #             )
            # logging.info('create vector index on chunk embedding')
            result = graph.query("SHOW INDEXES YIELD * WHERE labelsOrTypes = ['Chunk'] and name = 'vector'")
            if result:
                logging.info(f"vector index dropped for 'Chunk'")
                graph.query("DROP INDEX vector IF EXISTS;")

            graph.query("""CREATE VECTOR INDEX `vector` if not exists for (c:__Chunk__) on (c.embedding)
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
        MATCH (d:__Document__ {fileName: $fileName})
        MERGE (c:__Chunk__ {id: row.chunkId})
        SET c.embedding = row.embeddings
        MERGE (c)-[:__PART_OF__]->(d)
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
        }
        
        if 'page_number' in chunk.metadata:
            chunk_data['page_number'] = chunk.metadata['page_number']
         
        if 'start_timestamp' in chunk.metadata and 'end_timestamp' in chunk.metadata:
            chunk_data['start_time'] = chunk.metadata['start_timestamp']
            chunk_data['end_time'] = chunk.metadata['end_timestamp'] 
               
        batch_data.append(chunk_data)
        
        lst_chunks_including_hash.append({'chunk_id': current_chunk_id, 'chunk_doc': chunk})
        
        #create PART_OF realtion between chunk and Document node
        graph.query(
            """MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
            MERGE (c)-[:PART_OF]->(d)
            """,
            {"f_name": file_name, "chunk_id": current_chunk_id},
        )
        # create relationships between chunks
        if firstChunk:
            relationships.append({"type": "__FIRST_CHUNK__", "chunk_id": current_chunk_id})
        else:
            relationships.append({
                "type": "__NEXT_CHUNK__",
                "previous_chunk_id": previous_chunk_id,  # ID of previous chunk
                "current_chunk_id": current_chunk_id
            })
          
    query_to_create_chunk_and_PART_OF_relation = """
        UNWIND $batch_data AS data
        MERGE (c:__Chunk__ {id: data.id})
        SET c.text = data.pg_content, c.position = data.position, c.length = data.length, c.fileName=data.f_name, c.content_offset=data.content_offset
        WITH data, c
        WHERE data.page_number IS NOT NULL
        SET c.page_number = data.page_number
        WITH data, c
        WHERE data.page_number IS NOT NULL
        SET c.page_number = data.page_number
        WITH data, c
        MATCH (d:__Document__ {fileName: data.f_name})
        MERGE (c)-[:__PART_OF__]->(d)
    """
    graph.query(query_to_create_chunk_and_PART_OF_relation, params={"batch_data": batch_data})
    
    query_to_create_FIRST_relation = """ 
        UNWIND $relationships AS relationship
        MATCH (d:__Document__ {fileName: $f_name})
        MATCH (c:__Chunk__ {id: relationship.chunk_id})
        FOREACH(r IN CASE WHEN relationship.type = '__FIRST_CHUNK__' THEN [1] ELSE [] END |
                MERGE (d)-[:__FIRST_CHUNK__]->(c))
        """
    graph.query(query_to_create_FIRST_relation, params={"f_name": file_name, "relationships": relationships})   
    
    query_to_create_NEXT_CHUNK_relation = """ 
        UNWIND $relationships AS relationship
        MATCH (c:__Chunk__ {id: relationship.current_chunk_id})
        WITH c, relationship
        MATCH (pc:__Chunk__ {id: relationship.previous_chunk_id})
        FOREACH(r IN CASE WHEN relationship.type = '__NEXT_CHUNK__' THEN [1] ELSE [] END |
                MERGE (c)<-[:__NEXT_CHUNK__]-(pc))
        """
    graph.query(query_to_create_NEXT_CHUNK_relation, params={"relationships": relationships})   
    
    return lst_chunks_including_hash