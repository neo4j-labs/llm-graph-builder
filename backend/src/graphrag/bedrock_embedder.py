"""Bedrock embedding adapter.

neo4j-graphrag ships a first-party ``BedrockLLM`` but no Bedrock embedder.
Rather than keep ``langchain-aws`` solely for ``BedrockEmbeddings``, we call the
``bedrock-runtime`` API directly. This works for Titan and Cohere embed models
hosted on Bedrock; the request/response bodies match Amazon's published shape.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import boto3
from neo4j_graphrag.embeddings.base import Embedder


_TITAN_MODEL_DIMENSIONS = {
    "amazon.titan-embed-text-v1": 1536,
    "amazon.titan-embed-text-v2:0": 1024,
}


class BedrockEmbedder(Embedder):
    """Minimal Embedder for Bedrock ``invoke_model``.

    Supports Titan (``amazon.titan-embed-text-*``) and Cohere
    (``cohere.embed-*``) hosted models. Other body shapes can be plumbed via
    a custom ``body_builder``.
    """

    def __init__(
        self,
        *,
        model_id: str,
        region_name: str,
        aws_access_key_id: str,
        aws_secret_access_key: str,
    ) -> None:
        self.model_id = model_id
        self._client = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
        )

    def _build_request(self, text: str) -> str:
        if self.model_id.startswith("amazon.titan-embed"):
            return json.dumps({"inputText": text})
        if self.model_id.startswith("cohere.embed"):
            return json.dumps({"texts": [text], "input_type": "search_document"})
        raise ValueError(f"Unsupported Bedrock embedding model: {self.model_id}")

    def _extract_embedding(self, payload: dict[str, Any]) -> list[float]:
        if "embedding" in payload:
            return list(payload["embedding"])
        if "embeddings" in payload and payload["embeddings"]:
            first = payload["embeddings"][0]
            if isinstance(first, list):
                return list(first)
        raise ValueError(f"Could not parse Bedrock embedding response: {payload!r}")

    def embed_query(self, text: str) -> list[float]:
        body = self._build_request(text)
        response = self._client.invoke_model(
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json",
            body=body,
        )
        payload = json.loads(response["body"].read())
        return self._extract_embedding(payload)

    @property
    def dimension(self) -> int:
        if self.model_id in _TITAN_MODEL_DIMENSIONS:
            return _TITAN_MODEL_DIMENSIONS[self.model_id]
        # Probe lazily by embedding a single token.
        logging.info("Probing Bedrock embedder %s for output dimension", self.model_id)
        return len(self.embed_query("dimension"))
