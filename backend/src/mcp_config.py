"""
MCP Server Configuration
Automatic configuration based on environment variables
"""

import os
from typing import Dict, Any

class MCPConfig:
    """Configuration manager for MCP Neo4j server"""
    
    def __init__(self):
        """Initialize MCP configuration based on environment variables"""
        self.server_url = self._get_server_url()
        self.use_local_process = self._should_use_local()
        self.timeout = 30.0
        
    def _get_server_url(self) -> str:
        """Get server URL from environment or default to remote"""
        # Check if remote server URL is provided
        remote_url = os.getenv("MCP_SERVER_URL")
        if remote_url:
            # Ensure remote URL has /mcp/ path
            if not remote_url.endswith("/mcp/"):
                if not remote_url.endswith("/"):
                    remote_url += "/"
                if not remote_url.endswith("mcp/"):
                    remote_url += "mcp/"
            return remote_url
        
        # Default to local server if no remote URL provided
        return "http://localhost:8001/api/mcp/"
    
    def _should_use_local(self) -> bool:
        """Check if should use local server (no remote URL provided)"""
        return not bool(os.getenv("MCP_SERVER_URL"))
    
    def get_local_server_args(self, neo4j_config: Dict[str, str]) -> list:
        """Get command line arguments for starting local MCP server"""
        if not self.use_local_process:
            raise ValueError("Cannot get local server args when using remote server")
        
        return [
            "mcp-neo4j-cypher",
            "--transport", "http",
            "--server-host", "127.0.0.1",
            "--server-port", "8001",
            "--server-path", "/api/mcp/",
            "--db-url", neo4j_config["uri"],
            "--username", neo4j_config["username"],
            "--password", neo4j_config["password"],
            "--database", neo4j_config["database"]
        ]
    
    def get_description(self) -> str:
        """Get human-readable description of current configuration"""
        if self.use_local_process:
            return "Local MCP Neo4j server"
        else:
            return f"Remote MCP Neo4j server at {self.server_url}"

# Global configuration instance
mcp_config = MCPConfig()

def get_mcp_config() -> MCPConfig:
    """Get the global MCP configuration instance"""
    return mcp_config

def get_server_url() -> str:
    """Get current server URL"""
    return mcp_config.server_url

def should_start_local_process() -> bool:
    """Check if should start local process"""
    return mcp_config.use_local_process

def get_timeout() -> float:
    """Get current timeout setting"""
    return mcp_config.timeout
