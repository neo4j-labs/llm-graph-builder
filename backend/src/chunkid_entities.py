import logging
from neo4j import graph
from langchain_community.graphs import graph_document
from src.graph_query import *


CHUNK_QUERY = """
match (chunk:Chunk) where chunk.id IN $chunksIds

MATCH (chunk)-[:PART_OF]->(d:Document)
CALL {WITH chunk
MATCH (chunk)-[:HAS_ENTITY]->(e) 
MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){0,2}(:!Chunk&!Document) 
UNWIND rels as r
RETURN collect(distinct r) as rels
}
WITH d, collect(distinct chunk) as chunks, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
return [r in rels | [startNode(r), endNode(r), r]] as entities
"""

CHUNK_TEXT_QUERY = "match (doc)<-[:PART_OF]-(chunk:Chunk) WHERE chunk.id IN $chunkIds RETURN doc, collect(chunk {.*, embedding:null}) as chunks"


def process_record(record, elements_data):
    """
    Processes a record to extract and organize node and relationship data.
    """
    try:
        entities = record["entities"]
        for entity in entities:
            for element in entity:
                element_id = element.element_id
                if isinstance(element, graph.Node):
                    if element_id not in elements_data["seen_nodes"]:
                        elements_data["seen_nodes"].add(element_id)
                        node_element = process_node(element)
                        elements_data["nodes"].append(node_element)
                else:
                    if element_id not in elements_data["seen_relationships"]:
                        elements_data["seen_relationships"].add(element_id)
                        nodes = element.nodes
                        if len(nodes) < 2:
                            logging.warning(f"Relationship with ID {element_id} does not have two nodes.")
                            continue
                        relationship = {
                            "element_id": element_id,
                            "type": element.type,
                            "start_node_element_id": process_node(nodes[0])["element_id"],
                            "end_node_element_id": process_node(nodes[1])["element_id"],
                        }
                        elements_data["relationships"].append(relationship)
        return elements_data
    except Exception as e:
        logging.error(f"chunkid_entities module: An error occurred while extracting the nodes and relationships from records: {e}")


def time_to_seconds(time_str):
    h, m, s = map(int, time_str.split(':'))
    return h * 3600 + m * 60 + s

def process_chunk_data(chunk_data):
    """
    Processes a record to extract chunk_text
    """
    try:
        required_doc_properties = ["fileSource", "fileType", "url"]
        chunk_properties = []

        for record in chunk_data:
            doc_properties = {prop: record["doc"].get(prop, None) for prop in required_doc_properties}
            for chunk in record["chunks"]:
                chunk.update(doc_properties)
                if chunk["fileSource"] == "youtube":
                    chunk["start_time"] = time_to_seconds(chunk["start_time"])
                    chunk["end_time"] = time_to_seconds(chunk["end_time"])
                chunk_properties.append(chunk)

        return chunk_properties
    except Exception as e:
        logging.error(f"chunkid_entities module: An error occurred while extracting the Chunk text from records: {e}")
 
def get_entities_from_chunkids(uri, username, password, chunk_ids):
    """
    Retrieve and process nodes and relationships from a graph database given a list of chunk IDs.

    Parameters:
    uri (str): The URI of the graph database.
    username (str): The username for the database authentication.
    password (str): The password for the database authentication.
    chunk_ids (str): A comma-separated string of chunk IDs.

    Returns:
    dict: A dictionary with 'nodes' and 'relationships' keys containing processed data, or an error message.
    """    
    try:
        logging.info(f"Starting graph query process for chunk ids")
        chunk_ids_list = chunk_ids.split(",")
        driver = get_graphDB_driver(uri, username, password)
        records, summary, keys = driver.execute_query(CHUNK_QUERY, chunksIds=chunk_ids_list)
        elements_data = {
            "nodes": [],
            "seen_nodes": set(),
            "relationships": [],
            "seen_relationships": set()
        }
        for record in records:
            elements_data = process_record(record, elements_data)

        logging.info(f"Nodes and relationships are processed")

        chunk_data,summary, keys = driver.execute_query(CHUNK_TEXT_QUERY, chunkIds=chunk_ids_list)
        chunk_properties = process_chunk_data(chunk_data)
        result = {
            "nodes": elements_data["nodes"],
            "relationships": elements_data["relationships"],
            "chunk_data": chunk_properties
        }
        logging.info(f"Query process completed successfully for chunk ids")
        return result

    except Exception as e:
        logging.error(f"chunkid_entities module: An error occurred in get_entities_from_chunkids. Error: {str(e)}")
        raise Exception(f"chunkid_entities module: An error occurred in get_entities_from_chunkids. Please check the logs for more details.") from e