from datetime import datetime

class sourceNode:
    file_name:str
    file_size:int
    file_type:str
    file_source:str
    status:str
    url:str
    gcsBucket:str
    gcsBucketFolder:str
    awsAccessKeyId:str
    node_count:int
    relationship_count:str
    model:str
    created_at:datetime
    updated_at:datetime
    processing_time:float
    error_message:str