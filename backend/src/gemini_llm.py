from langchain_community.graphs import Neo4jGraph
from dotenv import load_dotenv
from langchain.schema import Document
import json
import logging
import re
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from typing import List
#from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_google_vertexai import ChatVertexAI
import vertexai
from typing import Any, List, Optional, Sequence
from langchain_community.graphs.graph_document import GraphDocument, Node, Relationship
from langchain_core.documents import Document
from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain.pydantic_v1 import BaseModel
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import ChatPromptTemplate
from typing import List, Dict
from langchain_core.pydantic_v1 import BaseModel, Field
import google.auth 
from langchain_community.graphs.graph_document import Node
from src.shared.common_fn import get_combined_chunks
import time
from langchain_google_vertexai import HarmBlockThreshold, HarmCategory

load_dotenv()
logging.basicConfig(format='%(asctime)s - %(message)s',level='DEBUG')

import asyncio
import json
from typing import Any, Dict, List, Optional, Sequence, Tuple, Type, cast

from langchain_community.graphs.graph_document import GraphDocument, Node, Relationship
from langchain_core.documents import Document
from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field

system_prompt = (
    "# Knowledge Graph Instructions for GPT-4\n"
    "## 1. Overview\n"
    "You are a top-tier algorithm designed for extracting information in structured "
    "formats to build a knowledge graph.\n"
    "Try to capture as much information from the text as possible without "
    "sacrifing accuracy. Do not add any information that is not explicitly "
    "mentioned in the text\n"
    "- **Nodes** represent entities and concepts.\n"
    "- The aim is to achieve simplicity and clarity in the knowledge graph, making it\n"
    "accessible for a vast audience.\n"
    "## 2. Labeling Nodes\n"
    "- **Consistency**: Ensure you use available types for node labels.\n"
    "Ensure you use basic or elementary types for node labels.\n"
    "- For example, when you identify an entity representing a person, "
    "always label it as **'person'**. Avoid using more specific terms "
    "like 'mathematician' or 'scientist'"
    "  - **Node IDs**: Never utilize integers as node IDs. Node IDs should be "
    "names or human-readable identifiers found in the text.\n"
    "- **Relationships** represent connections between entities or concepts.\n"
    "Ensure consistency and generality in relationship types when constructing "
    "knowledge graphs. Instead of using specific and momentary types "
    "such as 'BECAME_PROFESSOR', use more general and timeless relationship types "
    "like 'PROFESSOR'. Make sure to use general and timeless relationship types!\n"
    "## 3. Coreference Resolution\n"
    "- **Maintain Entity Consistency**: When extracting entities, it's vital to "
    "ensure consistency.\n"
    'If an entity, such as "John Doe", is mentioned multiple times in the text '
    'but is referred to by different names or pronouns (e.g., "Joe", "he"),'
    "always use the most complete identifier for that entity throughout the "
    'knowledge graph. In this example, use "John Doe" as the entity ID.\n'
    "Remember, the knowledge graph should be coherent and easily understandable, "
    "so maintaining consistency in entity references is crucial.\n"
    "## 4. Strict Compliance\n"
    "Adhere to the rules strictly. Non-compliance will result in termination."
)

default_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            system_prompt,
        ),
        (
            "human",
            (
                "Tip: Make sure to answer in the correct format and do "
                "not include any explanations. "
                "Use the given format to extract information from the "
                "following input: {input}"
            ),
        ),
    ]
)


def optional_enum_field(
    enum_values: Optional[List[str]] = None,
    description: str = "",
    is_rel: bool = False,
    **field_kwargs: Any,
) -> Any:
    """Utility function to conditionally create a field with an enum constraint."""
    if enum_values:
        return Field(
            ...,
            enum=enum_values,
            description=f"{description}. Available options are {enum_values}",
            **field_kwargs,
        )
    else:
        node_info = (
            "Ensure you use basic or elementary types for node labels.\n"
            "For example, when you identify an entity representing a person, "
            "always label it as **'Person'**. Avoid using more specific terms "
            "like 'Mathematician' or 'Scientist'"
        )
        rel_info = (
            "Instead of using specific and momentary types such as "
            "'BECAME_PROFESSOR', use more general and timeless relationship types like "
            "'PROFESSOR'. However, do not sacrifice any accuracy for generality"
        )
        additional_info = rel_info if is_rel else node_info
        return Field(..., description=description + additional_info, **field_kwargs)


class _Graph(BaseModel):
    nodes: Optional[List]
    relationships: Optional[List]


def create_simple_model(
    node_labels: Optional[List[str]] = None, rel_types: Optional[List[str]] = None
) -> Type[_Graph]:
    """
    Simple model allows to limit node and/or relationship types.
    Doesn't have any node or relationship properties.
    """

    class SimpleNode(BaseModel):
        """Represents a node in a graph with associated properties."""

        id: str = Field(description="Name or human-readable unique identifier.")
        type: str = optional_enum_field(
            node_labels, description="The type or label of the node."
        )

    class SimpleRelationship(BaseModel):
        """Represents a directed relationship between two nodes in a graph."""

        source_node_id: str = Field(
            description="Name or human-readable unique identifier of source node"
        )
        source_node_type: str = optional_enum_field(
            node_labels, description="The type or label of the source node."
        )
        target_node_id: str = Field(
            description="Name or human-readable unique identifier of target node"
        )
        target_node_type: str = optional_enum_field(
            node_labels, description="The type or label of the target node."
        )
        type: str = optional_enum_field(
            rel_types, description="The type of the relationship.", is_rel=True
        )

    class DynamicGraph(_Graph):
        """Represents a graph document consisting of nodes and relationships."""

        nodes: Optional[List[SimpleNode]] = Field(description="List of nodes")
        relationships: Optional[List[SimpleRelationship]] = Field(
            description="List of relationships"
        )

    return DynamicGraph


def map_to_base_node(node: Any) -> Node:
    """Map the SimpleNode to the base Node."""
    return Node(id=node.id, type=node.type)


def map_to_base_relationship(rel: Any) -> Relationship:
    """Map the SimpleRelationship to the base Relationship."""
    source = Node(id=rel.source_node_id, type=rel.source_node_type)
    target = Node(id=rel.target_node_id, type=rel.target_node_type)
    return Relationship(source=source, target=target, type=rel.type)


def _parse_and_clean_json(
    argument_json: Dict[str, Any],
) -> Tuple[List[Node], List[Relationship]]:
    nodes = []
    for node in argument_json["nodes"]:
        if not node.get("id"):  # Id is mandatory, skip this node
            continue
        nodes.append(
            Node(
                id=node["id"],
                type=node.get("type"),
            )
        )
    relationships = []
    for rel in argument_json["relationships"]:
        # Mandatory props
        if (
            not rel.get("source_node_id")
            or not rel.get("target_node_id")
            or not rel.get("type")
        ):
            continue

        # Node type copying if needed from node list
        if not rel.get("source_node_type"):
            try:
                rel["source_node_type"] = [
                    el.get("type")
                    for el in argument_json["nodes"]
                    if el["id"] == rel["source_node_id"]
                ][0]
            except IndexError:
                rel["source_node_type"] = None
        if not rel.get("target_node_type"):
            try:
                rel["target_node_type"] = [
                    el.get("type")
                    for el in argument_json["nodes"]
                    if el["id"] == rel["target_node_id"]
                ][0]
            except IndexError:
                rel["target_node_type"] = None

        source_node = Node(
            id=rel["source_node_id"],
            type=rel["source_node_type"],
        )
        target_node = Node(
            id=rel["target_node_id"],
            type=rel["target_node_type"],
        )
        relationships.append(
            Relationship(
                source=source_node,
                target=target_node,
                type=rel["type"],
            )
        )
    return nodes, relationships


def _format_nodes(nodes: List[Node]) -> List[Node]:
    return [
        Node(
            id=el.id.title() if isinstance(el.id, str) else el.id,
            type=el.type.capitalize(),
        )
        for el in nodes
    ]


def _format_relationships(rels: List[Relationship]) -> List[Relationship]:
    return [
        Relationship(
            source=_format_nodes([el.source])[0],
            target=_format_nodes([el.target])[0],
            type=el.type.replace(" ", "_").upper(),
        )
        for el in rels
    ]


def _convert_to_graph_document(
    raw_schema: Dict[Any, Any],
) -> Tuple[List[Node], List[Relationship]]:
    # If there are validation errors
    if not raw_schema["parsed"]:
        try:
            try:  # OpenAI type response
                argument_json = json.loads(
                    raw_schema["raw"].additional_kwargs["tool_calls"][0]["function"][
                        "arguments"
                    ]
                )
            except Exception:  # Google type response
                argument_json = json.loads(
                    raw_schema["raw"].additional_kwargs["function_call"]["arguments"]
                )

            nodes, relationships = _parse_and_clean_json(argument_json)
        except Exception:  # If we can't parse JSON
            return ([], [])
    else:  # If there are no validation errors use parsed pydantic object
        parsed_schema: _Graph = raw_schema["parsed"]
        nodes = (
            [map_to_base_node(node) for node in parsed_schema.nodes]
            if parsed_schema.nodes
            else []
        )

        relationships = (
            [map_to_base_relationship(rel) for rel in parsed_schema.relationships]
            if parsed_schema.relationships
            else []
        )
    # Title / Capitalize
    return _format_nodes(nodes), _format_relationships(relationships)


class LLMGraphTransformer:
    """Transform documents into graph-based documents using a LLM.

    It allows specifying constraints on the types of nodes and relationships to include
    in the output graph. The class doesn't support neither extract and node or
    relationship properties

    Args:
        llm (BaseLanguageModel): An instance of a language model supporting structured
          output.
        allowed_nodes (List[str], optional): Specifies which node types are
          allowed in the graph. Defaults to an empty list, allowing all node types.
        allowed_relationships (List[str], optional): Specifies which relationship types
          are allowed in the graph. Defaults to an empty list, allowing all relationship
          types.
        prompt (Optional[ChatPromptTemplate], optional): The prompt to pass to
          the LLM with additional instructions.
        strict_mode (bool, optional): Determines whether the transformer should apply
          filtering to strictly adhere to `allowed_nodes` and `allowed_relationships`.
          Defaults to True.

    Example:
        .. code-block:: python
            from langchain_experimental.graph_transformers import LLMGraphTransformer
            from langchain_core.documents import Document
            from langchain_openai import ChatOpenAI

            llm=ChatOpenAI(temperature=0)
            transformer = LLMGraphTransformer(
                llm=llm,
                allowed_nodes=["Person", "Organization"])

            doc = Document(page_content="Elon Musk is suing OpenAI")
            graph_documents = transformer.convert_to_graph_documents([doc])
    """

    def __init__(
        self,
        llm: BaseLanguageModel,
        allowed_nodes: List[str] = [],
        allowed_relationships: List[str] = [],
        prompt: ChatPromptTemplate = default_prompt,
        strict_mode: bool = True,
    ) -> None:
        if not hasattr(llm, "with_structured_output"):
            raise ValueError(
                "The specified LLM does not support the 'with_structured_output'. "
                "Please ensure you are using an LLM that supports this feature."
            )
        self.allowed_nodes = allowed_nodes
        self.allowed_relationships = allowed_relationships
        self.strict_mode = strict_mode

        # Define chain
        schema = create_simple_model(allowed_nodes, allowed_relationships)
        structured_llm = llm.with_structured_output(schema, include_raw=True)
        self.chain = prompt | structured_llm

    def process_response(self, document: Document) -> GraphDocument:
        """
        Processes a single document, transforming it into a graph document using
        an LLM based on the model's schema and constraints.
        """
        text = document.page_content
        raw_schema = self.chain.invoke({"input": text})
        raw_schema = cast(Dict[Any, Any], raw_schema)
        nodes, relationships = _convert_to_graph_document(raw_schema)

        # Strict mode filtering
        if self.strict_mode and (self.allowed_nodes or self.allowed_relationships):
            if self.allowed_nodes:
                lower_allowed_nodes = [el.lower() for el in self.allowed_nodes]
                nodes = [
                    node for node in nodes if node.type.lower() in lower_allowed_nodes
                ]
                relationships = [
                    rel
                    for rel in relationships
                    if rel.source.type.lower() in lower_allowed_nodes
                    and rel.target.type.lower() in lower_allowed_nodes
                ]
            if self.allowed_relationships:
                relationships = [
                    rel
                    for rel in relationships
                    if rel.type.lower()
                    in [el.lower() for el in self.allowed_relationships]
                ]

        return GraphDocument(nodes=nodes, relationships=relationships, source=document)

    def convert_to_graph_documents(
        self, documents: Sequence[Document]
    ) -> List[GraphDocument]:
        """Convert a sequence of documents into graph documents.

        Args:
            documents (Sequence[Document]): The original documents.
            **kwargs: Additional keyword arguments.

        Returns:
            Sequence[GraphDocument]: The transformed documents as graphs.
        """
        return [self.process_response(document) for document in documents]

    async def aprocess_response(self, document: Document) -> GraphDocument:
        """
        Asynchronously processes a single document, transforming it into a
        graph document.
        """
        text = document.page_content
        raw_schema = await self.chain.ainvoke({"input": text})
        raw_schema = cast(Dict[Any, Any], raw_schema)
        nodes, relationships = _convert_to_graph_document(raw_schema)

        if self.strict_mode and (self.allowed_nodes or self.allowed_relationships):
            if self.allowed_nodes:
                lower_allowed_nodes = [el.lower() for el in self.allowed_nodes]
                nodes = [
                    node for node in nodes if node.type.lower() in lower_allowed_nodes
                ]
                relationships = [
                    rel
                    for rel in relationships
                    if rel.source.type.lower() in lower_allowed_nodes
                    and rel.target.type.lower() in lower_allowed_nodes
                ]
            if self.allowed_relationships:
                relationships = [
                    rel
                    for rel in relationships
                    if rel.type.lower()
                    in [el.lower() for el in self.allowed_relationships]
                ]

        return GraphDocument(nodes=nodes, relationships=relationships, source=document)

    async def aconvert_to_graph_documents(
        self, documents: Sequence[Document]
    ) -> List[GraphDocument]:
        """
        Asynchronously convert a sequence of documents into graph documents.
        """
        tasks = [
            asyncio.create_task(self.aprocess_response(document))
            for document in documents
        ]
        results = await asyncio.gather(*tasks)
        return results   

def get_graph_from_Gemini(model_version,
                            graph: Neo4jGraph,
                            chunkId_chunkDoc_list: List, 
                            allowedNodes, 
                            allowedRelationship):
    """
        Extract graph from OpenAI and store it in database. 
        This is a wrapper for extract_and_store_graph
                                
        Args:
            model_version : identify the model of LLM
            graph: Neo4jGraph to be extracted.
            chunks: List of chunk documents created from input file
        Returns: 
            List of langchain GraphDocument - used to generate graph
    """
    logging.info(f"Get graphDocuments from {model_version}")
    futures = []
    graph_document_list = []
    lst_chunk_chunkId_document=[]
    location = "us-central1"
    #project_id = "llm-experiments-387609"                            
    credentials, project_id = google.auth.default()
    if hasattr(credentials, "service_account_email"):
      logging.info(credentials.service_account_email)
    else:
        logging.info("WARNING: no service account credential. User account credential?")                           
    vertexai.init(project=project_id, location=location)
    
    combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
     
    llm = ChatVertexAI(model_name=model_version,
                    convert_system_message_to_human=True,
                    temperature=0,
                    safety_settings={
                        HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE, 
                        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE, 
                        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE, 
                        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE, 
                        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    }
                )
    llm_transformer = LLMGraphTransformer(llm=llm, allowed_nodes=allowedNodes, allowed_relationships=allowedRelationship)
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        for chunk in combined_chunk_document_list:
            chunk_doc = Document(page_content= chunk.page_content.encode("utf-8"), metadata=chunk.metadata)
            futures.append(executor.submit(llm_transformer.convert_to_graph_documents,[chunk_doc]))   
        
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            graph_document = future.result()
            # unique_nodes=set()
            # for single_rel in graph_document[0].relationships:
            #     unique_nodes.add((single_rel.source.id, single_rel.source.type))
            #     unique_nodes.add((single_rel.target.id, single_rel.target.type))  
                
            # nodes = [Node(id=id, type=type) for id,type in unique_nodes]        
            # graph_document[0].nodes=list(nodes)

#            for node in graph_document[0].nodes:
#               node.id = node.id.title().replace(' ','_')
#                # replace all non alphanumeric characters and spaces with underscore
#               node.type = re.sub(r'[^\w]+', '_', node.type.capitalize())
            graph_document_list.append(graph_document[0])
            
            #Sleep for 1 sec after 4 requestes are processed. 
            # Todo: Remove this code block when Gemini rate limit is increased 
            # if i % 4 == 0 :
            #     time.sleep(1)
        
    return  graph_document_list
