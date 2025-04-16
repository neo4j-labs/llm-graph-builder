from typing import List
from pydantic.v1 import BaseModel, Field
from src.llm import get_llm
from langchain_core.prompts import ChatPromptTemplate
import logging

class Schema(BaseModel):
    """Knowledge Graph Schema."""

    triplets: List[str] = Field(description="list of node labels and relationship types in a graph schema in <NodeType1>-<RELATIONSHIP_TYPE>-><NodeType2> format")

PROMPT_TEMPLATE_WITH_SCHEMA = (
    "You are an expert in schema extraction, especially for extracting graph schema information from various formats."
    "Generate the generalized graph schema based on input text. Identify key entities and their relationships and "
    "provide a generalized label for the overall context"
    "Schema representations formats can contain extra symbols, quotes, or comments. Ignore all that extra markup."
    "Only return the string types for nodes and relationships. Don't return attributes."
)

PROMPT_TEMPLATE_WITHOUT_SCHEMA = ( """
You are an expert in schema extraction, especially in identifying node and relationship types from example texts.
Analyze the following text and extract only the types of entities (node types) and their relationship types.
Do not return specific instances or attributes — only abstract schema information.
Return the result in the following format:
{{"triplets": ["<NodeType1>-<RELATIONSHIP_TYPE>-><NodeType2>"]}}
For example, if the text says “John works at Microsoft”, the output should be:
{{"triplets": ["Person-WORKS_AT->Company"]}}"
"""
)

PROMPT_TEMPLATE_FOR_LOCAL_STORAGE = ("""
You are an expert in knowledge graph modeling.
The user will provide a JSON input with two keys:
- "nodes": a list of objects with "label" and "value" representing node types in the schema.
- "rels": a list of objects with "label" and "value" representing relationship types in the schema.
Your task:
1. Understand the meaning of each node and relationship label.
2. Use them to generate logical triplets in the format:
<NodeType1>-<RELATIONSHIP_TYPE>-><NodeType2>
3. Only return a JSON list of strings like:
["User-ANSWERED->Question", "Question-ACCEPTED->Answer"]
Make sure each triplet is semantically meaningful.
"""
)

def get_schema_local_storage(input_text,llm):
    prompt = ChatPromptTemplate.from_messages(
    [("system", PROMPT_TEMPLATE_FOR_LOCAL_STORAGE), ("user", "{text}")]
    )
    
    runnable = prompt | llm.with_structured_output(
        schema=Schema,
        method="function_calling",
        include_raw=False,
    )
    
    raw_schema = runnable.invoke({"text": input_text})
    return raw_schema


def schema_extraction_from_text(input_text:str, model:str, is_schema_description_checked:bool,is_local_storage:bool):
    try:
        llm, model_name = get_llm(model)
        if str(is_local_storage).lower().strip() == "true":
            raw_schema = get_schema_local_storage(input_text,llm)
            return raw_schema
        if str(is_schema_description_checked).lower().strip() == "true":
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
        if raw_schema:
            return raw_schema
        else:
            raise Exception("Unable to get schema from text for given model")
    except Exception as e:
        logging.info(str(e))
        raise Exception(str(e))