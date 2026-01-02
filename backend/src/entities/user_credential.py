from pydantic import BaseModel
from typing import Optional

class Neo4jCredentials(BaseModel):
    uri: Optional[str] = None
    userName: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    email: Optional[str] = None