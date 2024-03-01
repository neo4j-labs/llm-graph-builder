from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain_openai import OpenAIEmbeddings
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
                                            isFirstChunk : bool):
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
    """
    source_node = 'fileName: "{}"'
    # logging.info(f'Graph Document print{graph_document}')
    # openai_api_key = os.environ.get('OPENAI_API_KEY')
    embedding_model = os.environ.get('EMBEDDING_MODEL')
    isEmbedding = os.environ.get('IS_EMBEDDING')
    
    chunk_uuid = str(uuid.uuid1())
    chunk_node_id_set = 'id:"{}"'
    update_chunk_node_prop = ' SET c.text = "{}"'
    if isEmbedding:
        Neo4jVector.from_documents(
            [chunk],
            OpenAIEmbeddings(model=embedding_model),
            url=uri,
            username=userName,
            password=password,
            ids=[chunk_uuid]
        )
    else:
        graph.query('CREATE(c:Chunk {id:"'+ chunk_uuid+'"})' + update_chunk_node_prop.format(chunk.page_content))

    logging.info("make PART_OF relationship between chunk node and document node")
    graph.query('MATCH(d:Document {'+source_node.format(source_file_name)+'}) ,(c:Chunk {'+chunk_node_id_set.format(chunk_uuid)+'}) CREATE (c)-[:PART_OF]->(d)')

    logging.info("make FIRST_CHUNK, NEXT_CHUNK relationship between chunk node and document node")
    if isFirstChunk:
        graph.query('MATCH(d:Document {'+source_node.format(source_file_name)+'}) ,(c:Chunk {'+chunk_node_id_set.format(chunk_uuid)+'}) CREATE (d)-[:FIRST_CHUNK]->(c)')
    else:
        graph.query('MATCH(d:Document {'+source_node.format(source_file_name)+'}) ,(c:Chunk {'+chunk_node_id_set.format(chunk_uuid)+'}) CREATE (d)-[:NEXT_CHUNK]->(c)')
    # dict = {}
    # nodes_list = []
    for node in graph_document[0].nodes:
        node_id = node.id
        result = graph.query('MATCH(c:Chunk {'+chunk_node_id_set.format(chunk_uuid)+'}), (n:'+ node.type +'{ id: "'+node_id+'"}) CREATE (c)-[:HAS_ENTITY]->(n)')
    #     json_obj = {'node_id': node_id, 'node_type' : node.type, 'uuid' : chunk_uuid}
    #     nodes_list.append(json_obj)

    # dict['chunk_doc'] = chunk.page_content
    # dict['rel_chunk_entity_node'] = nodes_list
    # dict['nodes_created_in_chunk'] = len(graph_document[0].nodes)
    # dict['relationships_created_in_chunk'] = len(graph_document[0].relationships)

    # print(f'dictionary object include nodes and content {dict}')