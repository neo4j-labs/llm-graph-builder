from neo4j import GraphDatabase
import logging
import time


DROP_INDEX_QUERY = "DROP INDEX entities IF EXISTS;"
LABELS_QUERY = "CALL db.labels()"
FULL_TEXT_QUERY = "CREATE FULLTEXT INDEX entities FOR (n{labels_str}) ON EACH [n.id, n.description];"
FILTER_LABELS = ["Chunk","Document"]

def create_fulltext(uri, username, password, database):
    start_time = time.time()
    logging.info("Starting the process of creating a full-text index.")

    try:
        driver = GraphDatabase.driver(uri, auth=(username, password), database=database)
        driver.verify_connectivity()
        logging.info("Database connectivity verified.")
    except Exception as e:
        logging.error(f"Failed to create a database driver or verify connectivity: {e}")
        return

    try:
        with driver.session() as session:
            try:
                start_step = time.time()
                session.run(DROP_INDEX_QUERY)
                logging.info(f"Dropped existing index (if any) in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to drop index: {e}")
                return
            try:
                start_step = time.time()
                result = session.run(LABELS_QUERY)
                labels = [record["label"] for record in result]
                
                for label in FILTER_LABELS:
                    if label in labels:
                        labels.remove(label)
                
                labels_str = ":" + "|".join([f"`{label}`" for label in labels])
                logging.info(f"Fetched labels in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to fetch labels: {e}")
                return
            try:
                start_step = time.time()
                session.run(FULL_TEXT_QUERY.format(labels_str=labels_str))
                logging.info(f"Created full-text index in {time.time() - start_step:.2f} seconds.")
            except Exception as e:
                logging.error(f"Failed to create full-text index: {e}")
                return
    except Exception as e:
        logging.error(f"An error occurred during the session: {e}")
    finally:
        driver.close()
        logging.info("Driver closed.")
        logging.info(f"Process completed in {time.time() - start_time:.2f} seconds.")