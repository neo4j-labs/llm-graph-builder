from pydantic import BaseModel
from typing import Optional

class user_info(BaseModel):
    email:Optional[str] = ""
    db_url:Optional[str] = ""
    daily_tokens_limit:Optional[int] = 250000
    daily_tokens_used:Optional[int] = 0
    monthly_tokens_limit:Optional[int] = 1000000
    monthly_tokens_used:Optional[int] = 0
    total_tokens_used:Optional[int] = 0
    is_neo4j_user:Optional[bool] = False
    lastUsedModel:Optional[str] = ""
    prevTokenUsage:Optional[int] = 0
    createdAt:Optional[str] = ""
    updatedAt:Optional[str] = ""