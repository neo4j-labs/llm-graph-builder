"""Convert our internal SchemaSpec into neo4j-graphrag's typed GraphSchema."""

from src.graphrag.schema_model import PropertySpec, SchemaSpec


def _property_dicts(props: list[PropertySpec]) -> list[dict]:
    out: list[dict] = []
    for p in props:
        entry: dict = {"name": p.name, "type": p.type.value}
        if p.description:
            entry["description"] = p.description
        if p.required:
            entry["required"] = True
        out.append(entry)
    return out


def to_graph_schema(spec: SchemaSpec):
    """Build a neo4j_graphrag GraphSchema from a SchemaSpec.

    Uses the dict-based factory so we don't bind to one specific public
    type-name across minor releases of neo4j-graphrag.
    """
    from neo4j_graphrag.experimental.components.schema import SchemaBuilder

    node_types = [
        {
            "label": n.label,
            "description": n.description or "",
            "properties": _property_dicts(n.properties),
        }
        for n in spec.nodes
    ]
    relationship_types = [
        {
            "label": r.label,
            "description": r.description or "",
            "properties": _property_dicts(r.properties),
        }
        for r in spec.relationships
    ]
    patterns = [(p.source_label, p.rel_label, p.target_label) for p in spec.patterns]

    return SchemaBuilder().create_schema_model(
        node_types=node_types,
        relationship_types=relationship_types,
        patterns=patterns,
    )
