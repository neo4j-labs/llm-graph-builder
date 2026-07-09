from pydantic import BaseModel, Field
from typing import Optional, Dict
from fastapi import Form, HTTPException, Request

# Server-side credential cache keyed by user email
# More reliable than session cookies for SSE/EventSource requests
_credentials_cache: Dict[str, dict] = {}

class Neo4jCredentials(BaseModel):
    """
    Neo4j database credentials model with validation.
    Used as a dependency for FastAPI endpoints requiring database access.
    """
    uri: Optional[str] = Field(None, description="Neo4j database URI")
    userName: Optional[str] = Field(None, description="Neo4j username")
    password: Optional[str] = Field(None, description="Neo4j password")
    database: Optional[str] = Field(None, description="Neo4j database name")
    email: Optional[str] = Field(None, description="User email for logging")

    def validate_required(self) -> None:
        """Validate that required credentials are present"""
        if not self.uri or not self.userName or not self.password:
            raise HTTPException(
                status_code=400,
                detail="Missing required credentials: uri, userName, and password are required"
            )

    class Config:
        """Pydantic configuration"""
        str_strip_whitespace = True  # Automatically strip whitespace from strings


async def get_neo4j_credentials(
    request: Request,
    uri: Optional[str] = Form(None),
    userName: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    database: Optional[str] = Form(None)
) -> Neo4jCredentials:
    """
    FastAPI dependency function to extract and validate Neo4j credentials from form data.
    Also stores credentials in server-side cache for SSE endpoints.
    
    Args:
        request: Incoming request, used to read the verified token email
        uri: Neo4j database URI
        userName: Neo4j username
        password: Neo4j password
        database: Neo4j database name (optional, defaults to neo4j)

    Returns:
        Neo4jCredentials: Validated credentials object

    Raises:
        HTTPException: If validation fails
    """
    # Extract email set by auth middleware
    token_email = getattr(request.state, "token_email", None)
    
    # Store credentials in server-side cache keyed by email
    # This allows SSE endpoints to retrieve credentials without relying on session cookies
    if token_email:
        _credentials_cache[token_email] = {
            "uri": uri,
            "userName": userName,
            "password": password,
            "database": database
        }
    
    return Neo4jCredentials(
        uri=uri,
        userName=userName,
        password=password,
        database=database,
        email=token_email
    )


async def get_neo4j_credentials_from_session(
    request: Request
) -> Neo4jCredentials:
    """
    FastAPI dependency function to extract Neo4j credentials from server-side cache.
    Used for GET requests and SSE endpoints where form data is not available.
    
    Security: Credentials are retrieved from server-side cache keyed by user email (from JWT).
    This avoids session cookie issues with EventSource/SSE requests.
    
    Args:
        request: Incoming request, used to read the verified token email

    Returns:
        Neo4jCredentials: Validated credentials object

    Raises:
        HTTPException: If credentials not found in cache
    """
    # Extract email set by auth middleware
    token_email = getattr(request.state, "token_email", None)
    
    if not token_email:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. No user email found in token."
        )
    
    # Get credentials from server-side cache
    cached_creds = _credentials_cache.get(token_email)
    
    if not cached_creds:
        raise HTTPException(
            status_code=401,
            detail="Neo4j credentials not found. Please connect to the database first via /connect or /upload endpoint."
        )
    
    return Neo4jCredentials(
        uri=cached_creds.get("uri"),
        userName=cached_creds.get("userName"),
        password=cached_creds.get("password"),
        database=cached_creds.get("database"),
        email=token_email
    )
