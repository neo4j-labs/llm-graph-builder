from pydantic import BaseModel
from typing import Optional

class user_info(BaseModel):
    chunk_limits:Optional[int] = 50
    readonly:Optional[bool] = False
    rate_limit:Optional[int] = 100000
    remaining_limit:Optional[int] = 100000
    is_chunk_limit_applicable:Optional[bool] = True