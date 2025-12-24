import os
from langchain_neo4j import Neo4jGraph
import logging

def reset_all_users_monthly_tokens():
    """
    Reset the `monthly_tokens_used` field to zero for all `User` nodes in Neo4j.
    This function connects to the configured Neo4j database using credentials
    provided via environment variables, executes a Cypher query that sets
    `u.monthly_tokens_used = 0` for every `User` node, and prints the number
    of users that were updated.
    Environment variables:
        NEO4J_URI: The Neo4j connection URI.
        NEO4J_USERNAME: The Neo4j username.
        NEO4J_PASSWORD: The Neo4j password.
        NEO4J_DATABASE: Optional. The Neo4j database name (defaults to "neo4j").
    Raises:
        KeyError: If any required environment variable (URI, USERNAME, PASSWORD)
            is not set.
        Exception: Propagates any connection or query errors raised by
            :class:`Neo4jGraph`.
    """
    try:
        uri = os.environ["NEO4J_URI"]
        username = os.environ["NEO4J_USERNAME"]
        password = os.environ["NEO4J_PASSWORD"]
        database = os.environ.get("NEO4J_DATABASE", "neo4j")
    except KeyError as e:
        logging.error("Missing required environment variable: %s", e.args[0])
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
    SET u.monthly_tokens_used = 0
    RETURN count(u) AS updated_count
    """
    try:
        result = graph.query(query)
    except Exception as e:
        logging.error("Failed to execute monthly token reset query: %s", e)
        return
    try:
        updated_count = result[0]["updated_count"]
    except (IndexError, KeyError, TypeError) as e:
        logging.error("Unexpected result format from monthly token reset query: %s", e)
        return
    logging.info(f"Updated {updated_count} users")
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    reset_all_users_monthly_tokens()
