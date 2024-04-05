from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain_openai import OpenAIEmbeddings
from langchain_google_vertexai import VertexAIEmbeddings
import logging
import os
import uuid

logging.basicConfig(format='%(asctime)s - %(message)s',level='INFO')

def create_source_chunk_entity_relationship(source_file_name :str,
                                            graph: Neo4jGraph,
                                            graph_document : list,
                                            chunk : Document,
                                            uri : str,
                                            userName : str,
                                            password : str,
                                            isFirstChunk : bool,
                                            current_chunk_id:uuid,
                                            previous_chunk_id:uuid)-> list:
    """ Create relationship between source, chunk and entity nodes
    Args:
        source_file_name (str): file name of input source
        graph (Neo4jGraph): Neo4jGraph connection object
        graph_document (List): List of graph document, contain Nodes and relationships and source of chunk document
        chunk (Document): chunk document created from input file
        uri: URI of the graph to extract
        userName: Username to use for graph creation ( if None will use username from config file )
        password: Password to use for graph creation ( if None will use password from config file )
        isFirstChunk : It's bool value to create FIRST_CHUNK AND NEXT_CHUNK relationship between chunk and document node.
        current_chunk_id : Unique id of chunk
        previous_chunk_id : Unique id of previous chunk
    """
    source_node = 'fileName: "{}"'
    lst_cypher_queries_chunk_relationship = []
    embedding_model = os.getenv('EMBEDDING_MODEL')
    isEmbedding = os.getenv('IS_EMBEDDING')
    chunk_node_id_set = 'id:"{}"'
    
    if isEmbedding.upper() == "TRUE":
        Neo4jVector.from_documents(
            [chunk],
            OpenAIEmbeddings(model=embedding_model),
            url=uri,
            username=userName,
            password=password,
            ids=[current_chunk_id]
        )
    else:
        graph.query("""MERGE(c:Chunk {id : $id}) SET c.text = $pg_content, c.position = $position, 
                    c.length = $length
                    """,
                    {"id":current_chunk_id,"pg_content":chunk.page_content, "position": chunk.metadata['position'],
                     "length": chunk.metadata['length']
                    })

    logging.info("make PART_OF relationship between chunk node and document node")
    graph.query("""MATCH(d:Document {fileName : $f_name}) ,(c:Chunk {id : $chunk_id}) 
                MERGE (c)-[:PART_OF]->(d)
                """,
                {"f_name":source_file_name,"chunk_id":current_chunk_id})

    #FYI-Reason: To use the list below because some relationships are not creating due to chunks not existing because the function running in a thread (chunks creation async)
    #relationship between chunks as NEXT_CHUNK, FIRST_CHUNK, these queries executed end of the file process.
    #could not change the below query as parameterize because the list only takes a single parameter and parameterizes (2 parameters)
    if isFirstChunk: 
        lst_cypher_queries_chunk_relationship.append('MATCH(d:Document {'+source_node.format(source_file_name)+'}) ,(c:Chunk {'+chunk_node_id_set.format(current_chunk_id)+'}) MERGE (d)-[:FIRST_CHUNK]->(c)')
    else:
        lst_cypher_queries_chunk_relationship.append('MATCH(pc:Chunk {'+chunk_node_id_set.format(previous_chunk_id)+'}) ,(cc:Chunk {'+chunk_node_id_set.format(current_chunk_id)+'}) MERGE (pc)-[:NEXT_CHUNK]->(cc)')
    # dict = {}
    # nodes_list = []
    for node in graph_document[0].nodes:
        node_id = node.id
        #Below query is also unable to change as parametrize because we can't make parameter of Label or node type
        #https://neo4j.com/docs/cypher-manual/current/syntax/parameters/

        graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(current_chunk_id)+'}), (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:HAS_ENTITY]->(n)')

        # graph.query("""MATCH(c:Chunk {id : $chunk_id}), (n:$node_type{ id: $node_id}) 
        #             MERGE (c)-[:HAS_ENTITY]->(n)
        #             """,
        #             {"chunk_id":current_chunk_id,"node_type":node.type, "node_id":node_id})

    #     json_obj = {'node_id': node_id, 'node_type' : node.type, 'uuid' : chunk_uuid}
    #     nodes_list.append(json_obj)
    return lst_cypher_queries_chunk_relationship
    # dict['chunk_doc'] = chunk.page_content
    # dict['rel_chunk_entity_node'] = nodes_list
    # dict['nodes_created_in_chunk'] = len(graph_document[0].nodes)
    # dict['relationships_created_in_chunk'] = len(graph_document[0].relationships)

    # print(f'dictionary object include nodes and content {dict}')

def merge_relationship_between_chunk_and_entites(graph: Neo4jGraph, graph_documents_chunk_chunk_Id : list):
    chunk_node_id_set = 'id:"{}"'
    for graph_doc_chunk_id in graph_documents_chunk_chunk_Id:
        for node in graph_doc_chunk_id['graph_doc'].nodes:
            node_id = node.id
            #Below query is also unable to change as parametrize because we can't make parameter of Label or node type
            #https://neo4j.com/docs/cypher-manual/current/syntax/parameters/

            graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(graph_doc_chunk_id['chunk_id'])+'}) MERGE (n:'+ node.type +'{ id: "'+node_id+'"}) MERGE (c)-[:HAS_ENTITY]->(n)')

def merge_chunk_embedding(graph, graph_documents_chunk_chunk_Id, file_name):
    #create embedding
    isEmbedding = os.getenv('IS_EMBEDDING')
    embedding_model = os.getenv('EMBEDDING_MODEL')
    embeddings_model = VertexAIEmbeddings(model_name=embedding_model)
    
    for row in graph_documents_chunk_chunk_Id:
        # for graph_document in row['graph_doc']:
        embeddings = embeddings_model.embed_query(row['graph_doc'].source.page_content)
        logging.info(f'Embedding list {embeddings}')
        if isEmbedding.upper() == "TRUE":
            logging.info('embedding update')
            graph.query("""MATCH (d:Document {fileName : $fileName})
                           MERGE (c:Chunk {id:$chunkId}) SET c.embedding = $embeddings 
                           MERGE (c)-[:PART_OF]->(d)
                        """,
                        {
                            "fileName" : file_name,
                            "chunkId": row['chunk_id'],
                            "embeddings" : embeddings
                        }
                        )
            #create vector index on chunk embedding
            graph.query("""CREATE VECTOR INDEX `vector` if not exists for (c:Chunk) on (c.embedding)
                            OPTIONS {indexConfig: {
                            `vector.dimensions`: 768,
                            `vector.similarity_function`: 'cosine'
                            }}
                        """)