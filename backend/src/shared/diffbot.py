"""
Standalone replacement for `langchain_experimental.graph_transformers.diffbot.DiffbotGraphTransformer`.

langchain_experimental is being sunset, so this module reimplements the Diffbot NLP
graph transformer against `langchain_neo4j`'s GraphDocument/Node/Relationship types
instead of `langchain_community`'s.
"""
import os
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import requests
from langchain_core.documents import Document
from langchain_neo4j.graphs.graph_document import GraphDocument, Node, Relationship


class TypeOption(str, Enum):
    FACTS = "facts"
    ENTITIES = "entities"
    SENTIMENT = "sentiment"


def format_property_key(s: str) -> str:
    """Formats a string to be used as a property key."""
    words = s.split()
    if not words:
        return s
    first_word = words[0].lower()
    capitalized_words = [word.capitalize() for word in words[1:]]
    return "".join([first_word] + capitalized_words)


class NodesList:
    """List of nodes with associated properties.

    Attributes:
        nodes (Dict[Tuple, Any]): Stores nodes as keys and their properties as values.
            Each key is a tuple where the first element is the
            node ID and the second is the node type.
    """

    def __init__(self) -> None:
        self.nodes: Dict[Tuple[Union[str, int], str], Any] = dict()

    def add_node_property(
        self, node: Tuple[Union[str, int], str], properties: Dict[str, Any]
    ) -> None:
        """Adds a node, merging properties if the node already exists."""
        if node not in self.nodes:
            self.nodes[node] = properties
        else:
            self.nodes[node].update(properties)

    def return_node_list(self) -> List[Node]:
        """Returns the nodes as a list of `Node` objects."""
        nodes = [
            Node(id=key[0], type=key[1], properties=self.nodes[key])
            for key in self.nodes
        ]
        return nodes


# Properties that should be treated as node properties instead of relationships
FACT_TO_PROPERTY_TYPE = [
    "Date",
    "Number",
    "Job title",
    "Cause of death",
    "Organization type",
    "Academic title",
]


schema_mapping = [
    ("HEADQUARTERS", "ORGANIZATION_LOCATIONS"),
    ("RESIDENCE", "PERSON_LOCATION"),
    ("ALL_PERSON_LOCATIONS", "PERSON_LOCATION"),
    ("CHILD", "HAS_CHILD"),
    ("PARENT", "HAS_PARENT"),
    ("CUSTOMERS", "HAS_CUSTOMER"),
    ("SKILLED_AT", "INTERESTED_IN"),
]


class SimplifiedSchema:
    """Simplified schema mapping."""

    def __init__(self) -> None:
        self.schema = dict()
        for row in schema_mapping:
            self.schema[row[0]] = row[1]

    def get_type(self, type: str) -> str:
        """Returns the simplified schema type for a given original type, if any."""
        return self.schema.get(type, type)


class DiffbotGraphTransformer:
    """Transform documents into graph documents using the Diffbot NLP API.

    Example:
        .. code-block:: python
          from src.shared.diffbot import DiffbotGraphTransformer
          from langchain_core.documents import Document

          diffbot_nlp = DiffbotGraphTransformer(diffbot_api_key="DIFFBOT_API_KEY")

          document = Document(page_content="Mike Tunge is the CEO of Diffbot.")
          graph_documents = diffbot_nlp.convert_to_graph_documents([document])
    """

    def __init__(
        self,
        diffbot_api_key: Optional[str] = None,
        fact_confidence_threshold: float = 0.7,
        include_qualifiers: bool = True,
        include_evidence: bool = True,
        simplified_schema: bool = True,
        extract_types: List[TypeOption] = [TypeOption.FACTS],
        *,
        include_confidence: bool = False,
    ) -> None:
        """
        Args:
            diffbot_api_key (str): The API key for Diffbot's NLP services.
            fact_confidence_threshold (float): Minimum confidence level for facts to be included.
            include_qualifiers (bool): Whether to include qualifiers in the relationships.
            include_evidence (bool): Whether to include evidence for the relationships.
            simplified_schema (bool): Whether to use a simplified schema for relationships.
            extract_types (List[TypeOption]): Data types to extract (facts, entities, sentiment).
            include_confidence (bool): Whether to include confidence scores on nodes and rels.
        """
        self.diffbot_api_key = diffbot_api_key or os.environ.get("DIFFBOT_API_KEY")
        if not self.diffbot_api_key:
            raise ValueError(
                "`diffbot_api_key` must be provided or set via the `DIFFBOT_API_KEY` env var."
            )
        self.fact_threshold_confidence = fact_confidence_threshold
        self.include_qualifiers = include_qualifiers
        self.include_evidence = include_evidence
        self.include_confidence = include_confidence
        self.simplified_schema = None
        if simplified_schema:
            self.simplified_schema = SimplifiedSchema()
        if not extract_types:
            raise ValueError(
                "`extract_types` cannot be an empty array. "
                "Allowed values are 'facts', 'entities', or both."
            )
        self.extract_types = extract_types

    def nlp_request(self, text: str) -> Dict[str, Any]:
        """Makes an API request to the Diffbot NLP endpoint."""
        # Relationship extraction only works for English
        payload = {
            "content": text,
            "lang": "en",
        }
        fields = ",".join(self.extract_types)
        host = "nl.diffbot.com"
        url = f"https://{host}/v1/?fields={fields}&token={self.diffbot_api_key}&language=en"
        result = requests.post(url, data=payload)
        return result.json()

    def process_response(
        self, payload: Dict[str, Any], document: Document
    ) -> GraphDocument:
        """Transforms the Diffbot NLP response into a `GraphDocument`."""
        # Return empty result if there are no facts
        if ("facts" not in payload or not payload["facts"]) and (
            "entities" not in payload or not payload["entities"]
        ):
            return GraphDocument(nodes=[], relationships=[], source=document)

        # Nodes are a custom class because we need to deduplicate
        nodes_list = NodesList()
        if "entities" in payload and payload["entities"]:
            for record in payload["entities"]:
                # Ignore if it doesn't have a type
                if not record["allTypes"]:
                    continue
                source_id = (
                    record["allUris"][0] if record["allUris"] else record["name"]
                )
                source_label = record["allTypes"][0]["name"].capitalize()
                source_name = record["name"]
                nodes_list.add_node_property(
                    (source_id, source_label), {"name": source_name}
                )
                if record.get("sentiment") is not None:
                    nodes_list.add_node_property(
                        (source_id, source_label),
                        {"sentiment": record.get("sentiment")},
                    )
                if self.include_confidence:
                    nodes_list.add_node_property(
                        (source_id, source_label),
                        {"confidence": record.get("confidence")},
                    )

        relationships = list()
        # Relationships are a list because we don't deduplicate them
        if "facts" in payload and payload["facts"]:
            for record in payload["facts"]:
                # Skip if the fact is below the threshold confidence
                if record["confidence"] < self.fact_threshold_confidence:
                    continue
                if not record["value"]["allTypes"]:
                    continue

                # Source node
                source_id = (
                    record["entity"]["allUris"][0]
                    if record["entity"]["allUris"]
                    else record["entity"]["name"]
                )
                source_label = record["entity"]["allTypes"][0]["name"].capitalize()
                source_name = record["entity"]["name"]
                source_node = Node(id=source_id, type=source_label)
                nodes_list.add_node_property(
                    (source_id, source_label), {"name": source_name}
                )

                # Target node
                target_id = (
                    record["value"]["allUris"][0]
                    if record["value"]["allUris"]
                    else record["value"]["name"]
                )
                target_label = record["value"]["allTypes"][0]["name"].capitalize()
                target_name = record["value"]["name"]
                # Some facts are better suited as node properties
                if target_label in FACT_TO_PROPERTY_TYPE:
                    nodes_list.add_node_property(
                        (source_id, source_label),
                        {format_property_key(record["property"]["name"]): target_name},
                    )
                else:  # Define relationship
                    target_node = Node(id=target_id, type=target_label)
                    nodes_list.add_node_property(
                        (target_id, target_label), {"name": target_name}
                    )
                    rel_type = record["property"]["name"].replace(" ", "_").upper()
                    if self.simplified_schema:
                        rel_type = self.simplified_schema.get_type(rel_type)

                    rel_properties = dict()
                    relationship_evidence = [el["passage"] for el in record["evidence"]][0]
                    if self.include_evidence:
                        rel_properties.update({"evidence": relationship_evidence})
                    if self.include_confidence:
                        rel_properties.update({"confidence": record["confidence"]})
                    if self.include_qualifiers and record.get("qualifiers"):
                        for property in record["qualifiers"]:
                            prop_key = format_property_key(property["property"]["name"])
                            rel_properties[prop_key] = property["value"]["name"]

                    relationship = Relationship(
                        source=source_node,
                        target=target_node,
                        type=rel_type,
                        properties=rel_properties,
                    )
                    relationships.append(relationship)

        return GraphDocument(
            nodes=nodes_list.return_node_list(),
            relationships=relationships,
            source=document,
        )

    def convert_to_graph_documents(
        self, documents: Sequence[Document]
    ) -> List[GraphDocument]:
        """Converts a sequence of documents into graph documents via the Diffbot NLP API."""
        results = []
        for document in documents:
            raw_results = self.nlp_request(document.page_content)
            graph_document = self.process_response(raw_results, document)
            results.append(graph_document)
        return results