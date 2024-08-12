from typing import List
from langchain_core.pydantic_v1 import BaseModel, Field
from src.llm import get_llm
from src.shared.constants import MODEL_VERSIONS
from langchain_core.prompts import ChatPromptTemplate

class Schema(BaseModel):
    """Knowledge Graph Schema."""

    labels: List[str] = Field(description="list of node labels or types in a graph schema")
    relationshipTypes: List[str] = Field(description="list of relationship types in a graph schema")

PROMPT_TEMPLATE_WITH_SCHEMA = (
    "You are an expert in schema extraction, especially for extracting graph schema information from various formats."
    "Generate the generalized graph schema based on input text. Identify key entities and their relationships and "
    "provide a generalized label for the overall context"
    "Schema representations formats can contain extra symbols, quotes, or comments. Ignore all that extra markup."
    "Only return the string types for nodes and relationships. Don't return attributes."
)

PROMPT_TEMPLATE_WITHOUT_SCHEMA = (
    "You are an expert in schema extraction, especially for deriving graph schema information from example texts."
    "Analyze the following text and extract only the types of entities and relationships from the example prose."
    "Don't return any actual entities like people's names or instances of organizations."
    "Only return the string types for nodes and relationships, don't return attributes."
)

def schema_extraction_from_text(input_text:str, model:str, is_schema_description_cheked:bool):
    
    llm, model_name = get_llm(model)
    if is_schema_description_cheked:
        schema_prompt = PROMPT_TEMPLATE_WITH_SCHEMA
    else:
        schema_prompt = PROMPT_TEMPLATE_WITHOUT_SCHEMA
        
    prompt = ChatPromptTemplate.from_messages(
    [("system", schema_prompt), ("user", "{text}")]
    )
    
    runnable = prompt | llm.with_structured_output(
        schema=Schema,
        method="function_calling",
        include_raw=False,
    )
    
    raw_schema = runnable.invoke({"text": input_text})
    return raw_schema