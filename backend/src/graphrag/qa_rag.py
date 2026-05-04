"""neo4j-graphrag-powered chat path. Phase 8 of the migration.

Gated by ``USE_GRAPHRAG_CHAT``. The legacy ``src.QA_integration.QA_RAG`` is the
fallback for any chat mode that we haven't ported yet (and stays in place for
one release of soak time so users can flip the flag back if anything regresses).

Currently implemented:

- ``vector`` mode via ``VectorRetriever`` + ``GraphRAG``
- chat history via ``Neo4jMessageHistory`` (drop-in for ``Neo4jChatMessageHistory``)

Falls back (raises ``NotYetImplemented``) for graph / hybrid / entity_vector /
graph+vector / global_vector — those still go through the LangChain path.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from src.graphrag.driver import get_neo4j_driver
from src.graphrag.embedding_factory import get_graphrag_embedder
from src.graphrag.llm_factory import get_graphrag_llm
from src.shared.constants import (
    CHAT_VECTOR_MODE,
    VECTOR_SEARCH_TOP_K,
)


class NotYetImplementedInGraphragPath(NotImplementedError):
    """Raised when a chat mode hasn't been ported to the graphrag path yet."""


SUPPORTED_MODES = {CHAT_VECTOR_MODE}


def supports_mode(mode: str) -> bool:
    return mode in SUPPORTED_MODES


def chat_via_graphrag(
    *,
    credentials,
    model: str,
    question: str,
    document_names: str,
    session_id: str,
    mode: str,
    write_access: bool = True,
    email: str | None = None,
    embedding_provider: str | None = None,
    embedding_model: str | None = None,
) -> dict[str, Any]:
    if not supports_mode(mode):
        raise NotYetImplementedInGraphragPath(
            f"Chat mode {mode!r} is not yet implemented in the graphrag path"
        )

    start = time.time()
    driver = get_neo4j_driver(credentials)
    try:
        from neo4j_graphrag.generation import GraphRAG
        from neo4j_graphrag.message_history import Neo4jMessageHistory
        from neo4j_graphrag.retrievers import VectorRetriever

        embedder, _ = get_graphrag_embedder(embedding_provider, embedding_model)
        llm, model_name, counter = get_graphrag_llm(model)

        retriever = VectorRetriever(
            driver=driver,
            index_name="vector",
            embedder=embedder,
        )
        rag = GraphRAG(retriever=retriever, llm=llm)
        history = Neo4jMessageHistory(session_id=session_id, driver=driver, window=10)

        response = rag.search(
            query_text=question,
            retriever_config={"top_k": VECTOR_SEARCH_TOP_K},
            message_history=history.messages if write_access else None,
        )

        if write_access:
            history.add_message({"role": "user", "content": question})
            history.add_message({"role": "assistant", "content": str(response.answer)})

        elapsed = time.time() - start

        sources = []
        for item in getattr(response, "retriever_result", []) or []:
            text = getattr(item, "content", None) or getattr(item, "text", None)
            if text:
                sources.append({"source": text, "chunkdetails": []})

        return {
            "session_id": session_id,
            "message": str(response.answer),
            "info": {
                "sources": sources,
                "model": model_name,
                "nodedetails": [],
                "total_tokens": counter.total_tokens,
                "response_time": elapsed,
                "mode": mode,
                "entities": [],
                "metric_details": [],
            },
            "user": "chatbot",
        }
    finally:
        try:
            driver.close()
        except Exception:
            logging.debug("driver.close() raised", exc_info=True)
