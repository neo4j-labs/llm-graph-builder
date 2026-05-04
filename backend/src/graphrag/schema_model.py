from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PropertyType(str, Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    DATE = "DATE"
    LOCAL_DATETIME = "LOCAL_DATETIME"
    LIST = "LIST"


class PropertySpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    type: PropertyType = PropertyType.STRING
    description: Optional[str] = None
    required: bool = False


class NodeSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str
    description: Optional[str] = None
    properties: list[PropertySpec] = Field(default_factory=list)


class RelSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str
    description: Optional[str] = None
    properties: list[PropertySpec] = Field(default_factory=list)


class Pattern(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_label: str = Field(..., alias="sourceLabel")
    rel_label: str = Field(..., alias="relLabel")
    target_label: str = Field(..., alias="targetLabel")


class SchemaSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    source: str
    nodes: list[NodeSpec] = Field(default_factory=list)
    relationships: list[RelSpec] = Field(default_factory=list)
    patterns: list[Pattern] = Field(default_factory=list)


def schema_spec_from_db_introspection(introspection: dict) -> SchemaSpec:
    triplets: list[str] = introspection.get("triplets", []) or []
    node_props: dict[str, list[str]] = introspection.get("nodeProperties", {}) or {}
    rel_props: dict[str, list[str]] = introspection.get("relationshipProperties", {}) or {}

    node_labels: set[str] = set(node_props.keys())
    rel_labels: set[str] = set(rel_props.keys())
    patterns: list[Pattern] = []
    for triplet in triplets:
        if "->" not in triplet or "-" not in triplet:
            continue
        try:
            left, target = triplet.split("->")
            source_label, rel_label = left.split("-", 1)
        except ValueError:
            continue
        source_label = source_label.strip()
        rel_label = rel_label.strip()
        target_label = target.strip()
        if not source_label or not rel_label or not target_label:
            continue
        node_labels.add(source_label)
        node_labels.add(target_label)
        rel_labels.add(rel_label)
        patterns.append(
            Pattern(source_label=source_label, rel_label=rel_label, target_label=target_label)
        )

    nodes = [
        NodeSpec(
            label=label,
            properties=[PropertySpec(name=p) for p in node_props.get(label, [])],
        )
        for label in sorted(node_labels)
    ]
    relationships = [
        RelSpec(
            label=label,
            properties=[PropertySpec(name=p) for p in rel_props.get(label, [])],
        )
        for label in sorted(rel_labels)
    ]
    return SchemaSpec(source="db", nodes=nodes, relationships=relationships, patterns=patterns)
