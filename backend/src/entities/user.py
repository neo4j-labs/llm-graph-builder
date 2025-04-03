from pydantic import BaseModel

class user_info(BaseModel):
    chunk_limits:int
    readonly:bool
    rate_limit:int
    remaining_limit:int
    is_chunk_limit_applicable:bool