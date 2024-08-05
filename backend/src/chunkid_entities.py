import logging
from neo4j import graph
from src.graph_query import *

CHUNK_QUERY = """
match (chunk:Chunk) where chunk.id IN $chunksIds

MATCH (chunk)-[:PART_OF]->(d:Document)
CALL {WITH chunk
MATCH (chunk)-[:HAS_ENTITY]->(e) 
MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){0,2}(:!Chunk &! Document) 
UNWIND rels as r
RETURN collect(distinct r) as rels
}
WITH d, collect(distinct chunk) as chunks, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
RETURN d as doc, [chunk in chunks | chunk {.*, embedding:null}] as chunks,
       [r in rels | {startNode:{element_id:elementId(startNode(r)), labels:labels(startNode(r)), properties:{id:startNode(r).id,description:startNode(r).description}},
                     endNode:{element_id:elementId(endNode(r)), labels:labels(endNode(r)), properties:{id:endNode(r).id,description:endNode(r).description}},
                     relationship: {type:type(r), element_id:elementId(r)}}] as entities
"""


def process_records(records):
    """
    Processes a record to extract and organize node and relationship data.
    """
    try:            
        nodes = []
        relationships = []
        seen_nodes = set()
        seen_relationships = set()

        for record in records:
            for element in record["entities"]:
                start_node = element['startNode']
                end_node = element['endNode']
                relationship = element['relationship']

                if start_node['element_id'] not in seen_nodes:
                    nodes.append(start_node)
                    seen_nodes.add(start_node['element_id'])

                if end_node['element_id'] not in seen_nodes:
                    nodes.append(end_node)
                    seen_nodes.add(end_node['element_id'])

                if relationship['element_id'] not in seen_relationships:
                    relationships.append({
                        "element_id": relationship['element_id'],
                        "type": relationship['type'],
                        "start_node_element_id": start_node['element_id'],
                        "end_node_element_id": end_node['element_id']
                    })
                    seen_relationships.add(relationship['element_id'])
        output = {
            "nodes": nodes,
            "relationships": relationships
        }

        return output
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
                    chunk["start_time"] = min(time_to_seconds(chunk["start_time"]),time_to_seconds(chunk["end_time"]))
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
        if chunk_ids:
            chunk_ids_list = chunk_ids.split(",")
            driver = get_graphDB_driver(uri, username, password)
            records, summary, keys = driver.execute_query(CHUNK_QUERY, chunksIds=chunk_ids_list)
            result = process_records(records)
            logging.info(f"Nodes and relationships are processed")
            result["chunk_data"] = process_chunk_data(records)
            logging.info(f"Query process completed successfully for chunk ids")
            return result
        else:
            logging.info(f"chunkid_entities module: No chunk ids are passed")
            result = {
                "nodes": [],
                "relationships": [],
                "chunk_data":[]
            }
            return result

    except Exception as e:
        logging.error(f"chunkid_entities module: An error occurred in get_entities_from_chunkids. Error: {str(e)}")
        raise Exception(f"chunkid_entities module: An error occurred in get_entities_from_chunkids. Please check the logs for more details.") from e