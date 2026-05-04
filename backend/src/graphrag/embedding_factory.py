"""Build a neo4j-graphrag Embedder from the project's existing embedding-provider
config. Mirrors ``src.shared.common_fn.load_embedding_model`` so call sites can
swap one for the other transparently.

Providers covered:
- ``openai`` → OpenAIEmbeddings
- ``gemini`` (vertex ai) → VertexAIEmbeddings
- ``titan`` (bedrock) → custom BedrockEmbedder (see bedrock_embedder.py)
- ``sentence-transformer`` (default for self-hosted) → SentenceTransformerEmbeddings
"""

from __future__ import annotations

import logging
import os
from typing import Any

from src.shared.common_fn import (
    _ensure_sentence_transformer_model_downloaded,
    get_value_from_env,
)
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException


# Same shape as the inline map in load_embedding_model. Kept here so the graphrag
# path can stand on its own without importing langchain-flavoured helpers.
_DIMENSIONS: dict[str, dict[str, int]] = {
    "openai": {
        "text-embedding-3-large": 3072,
        "text-embedding-3-small": 1536,
        "text-embedding-ada-002": 1536,
    },
    "gemini": {
        "gemini-embedding-001": 3072,
        "text-embedding-005": 768,
    },
    "titan": {
        "amazon.titan-embed-text-v2:0": 1024,
        "amazon.titan-embed-text-v1": 1536,
    },
    "sentence-transformer": {
        "all-MiniLM-L6-v2": 384,
    },
}


def _bedrock_credentials() -> tuple[str, str, str]:
    raw = get_value_from_env("BEDROCK_EMBEDDING_MODEL_KEY")
    if not raw:
        raise LLMGraphBuilderException(
            "BEDROCK_EMBEDDING_MODEL_KEY env var is required for Bedrock embeddings; "
            "format: aws_access_key,aws_secret_key,region_name"
        )
    parts = raw.split(",")
    if len(parts) != 3:
        raise LLMGraphBuilderException(
            f"BEDROCK_EMBEDDING_MODEL_KEY must be aws_access_key,aws_secret_key,region_name (got {len(parts)} parts)"
        )
    aws_access_key, aws_secret_key, region = (p.strip() for p in parts)
    return aws_access_key, aws_secret_key, region


def get_graphrag_embedder(
    provider: str | None = None, model_name: str | None = None
) -> tuple[Any, int]:
    """Return ``(embedder, dimension)``.

    Defaults match ``load_embedding_model``: when ``provider`` is unset we read
    EMBEDDING_PROVIDER from the environment (default ``sentence-transformer``).
    """
    provider = (provider or get_value_from_env("EMBEDDING_PROVIDER", "sentence-transformer")).strip().lower()
    model_name = (model_name or get_value_from_env("EMBEDDING_MODEL", "all-MiniLM-L6-v2")).strip()

    dimension = _DIMENSIONS.get(provider, {}).get(model_name)
    if dimension is None:
        raise LLMGraphBuilderException(f"Unsupported embedding provider/model: {provider}/{model_name}")

    if provider == "openai":
        from neo4j_graphrag.embeddings import OpenAIEmbeddings

        api_key = os.environ.get("OPENAI_API_KEY")
        return OpenAIEmbeddings(model=model_name, api_key=api_key), dimension

    if provider == "gemini":
        from neo4j_graphrag.embeddings import VertexAIEmbeddings

        return VertexAIEmbeddings(model=model_name), dimension

    if provider == "titan":
        from src.graphrag.bedrock_embedder import BedrockEmbedder

        access, secret, region = _bedrock_credentials()
        embedder = BedrockEmbedder(
            model_id=model_name,
            region_name=region,
            aws_access_key_id=access,
            aws_secret_access_key=secret,
        )
        return embedder, dimension

    if provider == "sentence-transformer":
        from neo4j_graphrag.embeddings import SentenceTransformerEmbeddings

        model_path = "./local_model"
        try:
            _ensure_sentence_transformer_model_downloaded(model_name, model_path)
        except Exception as exc:
            logging.warning(
                "Could not pre-cache sentence-transformer model %s (%s); proceeding with on-demand download",
                model_name,
                exc,
            )
        return SentenceTransformerEmbeddings(model=model_name), dimension

    raise LLMGraphBuilderException(f"Unknown embedding provider: {provider!r}")
