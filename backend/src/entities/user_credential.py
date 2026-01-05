from pydantic import BaseModel, Field, validator
from typing import Optional
from fastapi import Form, HTTPException

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

    @validator('uri')
    def validate_uri(cls, v):
        """Validate that URI starts with neo4j:// or neo4j+s:// or bolt://"""
        if v and not any(v.startswith(prefix) for prefix in ['neo4j://', 'neo4j+s://', 'neo4j+ssc://', 'bolt://', 'bolt+s://', 'bolt+ssc://']):
            raise ValueError('URI must start with neo4j://, neo4j+s://, bolt://, or bolt+s://')
        return v

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
    uri: Optional[str] = Form(None),
    userName: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    database: Optional[str] = Form(None),
    email: Optional[str] = Form(None)
) -> Neo4jCredentials:
    """
    FastAPI dependency function to extract and validate Neo4j credentials from form data.
    
    Args:
        uri: Neo4j database URI
        userName: Neo4j username
        password: Neo4j password  
        database: Neo4j database name (optional, defaults to neo4j)
        email: User email for logging purposes
    
    Returns:
        Neo4jCredentials: Validated credentials object
    
    Raises:
        HTTPException: If validation fails
    """
    return Neo4jCredentials(
        uri=uri,
        userName=userName,
        password=password,
        database=database,
        email=email
    )