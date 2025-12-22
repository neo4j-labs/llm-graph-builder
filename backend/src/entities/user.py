import os
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

def get_daily_limit():
    return int(os.getenv("DAILY_TOKENS_LIMIT", 250000))

def get_monthly_limit():
    return int(os.getenv("MONTHLY_TOKENS_LIMIT", 1000000))

class UserInfo(BaseModel):
    email: Optional[str] = None
    db_url: Optional[str] = None
    daily_tokens_limit: int = Field(default_factory=get_daily_limit)
    monthly_tokens_limit: int = Field(default_factory=get_monthly_limit)
    daily_tokens_used: int = 0
    monthly_tokens_used: int = 0
    total_tokens_used: int = 0
    is_neo4j_user: bool = False
    last_used_model: Optional[str] = None
    prev_token_usage: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None