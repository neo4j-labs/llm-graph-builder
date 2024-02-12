from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document

def create_source_chunk_entity_relationship(source_file_name :str,graph: Neo4jGraph,graph_document : list, chunk : Document):
    """ Create relationship between source, chunk and entity nodes
    Args:
        source_file_name (str): file name of input source
        graph (Neo4jGraph): Neo4jGraph connection object
        graph_document (List): List of graph document, contain Nodes and relationships and source of chunk document
        chunk (Document): chunk document created from input file

    """
    source_node = "fileName: '{}'"
    # print(f'Graph Document print{graph_document}')
    chunk_node_id = "uuid:'{}'"
    update_chunk_node_prop = "SET c.text = '{}'"
    result = graph.query('CREATE(c:Chunk {uuid:randomUUID()}) '+update_chunk_node_prop.format(chunk.page_content)+' RETURN c.uuid AS UUID')

    chunk_uuid = result[0]['UUID']
    #make relationship between chunk node and source node.
    graph.query('MATCH(s:Source {'+source_node.format(source_file_name)+'}) ,(c:Chunk {'+chunk_node_id.format(chunk_uuid)+'}) CREATE (s)-[:HAS_CHILD]->(c)')
    dict = {}
    nodes_list = []
    for node in graph_document[0].nodes:
        node_id = node.id
        result = graph.query("MATCH(c:Chunk {"+chunk_node_id.format(chunk_uuid)+"}), (n:"+ node.type +"{ id: '"+node_id+"'}) CREATE (c)-[:HAS_ENTITY]->(n)")
    #     json_obj = {'node_id': node_id, 'node_type' : node.type, 'uuid' : chunk_uuid}
    #     nodes_list.append(json_obj)

    # dict['chunk_doc'] = chunk.page_content
    # dict['rel_chunk_entity_node'] = nodes_list
    # dict['nodes_created_in_chunk'] = len(graph_document[0].nodes)
    # dict['relationships_created_in_chunk'] = len(graph_document[0].relationships)

    # print(f'dictionary object include nodes and content {dict}')