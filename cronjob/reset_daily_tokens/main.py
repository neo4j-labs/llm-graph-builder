import os
from langchain_neo4j import Neo4jGraph

def reset_all_users_daily_tokens():
    graph = Neo4jGraph(
        url=os.environ["NEO4J_URI"],
        username=os.environ["NEO4J_USERNAME"],
        password=os.environ["NEO4J_PASSWORD"],
        database=os.environ.get("NEO4J_DATABASE", "neo4j"),
    )

    query = """
    MATCH (u:User)
    SET u.daily_tokens_used = 0
    RETURN count(u) AS updated_count
    """

    result = graph.query(query)
    print(f"Updated {result[0]['updated_count']} users")

if __name__ == "__main__":
    reset_all_users_daily_tokens()
