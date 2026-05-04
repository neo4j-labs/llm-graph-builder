from neo4j import Driver, GraphDatabase

from src.entities.user_credential import Neo4jCredentials
from src.shared.common_fn import get_value_from_env


def get_neo4j_driver(credentials: Neo4jCredentials) -> Driver:
    if get_value_from_env("ENABLE_USER_AGENT", "False", "bool"):
        user_agent = get_value_from_env("USER_AGENT", "LLM-Graph-Builder")
        return GraphDatabase.driver(
            credentials.uri,
            auth=(credentials.userName, credentials.password),
            user_agent=user_agent,
        )
    return GraphDatabase.driver(
        credentials.uri,
        auth=(credentials.userName, credentials.password),
    )
