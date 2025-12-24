import os
from langchain_neo4j import Neo4jGraph
import logging

def reset_all_users_daily_tokens():
    """
    Reset the daily token usage for all users in the Neo4j database.

    This function connects to the configured Neo4j instance using the
    `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and optional
    `NEO4J_DATABASE` environment variables. It sets the `daily_tokens_used`
    property to 0 on all nodes with the `User` label, then logs the number
    of affected users.

    Raises:
        KeyError: If any of the required Neo4j environment variables
            (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`) are missing.
        Exception: If connecting to Neo4j or executing the query fails. The
            exact exception type depends on the underlying Neo4j driver and
            `Neo4jGraph` implementation.
    """
    try:
        uri = os.environ["NEO4J_URI"]
        username = os.environ["NEO4J_USERNAME"]
        password = os.environ["NEO4J_PASSWORD"]
        database = os.environ.get("NEO4J_DATABASE", "neo4j")
    except KeyError as e:
        # Missing required environment variable
        logging.error("Failed to reset daily tokens: missing environment variable %s", e.args[0])
        return
    try:
        graph = Neo4jGraph(
            url=uri,
            username=username,
            password=password,
            database=database,
        )
    except Exception as e:
        logging.error("Failed to initialize Neo4jGraph: %s", e)
        return
    
    query = """
    MATCH (u:User)
    SET u.daily_tokens_used = 0
    RETURN count(u) AS updated_count
    """
    try:
        result = graph.query(query)
    except Exception as e:
        logging.error("Failed to execute daily token reset query: %s", e)
        return
    try:
        updated_count = result[0]["updated_count"]
    except (IndexError, KeyError, TypeError) as e:
        logging.error("Unexpected result format from daily token reset query: %s", e)
        return
    logging.info("Updated %s users", updated_count)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    reset_all_users_daily_tokens()
