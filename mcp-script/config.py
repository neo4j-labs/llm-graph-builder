"""
Configuration file for MCP Neo4j testing script
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Neo4j Database Configuration
NEO4J_CONFIG = {
    "uri": os.getenv("NEO4J_URI", "neo4j+s://9379df68.databases.neo4j.io:7687"),
    "username": os.getenv("NEO4J_USERNAME", "neo4j"),
    "password": os.getenv("NEO4J_PASSWORD", None),  # Set this in .env file
    "database": os.getenv("NEO4J_DATABASE", "neo4j")
}

# OpenAI Configuration
OPENAI_CONFIG = {
    "api_key": os.getenv("OPENAI_API_KEY", None),  # Set this in .env file
    "model": os.getenv("OPENAI_MODEL", "gpt-4"),
    "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
}

# MCP Configuration
MCP_CONFIG = {
    "server_name": "neo4j-cypher",
    "timeout": 30
}

def validate_config():
    """Validate that required configuration is present"""
    errors = []
    
    if not NEO4J_CONFIG["password"]:
        errors.append("NEO4J_PASSWORD is required")
    
    if not OPENAI_CONFIG["api_key"]:
        errors.append("OPENAI_API_KEY is required")
    
    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")
    
    return True
