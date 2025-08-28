import logging
from neo4j import time 
from neo4j import GraphDatabase
import os
import json

from src.shared.constants import GRAPH_CHUNK_LIMIT,GRAPH_QUERY,CHUNK_TEXT_QUERY,COUNT_CHUNKS_QUERY,SCHEMA_VISUALIZATION_QUERY

def get_graphDB_driver(uri, username, password,database="neo4j"):
    """
    Creates and returns a Neo4j database driver instance configured with the provided credentials.

    Returns:
    Neo4j.Driver: A driver object for interacting with the Neo4j database.

    """
    try:
        logging.info(f"Attempting to connect to the Neo4j database at {uri}")
        if all(v is None for v in [username, password]):
            username= os.getenv('NEO4J_USERNAME')
            database= os.getenv('NEO4J_DATABASE')
            password= os.getenv('NEO4J_PASSWORD')

        enable_user_agent = os.environ.get("ENABLE_USER_AGENT", "False").lower() in ("true", "1", "yes")
        if enable_user_agent:
            driver = GraphDatabase.driver(uri, auth=(username, password),database=database, user_agent=os.environ.get('NEO4J_USER_AGENT'))
        else:
            driver = GraphDatabase.driver(uri, auth=(username, password),database=database)
        logging.info("Connection successful")
        return driver
    except Exception as e:
        error_message = f"graph_query module: Failed to connect to the database at {uri}."
        logging.error(error_message, exc_info=True)


def execute_query(driver, query,document_names,doc_limit=None):
    """
    Executes a specified query using the Neo4j driver, with parameters based on the presence of a document name.

    Returns:
    tuple: Contains records, summary of the execution, and keys of the records.
    """
    try:
        if document_names:
            logging.info(f"Executing query for documents: {document_names}")
            records, summary, keys = driver.execute_query(query, document_names=document_names)
        else:
            logging.info(f"Executing query with a document limit of {doc_limit}")
            records, summary, keys = driver.execute_query(query, doc_limit=doc_limit)
        return records, summary, keys
    except Exception as e:
        error_message = f"graph_query module: Failed to execute the query. Error: {str(e)}"
        logging.error(error_message, exc_info=True)


def process_node(node, preserve_text=False):
    """
    Processes a node from a Neo4j database, extracting its ID, labels, and properties,
    while omitting certain properties like 'embedding' and 'text' (unless preserve_text=True).

    Args:
        node: Neo4j node object
        preserve_text: If True, preserve text content (useful for chunk extraction)

    Returns:
    dict: A dictionary with the node's element ID, labels, and other properties,
          with datetime objects formatted as ISO strings.
    """
    try:
        labels = set(node.labels)
        labels.discard("__Entity__")
        if not labels:
            labels.add('*')
        
        node_element = {
            "element_id": node.element_id,
            "labels": list(labels),
            "properties": {}
        }
        # logging.info(f"Processing node with element ID: {node.element_id}")

        for key in node:
            # Skip embedding and summary, but preserve text if requested
            if key in ["embedding", "summary"] or (key == "text" and not preserve_text):
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


def get_completed_documents(driver):
    """
    Retrieves the names of all documents with the status 'Completed' from the database.
    """
    docs_query = "MATCH(node:Document {status:'Completed'}) RETURN node"
    
    try:
        logging.info("Executing query to retrieve completed documents.")
        records, summary, keys = driver.execute_query(docs_query)
        logging.info(f"Query executed successfully, retrieved {len(records)} records.")
        documents = [record["node"]["fileName"] for record in records]
        logging.info("Document names extracted successfully.")
        
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        documents = []
    
    return documents


def get_graph_results(uri, username, password,database,document_names):
    """
    Retrieves graph data by executing a specified Cypher query using credentials and parameters provided.
    Processes the results to extract nodes and relationships and packages them in a structured output.

    Args:
    uri (str): The URI for the Neo4j database.
    username (str): The username for authentication.
    password (str): The password for authentication.
    query_type (str): The type of query to be executed.
    document_name (str, optional): The name of the document to specifically query for, if any. Default is None.

    Returns:
    dict: Contains the session ID, user-defined messages with nodes and relationships, and the user module identifier.
    """
    try:
        logging.info(f"Starting graph query process")
        driver = get_graphDB_driver(uri, username, password,database)  
        document_names= list(map(str, json.loads(document_names)))
        query = GRAPH_QUERY.format(graph_chunk_limit=GRAPH_CHUNK_LIMIT)
        records, summary , keys = execute_query(driver, query.strip(), document_names)
        document_nodes = extract_node_elements(records)
        document_relationships = extract_relationships(records)

        logging.info(f"no of nodes : {len(document_nodes)}")
        logging.info(f"no of relations : {len(document_relationships)}")
        result = {
            "nodes": document_nodes,
            "relationships": document_relationships
        }

        logging.info(f"Query process completed successfully")
        return result
    except Exception as e:
        logging.error(f"graph_query module: An error occurred in get_graph_results. Error: {str(e)}")
        raise Exception(f"graph_query module: An error occurred in get_graph_results. Please check the logs for more details.") from e
    finally:
        logging.info("Closing connection for graph_query api")
        driver.close()


def get_chunktext_results(uri, username, password, database, document_name, page_no):
   """Retrieves chunk text, position, and page number from graph data with pagination."""
   driver = None
   try:
       logging.info("Starting chunk text query process")
       offset = 10
       skip = (page_no - 1) * offset
       limit = offset
       driver = get_graphDB_driver(uri, username, password,database)  
       with driver.session(database=database) as session:
           total_chunks_result = session.run(COUNT_CHUNKS_QUERY, file_name=document_name)
           total_chunks = total_chunks_result.single()["total_chunks"]
           total_pages = (total_chunks + offset - 1) // offset  # Calculate total pages
           records = session.run(CHUNK_TEXT_QUERY, file_name=document_name, skip=skip, limit=limit)
           pageitems = [
               {
                   "text": record["chunk_text"],
                   "position": record["chunk_position"],
                   "pagenumber": record["page_number"]
               }
               for record in records
           ]
           logging.info(f"Query process completed with {len(pageitems)} chunks retrieved")
           return {
               "pageitems": pageitems,
               "total_pages": total_pages
           }
   except Exception as e:
       logging.error(f"An error occurred in get_chunktext_results. Error: {str(e)}")
       raise Exception("An error occurred in get_chunktext_results. Please check the logs for more details.") from e
   finally:
       if driver:
           driver.close()


def visualize_schema(uri, userName, password, database):
   """Retrieves graph schema"""
   driver = None
   try:
       logging.info("Starting visualizing graph schema")
       driver = get_graphDB_driver(uri, userName, password,database)  
       records, summary, keys = driver.execute_query(SCHEMA_VISUALIZATION_QUERY)
       nodes = records[0].get("nodes", [])
       relationships = records[0].get("relationships", [])
       result = {"nodes": nodes, "relationships": relationships}
       return result
   except Exception as e:
       logging.error(f"An error occurred schema retrieval. Error: {str(e)}")
       raise Exception(f"An error occurred schema retrieval. Error: {str(e)}")
   finally:
       if driver:
           driver.close()

# Search and retreive nodes
def check_vector_availability(driver, node_type="Person"):
    """
    Check if vector embeddings exist for the specified node type.
    
    Args:
        driver: Neo4j driver instance
        node_type (str): The type of node to check
    
    Returns:
        dict: Contains availability info and sample data
    """
    try:
        # Check if any nodes of this type have embeddings
        check_query = f"""
        MATCH (n:__Entity__)
        WHERE '{node_type}' IN labels(n)
        WITH count(n) as total_nodes,
             count(CASE WHEN n.embedding IS NOT NULL THEN n END) as nodes_with_embeddings
        RETURN total_nodes, nodes_with_embeddings,
               CASE WHEN nodes_with_embeddings > 0 THEN true ELSE false END as has_embeddings
        """
        
        records, summary, keys = driver.execute_query(check_query)
        
        if records:
            result = records[0]
            return {
                "has_embeddings": result["has_embeddings"],
                "total_nodes": result["total_nodes"],
                "nodes_with_embeddings": result["nodes_with_embeddings"],
                "embedding_coverage": result["nodes_with_embeddings"] / result["total_nodes"] if result["total_nodes"] > 0 else 0
            }
        return {"has_embeddings": False, "total_nodes": 0, "nodes_with_embeddings": 0, "embedding_coverage": 0}
        
    except Exception as e:
        logging.error(f"Error checking vector availability: {str(e)}")
        return {"has_embeddings": False, "total_nodes": 0, "nodes_with_embeddings": 0, "embedding_coverage": 0}

def search_nodes_with_vector(driver, search_term, node_type="Person", max_results=50, similarity_threshold=0.3):
    """
    Search for nodes using vector similarity with improved semantic matching.
    
    Args:
        driver: Neo4j driver instance
        search_term (str): The search term
        node_type (str): The type of node to search for
        max_results (int): Maximum number of results
        similarity_threshold (float): Minimum similarity score (lowered for better semantic matching)
    
    Returns:
        list: Matching nodes with similarity scores
    """
    try:
        # Import embedding function here to avoid circular imports
        from src.shared.common_fn import load_embedding_model
        import os
        
        # Load embedding model
        embedding_model = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
        embeddings, dimension = load_embedding_model(embedding_model)
        
        # Create embedding for search term
        search_embedding = embeddings.embed_query(search_term)
        
        # Enhanced vector similarity search query with better semantic matching
        vector_search_query = f"""
        MATCH (n:__Entity__)
        WHERE '{node_type}' IN labels(n)
          AND n.embedding IS NOT NULL
        WITH n, vector.similarity.cosine(n.embedding, $search_embedding) AS similarity
        WHERE similarity > $similarity_threshold
        RETURN n, similarity
        ORDER BY similarity DESC
        LIMIT $max_results
        """
        
        records, summary, keys = driver.execute_query(
            vector_search_query,
            search_embedding=search_embedding,
            similarity_threshold=similarity_threshold,
            max_results=max_results
        )
        
        matching_nodes = []
        for record in records:
            node = record["n"]
            similarity = record["similarity"]
            node_element = process_node(node)
            node_element["similarity_score"] = round(similarity, 4)
            node_element["search_method"] = "vector_similarity"
            matching_nodes.append(node_element)
        
        return matching_nodes
        
    except Exception as e:
        logging.error(f"Error in vector similarity search: {str(e)}")
        return []

def search_nodes_with_fuzzy_text(driver, search_term, node_type="Person", max_results=50):
    """
    Search for nodes using fuzzy text matching for better name variations.
    
    Args:
        driver: Neo4j driver instance
        search_term (str): The search term
        node_type (str): The type of node to search for
        max_results (int): Maximum number of results
    
    Returns:
        list: Matching nodes
    """
    try:
        # Split search term into words for better matching
        search_words = search_term.lower().split()
        
        # Create a more flexible text search query
        fuzzy_search_query = f"""
        MATCH (n:__Entity__)
        WHERE '{node_type}' IN labels(n)
        WITH n, toLower(n.id) as node_id_lower
        WITH n, node_id_lower,
             size([word IN $search_words WHERE node_id_lower CONTAINS word]) as word_matches,
             size($search_words) as total_words
        WHERE word_matches > 0
        WITH n, word_matches, total_words,
             toFloat(word_matches) / toFloat(total_words) as match_ratio
        WHERE match_ratio >= 0.5  // At least 50% of words must match
        RETURN n, match_ratio
        ORDER BY match_ratio DESC, n.id
        LIMIT $max_results
        """
        
        records, summary, keys = driver.execute_query(
            fuzzy_search_query,
            search_words=search_words,
            max_results=max_results
        )
        
        matching_nodes = []
        for record in records:
            node = record["n"]
            match_ratio = record["match_ratio"]
            node_element = process_node(node)
            node_element["match_ratio"] = round(match_ratio, 4)
            node_element["search_method"] = "fuzzy_text"
            matching_nodes.append(node_element)
        
        return matching_nodes
        
    except Exception as e:
        logging.error(f"Error in fuzzy text search: {str(e)}")
        return []

def search_nodes_with_text(driver, search_term, node_type="Person", max_results=50):
    """
    Search for nodes using text matching (original method).
    
    Args:
        driver: Neo4j driver instance
        search_term (str): The search term
        node_type (str): The type of node to search for
        max_results (int): Maximum number of results
    
    Returns:
        list: Matching nodes
    """
    try:
        search_query = f"""
        MATCH (n:__Entity__)
        WHERE '{node_type}' IN labels(n)
          AND toLower(n.id) CONTAINS toLower($search_term)
        RETURN n
        LIMIT $max_results
        """
        
        records, summary, keys = driver.execute_query(
            search_query,
            search_term=search_term,
            max_results=max_results
        )
        
        matching_nodes = []
        for record in records:
            node = record["n"]
            node_element = process_node(node)
            node_element["search_method"] = "text_match"
            matching_nodes.append(node_element)
        
        return matching_nodes
        
    except Exception as e:
        logging.error(f"Error in text search: {str(e)}")
        return []

def search_nodes(uri, username, password, database, search_term, node_type="Person", max_results=50, prefer_vector=True, use_hybrid=True):
    """
    Enhanced search function with hybrid approach combining vector and fuzzy text search.
    
    Args:
        uri (str): The URI for the Neo4j database.
        username (str): The username for authentication.
        password (str): The password for authentication.
        database (str): The database name.
        search_term (str): The search term to look for in node properties.
        node_type (str): The type of node to search for (default: "Person").
        max_results (int): Maximum number of results to return.
        prefer_vector (bool): Whether to prefer vector search over text search when both are available.
        use_hybrid (bool): Whether to use hybrid search combining vector and fuzzy text.
    
    Returns:
        dict: Contains matching nodes with their properties and search method info.
    """
    driver = None
    try:
        logging.info(f"Starting enhanced node search for term: '{search_term}' in node type: '{node_type}' (hybrid={use_hybrid})")
        driver = get_graphDB_driver(uri, username, password, database)
        
        # Step 1: Check vector availability
        vector_info = check_vector_availability(driver, node_type)
        logging.info(f"Vector availability check: {vector_info}")
        
        # Step 2: Perform hybrid search if enabled and vectors are available
        if use_hybrid and vector_info["has_embeddings"] and prefer_vector:
            logging.info("Using hybrid search (vector + fuzzy text)")
            
            # Get vector search results
            vector_nodes = search_nodes_with_vector(driver, search_term, node_type, max_results)
            
            # Get fuzzy text search results
            fuzzy_nodes = search_nodes_with_fuzzy_text(driver, search_term, node_type, max_results)
            
            # Combine and deduplicate results with adaptive scoring
            combined_nodes = combine_search_results(vector_nodes, fuzzy_nodes, max_results, vector_info["embedding_coverage"])
            
            search_method = "hybrid_vector_fuzzy"
            
        # Step 3: Fallback to single method search
        else:
            if vector_info["has_embeddings"] and prefer_vector:
                combined_nodes = search_nodes_with_vector(driver, search_term, node_type, max_results)
                search_method = "vector_similarity"
                logging.info(f"Using vector similarity search (coverage: {vector_info['embedding_coverage']:.2%})")
            else:
                combined_nodes = search_nodes_with_fuzzy_text(driver, search_term, node_type, max_results)
                if not combined_nodes:
                    combined_nodes = search_nodes_with_text(driver, search_term, node_type, max_results)
                search_method = "fuzzy_text" if combined_nodes and combined_nodes[0].get("search_method") == "fuzzy_text" else "text_match"
                logging.info("Using text-based search")
        
        logging.info(f"Found {len(combined_nodes)} matching nodes for search term: '{search_term}'")
        
        return {
            "search_term": search_term,
            "node_type": node_type,
            "total_results": len(combined_nodes),
            "nodes": combined_nodes,
            "search_method": search_method,
            "vector_info": vector_info,
            "search_metadata": {
                "prefer_vector": prefer_vector,
                "use_hybrid": use_hybrid,
                "vector_available": vector_info["has_embeddings"],
                "embedding_coverage": vector_info["embedding_coverage"]
            }
        }
        
    except Exception as e:
        logging.error(f"An error occurred in search_nodes. Error: {str(e)}")
        raise Exception(f"An error occurred in search_nodes. Please check the logs for more details.") from e
    finally:
        if driver:
            driver.close()

def combine_search_results(vector_nodes, fuzzy_nodes, max_results, embedding_coverage=0.0):
    """
    Combine and deduplicate search results from vector and fuzzy text search with adaptive scoring.
    
    Args:
        vector_nodes (list): Results from vector search
        fuzzy_nodes (list): Results from fuzzy text search
        max_results (int): Maximum number of results to return
        embedding_coverage (float): Percentage of nodes that have embeddings (0.0 to 1.0)
    
    Returns:
        list: Combined and deduplicated results
    """
    combined = {}
    
    # Add vector search results
    for node in vector_nodes:
        element_id = node["element_id"]
        if element_id not in combined:
            combined[element_id] = node
            combined[element_id]["search_method"] = "hybrid_vector_fuzzy"
            combined[element_id]["primary_method"] = "vector"
    
    # Add fuzzy text search results
    for node in fuzzy_nodes:
        element_id = node["element_id"]
        if element_id not in combined:
            combined[element_id] = node
            combined[element_id]["search_method"] = "hybrid_vector_fuzzy"
            combined[element_id]["primary_method"] = "fuzzy_text"
        else:
            # If already exists from vector search, add fuzzy match info
            existing = combined[element_id]
            if "fuzzy_match_ratio" not in existing:
                existing["fuzzy_match_ratio"] = node.get("match_ratio", 0)
    
    # Adaptive scoring based on embedding coverage
    sorted_results = []
    for node in combined.values():
        vector_score = node.get("similarity_score", 0)
        fuzzy_score = node.get("match_ratio", 0)
        
        # Adaptive weights based on embedding coverage
        if embedding_coverage < 0.1:  # Less than 10% coverage
            # Heavily favor fuzzy text when embeddings are scarce
            vector_weight = 0.1
            fuzzy_weight = 0.9
            logging.info(f"Low embedding coverage ({embedding_coverage:.1%}), favoring fuzzy text")
        elif embedding_coverage < 0.5:  # Less than 50% coverage
            # Balance towards fuzzy text
            vector_weight = 0.3
            fuzzy_weight = 0.7
            logging.info(f"Medium embedding coverage ({embedding_coverage:.1%}), balanced approach")
        else:  # 50%+ coverage
            # Favor vector search when embeddings are abundant
            vector_weight = 0.7
            fuzzy_weight = 0.3
            logging.info(f"High embedding coverage ({embedding_coverage:.1%}), favoring vector search")
        
        # Calculate combined score with adaptive weights
        combined_score = (vector_score * vector_weight) + (fuzzy_score * fuzzy_weight)
        node["combined_score"] = round(combined_score, 4)
        node["vector_weight"] = vector_weight
        node["fuzzy_weight"] = fuzzy_weight
        
        sorted_results.append(node)
    
    # Sort by combined score descending
    sorted_results.sort(key=lambda x: x["combined_score"], reverse=True)
    
    return sorted_results[:max_results]


def get_subgraph_from_node(uri, username, password, database, node_id, depth=4, max_nodes=1000, preserve_text=False):
    """
    Extracts a subgraph starting from a specific node with configurable depth.
    
    Args:
        uri (str): The URI for the Neo4j database.
        username (str): The username for authentication.
        password (str): The password for authentication.
        database (str): The database name.
        node_id (str): The element ID of the starting node.
        depth (int): The maximum depth of the subgraph (default: 4).
        max_nodes (int): Maximum number of nodes to include in the subgraph.
    
    Returns:
        dict: Contains the subgraph nodes and relationships.
    """
    try:
        logging.info(f"Extracting subgraph from node {node_id} with depth {depth}")
        driver = get_graphDB_driver(uri, username, password, database)
        
        # Subgraph extraction query - using string formatting for depth since Neo4j doesn't allow parameters in MATCH patterns
        subgraph_query = f"""
        MATCH (startNode)
        WHERE elementId(startNode) = $node_id
        MATCH path = (startNode)-[*1..{depth}]-(connectedNode)
        WITH startNode, collect(DISTINCT path) AS paths
        UNWIND paths AS path
        WITH startNode, path, nodes(path) AS pathNodes, relationships(path) AS pathRels
        UNWIND pathNodes AS node
        WITH startNode, path, pathRels, collect(DISTINCT node) AS allNodes
        UNWIND pathRels AS rel
        WITH startNode, allNodes, collect(DISTINCT rel) AS allRels
        
        // Also include Document nodes for chunks to get source URLs
        WITH startNode, allNodes, allRels
        OPTIONAL MATCH (c:Chunk)-[:PART_OF]->(d:Document)
        WHERE c IN allNodes
        WITH startNode, allNodes, collect(d) AS docNodes, allRels
        WITH startNode, allNodes + docNodes AS allNodes, allRels
        RETURN allNodes AS nodes, allRels AS relationships
        LIMIT $max_nodes
        """
        
        records, summary, keys = driver.execute_query(
            subgraph_query,
            node_id=node_id,
            max_nodes=max_nodes
        )
        
        if not records:
            logging.warning(f"No subgraph found for node {node_id}")
            return {"nodes": [], "relationships": []}
        
        # Process nodes and relationships
        all_nodes = set()
        all_relationships = set()
        
        for record in records:
            # Process nodes
            for node in record["nodes"]:
                node_element = process_node(node, preserve_text=preserve_text)
                all_nodes.add(json.dumps(node_element, sort_keys=True))
            
            # Process relationships
            for rel in record["relationships"]:
                rel_element = {
                    "element_id": rel.element_id,
                    "type": rel.type,
                    "start_node_id": rel.start_node.element_id,
                    "end_node_id": rel.end_node.element_id,
                    "properties": {}
                }
                
                for key in rel:
                    if key in ["embedding", "text", "summary"]:
                        continue
                    value = rel.get(key)
                    if isinstance(value, time.DateTime):
                        rel_element["properties"][key] = value.isoformat()
                    else:
                        rel_element["properties"][key] = value
                
                all_relationships.add(json.dumps(rel_element, sort_keys=True))
        
        # Convert back to dictionaries
        nodes = [json.loads(node_str) for node_str in all_nodes]
        relationships = [json.loads(rel_str) for rel_str in all_relationships]
        
        logging.info(f"Extracted subgraph with {len(nodes)} nodes and {len(relationships)} relationships")
        return {
            "start_node_id": node_id,
            "depth": depth,
            "nodes": nodes,
            "relationships": relationships
        }
        
    except Exception as e:
        logging.error(f"An error occurred in get_subgraph_from_node. Error: {str(e)}")
        raise Exception(f"An error occurred in get_subgraph_from_node. Please check the logs for more details.") from e
    finally:
        if driver:
            driver.close()


def search_and_get_subgraph(uri, username, password, database, search_term, node_type="Person", depth=4, max_results=10, extract_best_match_only=True, preserve_text=False):
    """
    Combines search and subgraph extraction in one operation.
    
    Args:
        uri (str): The URI for the Neo4j database.
        username (str): The username for authentication.
        password (str): The password for authentication.
        database (str): The database name.
        search_term (str): The search term to look for.
        node_type (str): The type of node to search for (default: "Person").
        depth (int): The maximum depth of the subgraph (default: 4).
        max_results (int): Maximum number of search results to process.
        extract_best_match_only (bool): Whether to extract subgraph only for the best match (default: True).
    
    Returns:
        dict: Contains search results and their subgraphs.
    """
    try:
        logging.info(f"Searching for '{search_term}' and extracting subgraphs")
        
        # First, search for matching nodes
        search_results = search_nodes(uri, username, password, database, search_term, node_type, max_results)
        
        if not search_results["nodes"]:
            return {
                "search_term": search_term,
                "node_type": node_type,
                "total_results": 0,
                "subgraphs": [],
                "best_match": None
            }
        
        # Log all matching nodes with their scores
        logging.info(f"Found {len(search_results['nodes'])} matching nodes:")
        for i, node in enumerate(search_results["nodes"][:5]):  # Log top 5 matches
            node_name = node.get('properties', {}).get('id', 'Unknown')
            combined_score = node.get('combined_score', 'N/A')
            similarity_score = node.get('similarity_score', 'N/A')
            match_ratio = node.get('match_ratio', 'N/A')
            search_method = node.get('search_method', 'unknown')
            
            logging.info(f"  {i+1}. {node_name}")
            logging.info(f"     Combined Score: {combined_score}")
            logging.info(f"     Vector Similarity: {similarity_score}")
            logging.info(f"     Fuzzy Match Ratio: {match_ratio}")
            logging.info(f"     Search Method: {search_method}")
        
        # Determine the best match
        best_match = search_results["nodes"][0]  # First result is the best match
        best_match_name = best_match.get('properties', {}).get('id', 'Unknown')
        best_match_score = best_match.get('combined_score', best_match.get('similarity_score', best_match.get('match_ratio', 'N/A')))
        
        logging.info(f"Selected best match: '{best_match_name}' with score: {best_match_score}")
        
        # Extract subgraphs based on configuration
        subgraphs = []
        nodes_to_extract = [best_match] if extract_best_match_only else search_results["nodes"][:max_results]
        
        for node in nodes_to_extract:
            try:
                logging.info(f"Extracting subgraph from node: {node.get('properties', {}).get('id', 'Unknown')}")
                subgraph = get_subgraph_from_node(
                    uri, username, password, database, 
                    node["element_id"], depth, preserve_text=preserve_text
                )
                subgraph["matching_node"] = node
                subgraphs.append(subgraph)
                
                if extract_best_match_only:
                    logging.info(f"Extracted subgraph with {len(subgraph.get('nodes', []))} nodes and {len(subgraph.get('relationships', []))} relationships")
                    break  # Only extract from best match
                    
            except Exception as e:
                logging.warning(f"Failed to extract subgraph for node {node['element_id']}: {str(e)}")
                continue
        
        return {
            "search_term": search_term,
            "node_type": node_type,
            "total_results": len(search_results["nodes"]),
            "subgraphs": subgraphs,
            "best_match": {
                "node_name": best_match_name,
                "score": best_match_score,
                "search_method": best_match.get('search_method', 'unknown'),
                "element_id": best_match.get('element_id')
            },
            "all_matches": [
                {
                    "node_name": node.get('properties', {}).get('id', 'Unknown'),
                    "score": node.get('combined_score', node.get('similarity_score', node.get('match_ratio', 'N/A'))),
                    "search_method": node.get('search_method', 'unknown'),
                    "element_id": node.get('element_id')
                }
                for node in search_results["nodes"][:5]  # Top 5 matches
            ]
        }
        
    except Exception as e:
        logging.error(f"An error occurred in search_and_get_subgraph. Error: {str(e)}")
        raise Exception(f"An error occurred in search_and_get_subgraph. Please check the logs for more details.") from e


def diagnose_database_entities(uri, username, password, database):
    """
    Diagnostic function to check what entities exist in the database.
    
    Args:
        uri (str): The URI for the Neo4j database.
        username (str): The username for authentication.
        password (str): The password for authentication.
        database (str): The database name.
    
    Returns:
        dict: Contains diagnostic information about entities in the database.
    """
    try:
        logging.info("Starting database entity diagnosis...")
        driver = get_graphDB_driver(uri, username, password, database)
        
        # Query to get all entity types and their counts based on labels
        entity_types_query = """
        MATCH (n:__Entity__)
        UNWIND labels(n) AS label
        WITH label
        WHERE label <> '__Entity__'
        RETURN label as entity_type, count(*) as count
        ORDER BY count DESC
        """
        
        # Query to get sample entities with their actual structure
        sample_entities_query = """
        MATCH (n:__Entity__)
        RETURN labels(n) as labels, n.id as id, n.name as name, n.description as description, n.type as type
        LIMIT 10
        """
        
        # Query to get all labels in the database
        labels_query = """
        CALL db.labels() YIELD label
        RETURN collect(label) as labels
        """
        
        logging.info("Executing diagnostic queries...")
        
        # Get entity types and counts
        entity_types_result = driver.execute_query(entity_types_query)
        entity_types = [{"type": record["entity_type"], "count": record["count"]} for record in entity_types_result[0]]
        
        # Get sample entities
        sample_entities_result = driver.execute_query(sample_entities_query)
        sample_entities = [{"labels": record["labels"], "id": record["id"], "name": record["name"], "description": record["description"], "type": record["type"]} for record in sample_entities_result[0]]
        
        # Get all labels
        labels_result = driver.execute_query(labels_query)
        all_labels = labels_result[0][0]["labels"] if labels_result[0] else []
        
        logging.info(f"Diagnosis completed. Found {len(entity_types)} entity types")
        
        return {
            "entity_types": entity_types,
            "sample_entities": sample_entities,
            "all_labels": all_labels,
            "total_entity_types": len(entity_types),
            "total_sample_entities": len(sample_entities)
        }
        
    except Exception as e:
        logging.error(f"An error occurred in diagnose_database_entities. Error: {str(e)}")
        raise Exception(f"An error occurred in diagnose_database_entities. Please check the logs for more details.") from e
    finally:
        if driver:
            driver.close()
