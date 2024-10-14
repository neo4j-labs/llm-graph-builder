from neo4j import GraphDatabase
import logging
import time
from langchain_community.graphs import Neo4jGraph
import os
from src.shared.common_fn import load_embedding_model

DROP_INDEX_QUERY = "DROP INDEX entities IF EXISTS;"
LABELS_QUERY = "CALL db.labels()"
FULL_TEXT_QUERY = "CREATE FULLTEXT INDEX entities FOR (n{labels_str}) ON EACH [n.id, n.description];"
FILTER_LABELS = ["Chunk","Document","__Community__"]

HYBRID_SEARCH_INDEX_DROP_QUERY = "DROP INDEX keyword IF EXISTS;"
HYBRID_SEARCH_FULL_TEXT_QUERY = "CREATE FULLTEXT INDEX keyword FOR (n:Chunk) ON EACH [n.text]" 

COMMUNITY_INDEX_DROP_QUERY = "DROP INDEX community_keyword IF EXISTS;"
COMMUNITY_INDEX_FULL_TEXT_QUERY = "CREATE FULLTEXT INDEX community_keyword FOR (n:`__Community__`) ON EACH [n.summary]" 

CHUNK_VECTOR_INDEX_NAME = "vector"
CHUNK_VECTOR_EMBEDDING_DIMENSION = 384

DROP_CHUNK_VECTOR_INDEX_QUERY = f"DROP INDEX {CHUNK_VECTOR_INDEX_NAME} IF EXISTS;"
CREATE_CHUNK_VECTOR_INDEX_QUERY = """
CREATE VECTOR INDEX {index_name} IF NOT EXISTS FOR (c:Chunk) ON c.embedding
OPTIONS {{
  indexConfig: {{
    `vector.dimensions`: {embedding_dimension},
    `vector.similarity_function`: 'cosine'
  }}
}}
"""

def create_vector_index(driver, index_type, embedding_dimension=None):
    drop_query = ""
    query = ""
    
    if index_type == CHUNK_VECTOR_INDEX_NAME:
        drop_query = DROP_CHUNK_VECTOR_INDEX_QUERY
        query = CREATE_CHUNK_VECTOR_INDEX_QUERY.format(
            index_name=CHUNK_VECTOR_INDEX_NAME,
            embedding_dimension=embedding_dimension if embedding_dimension else CHUNK_VECTOR_EMBEDDING_DIMENSION
        )
    else:
        logging.error(f"Invalid index type provided: {index_type}")
        return

    try:
        logging.info("Starting the process to create vector index.")
        with driver.session() as session:
            try:
                start_step = time.time()
                session.run(drop_query)
                logging.info(f"Dropped existing index (if any) in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to drop index: {e}")
                return

            try:
                start_step = time.time()
                session.run(query)
                logging.info(f"Created vector index in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to create vector index: {e}")
                return  
    except Exception as e:
        logging.error("An error occurred while creating the vector index.", exc_info=True)
        logging.error(f"Error details: {str(e)}")

def create_fulltext(driver,type):

    start_time = time.time()
    try:
        with driver.session() as session:
            try:
                start_step = time.time()
                if type == "entities":
                    drop_query = DROP_INDEX_QUERY
                elif type == "hybrid":
                    drop_query = HYBRID_SEARCH_INDEX_DROP_QUERY
                else:
                    drop_query = COMMUNITY_INDEX_DROP_QUERY
                session.run(drop_query)
                logging.info(f"Dropped existing index (if any) in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to drop index: {e}")
                return
            try:
                if type == "entities":
                    start_step = time.time()
                    result = session.run(LABELS_QUERY)
                    labels = [record["label"] for record in result]
                    
                    for label in FILTER_LABELS:
                        if label in labels:
                            labels.remove(label)
                    if labels:
                        labels_str = ":" + "|".join([f"`{label}`" for label in labels])
                        logging.info(f"Fetched labels in {time.time() - start_step:.2f} seconds.")
                    else:
                        logging.info("Full text index is not created as labels are empty")
                        return
            except Exception as e:
                logging.error(f"Failed to fetch labels: {e}")
                return
            try:
                start_step = time.time()
                if type == "entities":
                    fulltext_query = FULL_TEXT_QUERY.format(labels_str=labels_str)
                elif type == "hybrid":
                    fulltext_query = HYBRID_SEARCH_FULL_TEXT_QUERY
                else:
                    fulltext_query = COMMUNITY_INDEX_FULL_TEXT_QUERY

                session.run(fulltext_query)
                logging.info(f"Created full-text index in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to create full-text index: {e}")
                return
    except Exception as e:
        logging.error(f"An error occurred during the session: {e}")
    finally:
        logging.info(f"Process completed in {time.time() - start_time:.2f} seconds.")


def create_vector_fulltext_indexes(uri, username, password, database):
    types = ["entities", "hybrid"]
    logging.info("Starting the process of creating full-text indexes.")

    try:
        driver = GraphDatabase.driver(uri, auth=(username, password), database=database)
        driver.verify_connectivity()
        logging.info("Database connectivity verified.")
    except Exception as e:
        logging.error(f"Error connecting to the database: {e}")
        return

    for index_type in types:
        try:
            logging.info(f"Creating a full-text index for type '{index_type}'.")
            create_fulltext(driver, index_type)
            logging.info(f"Full-text index for type '{index_type}' created successfully.")
        except Exception as e:
            logging.error(f"Failed to create full-text index for type '{index_type}': {e}")

    try:
        logging.info(f"Creating a vector index for type '{CHUNK_VECTOR_INDEX_NAME}'.")
        create_vector_index(driver, CHUNK_VECTOR_INDEX_NAME,CHUNK_VECTOR_EMBEDDING_DIMENSION)
        logging.info("Vector index for chunk created successfully.")
    except Exception as e:
        logging.error(f"Failed to create vector index for '{CHUNK_VECTOR_INDEX_NAME}': {e}")

    try:
        driver.close()
        logging.info("Driver closed successfully.")
    except Exception as e:
        logging.error(f"Error closing the driver: {e}")

    logging.info("Full-text and vector index creation process completed.")


def create_entity_embedding(graph:Neo4jGraph):
    rows = fetch_entities_for_embedding(graph)
    for i in range(0, len(rows), 1000):
        update_embeddings(rows[i:i+1000],graph)
            
def fetch_entities_for_embedding(graph):
    query = """
                MATCH (e)
                WHERE NOT (e:Chunk OR e:Document OR e:`__Community__`) AND e.embedding IS NULL AND e.id IS NOT NULL
                RETURN elementId(e) AS elementId, e.id + " " + coalesce(e.description, "") AS text
                """
    result = graph.query(query)           
    return [{"elementId": record["elementId"], "text": record["text"]} for record in result]

def update_embeddings(rows, graph):
    embedding_model = os.getenv('EMBEDDING_MODEL')
    embeddings, dimension = load_embedding_model(embedding_model)
    logging.info(f"update embedding for entities")
    for row in rows:
        row['embedding'] = embeddings.embed_query(row['text'])                        
    query = """
      UNWIND $rows AS row
      MATCH (e) WHERE elementId(e) = row.elementId
      CALL db.create.setNodeVectorProperty(e, "embedding", row.embedding)
      """  
    return graph.query(query,params={'rows':rows})          