import logging
from neo4j import time 
from neo4j import GraphDatabase
import os
from neo4j.debug import watch

#watch("neo4j")

QUERY_MAP = {
    "document"          : " + [docs] ",
    "chunks"            : " + collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } ",
    "entities"          : " + collect { OPTIONAL MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)-[*0..1]-(:!Chunk) RETURN p }",
    "docEntities"       : " + [docs] + collect { MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)--(:!Chunk) RETURN p }",
    "docChunks"         : " + [chunks] + collect { MATCH p=(c)-[:FIRST_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } ",
    "chunksEntities"    : " + collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } + collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)-[*0..1]-(:!Chunk) RETURN p }",
    "docChunkEntities"  : " + [chunks] + collect { MATCH p=(c)-[:FIRST_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } + collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } + collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)-[*0..1]-(:!Chunk) RETURN p }"
}

QUERY_WITH_DOCUMENT = """
    MATCH docs = (d:Document {{status:'Completed'}}) 
    WHERE d.fileName = $document_name
    WITH docs, d ORDER BY d.createdAt DESC 
    CALL {{ WITH d
      OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
      RETURN chunks, c LIMIT 50
    }}
    WITH [] {query_to_change} AS paths
    CALL {{ WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }}
    CALL {{ WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }}
    RETURN nodes, rels
"""

QUERY_WITHOUT_DOCUMENT = """
    MATCH docs = (d:Document {{status:'Completed'}}) 
    WITH docs, d ORDER BY d.createdAt DESC 
    LIMIT $doc_limit
    CALL {{ WITH d
        OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
        RETURN chunks, c LIMIT 50
    }}
    WITH [] {query_to_change} AS paths
    CALL {{ WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }}
    CALL {{ WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }}
    RETURN nodes, rels
"""

def get_graphDB_driver(uri, username, password):
    """
    Creates and returns a Neo4j database driver instance configured with the provided credentials.

    Returns:
    Neo4j.Driver: A driver object for interacting with the Neo4j database.

    """
    try:
        logging.info(f"Attempting to connect to the Neo4j database at {uri}")
        driver = GraphDatabase.driver(uri, auth=(username, password), user_agent=os.environ.get('NEO4J_USER_AGENT'))
        logging.info("Connection successful")
        return driver
    except Exception as e:
        error_message = f"graph_query module: Failed to connect to the database at {uri}."
        logging.error(error_message, exc_info=True)
        # raise Exception(error_message) from e 


def get_cypher_query(query_map, query_type, document_name):
    """
    Generates a Cypher query based on the provided parameters using global templates.

    Returns:
    str: A Cypher query string ready to be executed.
    """
    try:
        query_to_change = query_map[query_type].strip()
        logging.info(f"Query template retrieved for type {query_type}")

        if document_name:
            logging.info(f"Generating query for document: {document_name}")
            query = QUERY_WITH_DOCUMENT.format(query_to_change=query_to_change)
        else:
            logging.info("Generating query without specific document.")
            query = QUERY_WITHOUT_DOCUMENT.format(query_to_change=query_to_change)
        return query.strip()
    
    except Exception as e:
        logging.error("graph_query module: An unexpected error occurred while generating the Cypher query.")
    

def execute_query(driver, query, doc_limit, document_name):
    """
    Executes a specified query using the Neo4j driver, with parameters based on the presence of a document name.

    Returns:
    tuple: Contains records, summary of the execution, and keys of the records.
    """
    try:
        if document_name:
            logging.info(f"Executing query for document: {document_name}")
            records, summary, keys = driver.execute_query(query, document_name=document_name)
        else:
            logging.info(f"Executing query with a document limit of {doc_limit}")
            records, summary, keys = driver.execute_query(query, doc_limit=doc_limit)
        return records, summary, keys
    except Exception as e:
        error_message = f"graph_query module: Failed to execute the query. Error: {str(e)}"
        logging.error(error_message, exc_info=True)


def process_node(node):
    """
    Processes a node from a Neo4j database, extracting its ID, labels, and properties,
    while omitting certain properties like 'embedding' and 'text'.

    Returns:
    dict: A dictionary with the node's element ID, labels, and other properties,
          with datetime objects formatted as ISO strings.
    """
    try:
        node_element = {
            "element_id": node.element_id,
            "labels": list(node.labels),
            "properties": {}
        }
        # logging.info(f"Processing node with element ID: {node.element_id}")

        for key in node:
            if key in ["embedding", "text"]:
                continue
            value = node.get(key)
            if isinstance(value, time.DateTime):
                node_element["properties"][key] = value.isoformat()
                # logging.debug(f"Processed datetime property for {key}: {value.isoformat()}")
            else:
                node_element["properties"][key] = value

        return node_element
    except Exception as e:
        logging.error("graph_query module:An unexpected error occurred while processing the node")

def extract_node_elements(records):
    """
    Extracts and processes unique nodes from a list of records, avoiding duplication by tracking seen element IDs.

    Returns:
    list of dict: A list containing processed node dictionaries.
    """
    node_elements = []
    seen_element_ids = set()  

    try:
        for record in records:
            nodes = record.get("nodes", [])
            if not nodes:
                # logging.debug(f"No nodes found in record: {record}")
                continue

            for node in nodes:
                if node.element_id in seen_element_ids:
                    # logging.debug(f"Skipping already processed node with ID: {node.element_id}")
                    continue
                seen_element_ids.add(node.element_id)
                node_element = process_node(node) 
                node_elements.append(node_element)
                # logging.info(f"Processed node with ID: {node.element_id}")

        return node_elements
    except Exception as e:
        logging.error("graph_query module: An error occurred while extracting node elements from records")

def extract_relationships(records):
    """
    Extracts and processes relationships from a list of records, ensuring that each relationship is processed
    only once by tracking seen element IDs.

    Returns:
    list of dict: A list containing dictionaries of processed relationships.
    """
    all_relationships = []
    seen_element_ids = set()

    try:
        for record in records:
            relationships = []
            relations = record.get("rels", [])
            if not relations:
                continue

            for relation in relations:
                if relation.element_id in seen_element_ids:
                    # logging.debug(f"Skipping already processed relationship with ID: {relation.element_id}")
                    continue
                seen_element_ids.add(relation.element_id)

                try:
                    nodes = relation.nodes
                    if len(nodes) < 2:
                        logging.warning(f"Relationship with ID {relation.element_id} does not have two nodes.")
                        continue

                    relationship = {
                        "element_id": relation.element_id,
                        "type": relation.type,
                        "start_node_element_id": process_node(nodes[0])["element_id"],
                        "end_node_element_id": process_node(nodes[1])["element_id"],
                    }
                    relationships.append(relationship)

                except Exception as inner_e:
                    logging.error(f"graph_query module: Failed to process relationship with ID {relation.element_id}. Error: {inner_e}", exc_info=True)
            all_relationships.extend(relationships)
        return all_relationships
    except Exception as e:
        logging.error("graph_query module: An error occurred while extracting relationships from records", exc_info=True)

def get_graph_results(uri, username, password, query_type, doc_limit, document_name=None):
    """
    Retrieves graph data by executing a specified Cypher query using credentials and parameters provided.
    Processes the results to extract nodes and relationships and packages them in a structured output.

    Args:
    uri (str): The URI for the Neo4j database.
    username (str): The username for authentication.
    password (str): The password for authentication.
    query_type (str): The type of query to be executed.
    doc_limit (int, optional): The limit on the number of documents to retrieve if no specific document name is provided. Default is 10.
    document_name (str, optional): The name of the document to specifically query for, if any. Default is None.

    Returns:
    dict: Contains the session ID, user-defined messages with nodes and relationships, and the user module identifier.
    """
    try:
        logging.info(f"URI: {uri}, Username: {username}, Password: {password}, Query Type: {query_type}, Document Limit: {doc_limit}, Document Name: {document_name}")
        logging.info(f"Starting graph query process")
        driver = get_graphDB_driver(uri, username, password)
        query = get_cypher_query(QUERY_MAP, query_type, document_name)
        records, summary , keys = execute_query(driver, query, int(doc_limit), document_name)
        # logging.info(summary.query)
        print(query)
        result = {
            "nodes": extract_node_elements(records),
            "relationships": extract_relationships(records)
        }


        logging.info(f"Query process completed successfully")
        return result
    except Exception as e:
        logging.error(f"graph_query module: An error occurred in get_graph_results. Error: {str(e)}")
        raise Exception(f"graph_query module: An error occurred in get_graph_results. Please check the logs for more details.") from e



