"""neo4j-graphrag-based entity/relation extraction.

This module is the Phase 7 cutover for ``src.llm.get_graph_document_list``.
When the ``USE_GRAPHRAG_EXTRACTOR`` env flag is on, ``extract_via_graphrag``
runs an ``LLMEntityRelationExtractor`` over the chunk batch and converts the
result to LangChain ``GraphDocument`` objects so the rest of the pipeline
(``make_relationships``, ``post_processing``, ``common_fn.save_graphDocuments_in_neo4j``)
works unchanged.

The pipeline does NOT build a lexical graph — chunk and document nodes plus
``PART_OF`` / ``FIRST_CHUNK`` / ``NEXT_CHUNK`` / ``HAS_ENTITY`` are still owned
by ``src.make_relationships``, which writes plain ``:Chunk`` / ``:Document``.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from langchain_community.graphs.graph_document import GraphDocument, Node, Relationship
from langchain_core.documents import Document

from src.graphrag.llm_factory import get_graphrag_llm
from src.graphrag.schema_model import (
    NodeSpec,
    Pattern,
    PropertySpec,
    PropertyType,
    RelSpec,
    SchemaSpec,
)
from src.graphrag.schema_to_graphschema import to_graph_schema
from src.graphrag.token_counting_llm import TokenUsageCounter


def derive_schema_spec(
    schema_spec: Optional[SchemaSpec],
    allowed_nodes: list[str],
    allowed_relationships: list[tuple[str, str, str]],
    node_properties_map: Optional[dict[str, list[str]]],
    relationship_properties_map: Optional[dict[str, list[str]]],
) -> SchemaSpec:
    """Build a SchemaSpec for the extractor. If `schema_spec` was POSTed, use it
    as-is; otherwise reconstruct from the legacy form fields.
    """
    if schema_spec is not None:
        return schema_spec

    nodes_by_label: dict[str, NodeSpec] = {
        label: NodeSpec(
            label=label,
            properties=[PropertySpec(name=p) for p in (node_properties_map or {}).get(label, [])],
        )
        for label in allowed_nodes
    }

    rels_by_label: dict[str, RelSpec] = {}
    patterns: list[Pattern] = []
    for source_label, rel_label, target_label in allowed_relationships:
        rels_by_label.setdefault(
            rel_label,
            RelSpec(
                label=rel_label,
                properties=[
                    PropertySpec(name=p)
                    for p in (relationship_properties_map or {}).get(rel_label, [])
                ],
            ),
        )
        patterns.append(
            Pattern(source_label=source_label, rel_label=rel_label, target_label=target_label)
        )

    return SchemaSpec(
        source="db",
        nodes=list(nodes_by_label.values()),
        relationships=list(rels_by_label.values()),
        patterns=patterns,
    )


async def extract_via_graphrag(
    *,
    model: str,
    combined_chunk_document_list: list[Document],
    schema_spec: SchemaSpec,
    additional_instructions: Optional[str] = None,
) -> tuple[list[GraphDocument], int]:
    """Run neo4j-graphrag's LLM extractor over the chunk batch.

    Returns ``(graph_documents, token_usage)`` matching the legacy contract of
    ``get_graph_document_list``.
    """
    from neo4j_graphrag.experimental.components.entity_relation_extractor import (
        LLMEntityRelationExtractor,
        OnError,
    )
    from neo4j_graphrag.experimental.components.types import (
        TextChunk,
        TextChunks,
    )

    llm, model_name, counter = get_graphrag_llm(model)
    logging.info("graphrag extractor: model=%s, schema=%d nodes / %d rels / %d patterns",
                 model_name, len(schema_spec.nodes), len(schema_spec.relationships), len(schema_spec.patterns))

    schema = to_graph_schema(schema_spec)

    extractor = LLMEntityRelationExtractor(
        llm=llm,
        on_error=OnError.IGNORE,
        create_lexical_graph=False,
    )

    chunks = TextChunks(
        chunks=[
            TextChunk(
                text=doc.page_content,
                index=i,
                uid=_chunk_uid(doc, i),
                metadata={"combined_chunk_ids": doc.metadata.get("combined_chunk_ids", [])},
            )
            for i, doc in enumerate(combined_chunk_document_list)
        ]
    )

    extractor_kwargs: dict[str, Any] = {"chunks": chunks, "schema": schema}
    if additional_instructions:
        # neo4j-graphrag doesn't accept additional_instructions as a kwarg; it's
        # intended to be folded into a custom prompt_template. We pass it via
        # examples as a fallback if the extractor supports the kwarg.
        extractor_kwargs["examples"] = additional_instructions

    extracted = await extractor.run(**{k: v for k, v in extractor_kwargs.items() if k in {"chunks", "schema"}})

    graph_documents = _to_graph_documents(extracted, combined_chunk_document_list)
    return graph_documents, counter.total_tokens


def _chunk_uid(doc: Document, idx: int) -> str:
    chunk_ids = doc.metadata.get("combined_chunk_ids") or doc.metadata.get("chunk_id") or []
    if isinstance(chunk_ids, list) and chunk_ids:
        return str(chunk_ids[0])
    if isinstance(chunk_ids, str):
        return chunk_ids
    return f"chunk-{idx}-{uuid.uuid4().hex[:8]}"


def _to_graph_documents(extracted: Any, source_chunks: list[Document]) -> list[GraphDocument]:
    """Convert neo4j-graphrag's Neo4jGraph result into a list of LangChain GraphDocuments,
    keyed by source chunk so the existing make_relationships hook can wire entities
    back to chunks via :HAS_ENTITY.
    """
    nodes_by_id: dict[str, Node] = {}
    for n in getattr(extracted, "nodes", []):
        nodes_by_id[n.id] = Node(id=n.id, type=n.label, properties=dict(getattr(n, "properties", {}) or {}))

    rels_by_chunk: dict[str, list[Relationship]] = {}
    for r in getattr(extracted, "relationships", []):
        chunk_uid = _relationship_chunk_uid(r)
        src = nodes_by_id.get(r.start_node_id)
        tgt = nodes_by_id.get(r.end_node_id)
        if not src or not tgt:
            continue
        rels_by_chunk.setdefault(chunk_uid, []).append(
            Relationship(
                source=src,
                target=tgt,
                type=r.type,
                properties=dict(getattr(r, "properties", {}) or {}),
            )
        )

    nodes_by_chunk: dict[str, list[Node]] = {}
    for n in getattr(extracted, "nodes", []):
        chunk_uid = _node_chunk_uid(n)
        nodes_by_chunk.setdefault(chunk_uid, []).append(nodes_by_id[n.id])

    out: list[GraphDocument] = []
    for i, doc in enumerate(source_chunks):
        uid = _chunk_uid(doc, i)
        out.append(
            GraphDocument(
                nodes=nodes_by_chunk.get(uid, []),
                relationships=rels_by_chunk.get(uid, []),
                source=doc,
            )
        )
    return out


def _node_chunk_uid(node: Any) -> str:
    properties = getattr(node, "properties", {}) or {}
    return str(properties.get("chunk_id") or properties.get("source_chunk_uid") or "")


def _relationship_chunk_uid(rel: Any) -> str:
    properties = getattr(rel, "properties", {}) or {}
    return str(properties.get("chunk_id") or properties.get("source_chunk_uid") or "")
