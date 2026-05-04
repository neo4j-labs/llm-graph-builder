"""Build a neo4j-graphrag LLMInterface from the same LLM_MODEL_CONFIG_* env vars
that drive the legacy ``src.llm.get_llm`` factory. Mirrors that function's model
dispatch on the uppercased ``model`` string.

Provider gaps versus the LangChain factory:

- **Diffbot** is dropped (decision Q2). Calling this for a Diffbot model raises.
- **Groq** and **Fireworks** route through ``OpenAILLM`` with ``base_url=...``
  since both expose an OpenAI-compatible endpoint. This lets us drop
  ``langchain-groq`` and ``langchain-fireworks`` in Phase 10 of the migration.
- **HuggingFace LLM** has no current code path in get_llm() — nothing to replace.
"""

from __future__ import annotations

import logging
from typing import Any

from src.graphrag.token_counting_llm import TokenUsageCounter, wrap_with_usage
from src.shared.common_fn import get_value_from_env
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"


def _build_llm(model: str, env_value: str) -> tuple[Any, str]:
    """Construct an LLMInterface based on the model-name keyword.

    Returns ``(llm, model_name)`` where ``model_name`` is the underlying model id.
    """
    if "GEMINI" in model:
        from neo4j_graphrag.llm import VertexAILLM

        model_name = env_value
        return VertexAILLM(model_name=model_name, model_params={"temperature": 0}), model_name

    if "AZURE" in model:
        from neo4j_graphrag.llm import AzureOpenAILLM

        model_name, api_endpoint, api_key, api_version = env_value.split(",")
        return (
            AzureOpenAILLM(
                model_name=model_name,
                model_params={"temperature": 0},
                api_key=api_key,
                azure_endpoint=api_endpoint,
                api_version=api_version,
            ),
            model_name,
        )

    if "OPENAI" in model:
        from neo4j_graphrag.llm import OpenAILLM

        model_name, api_key = env_value.split(",")
        return (
            OpenAILLM(model_name=model_name, model_params={"temperature": 0}, api_key=api_key),
            model_name,
        )

    if "ANTHROPIC" in model:
        from neo4j_graphrag.llm import AnthropicLLM

        model_name, api_key = env_value.split(",")
        return (
            AnthropicLLM(model_name=model_name, model_params={"temperature": 0}, api_key=api_key),
            model_name,
        )

    if "FIREWORKS" in model:
        from neo4j_graphrag.llm import OpenAILLM

        model_name, api_key = env_value.split(",")
        return (
            OpenAILLM(
                model_name=model_name,
                model_params={"temperature": 0},
                api_key=api_key,
                base_url=FIREWORKS_BASE_URL,
            ),
            model_name,
        )

    if "GROQ" in model:
        # The legacy env shape is "model_name,base_url,api_key" but Groq's API
        # is OpenAI-compatible at GROQ_BASE_URL. We fall back to the env-supplied
        # URL when present so users with a custom proxy keep working.
        from neo4j_graphrag.llm import OpenAILLM

        parts = env_value.split(",")
        if len(parts) == 3:
            model_name, base_url, api_key = parts
        elif len(parts) == 2:
            model_name, api_key = parts
            base_url = GROQ_BASE_URL
        else:
            raise LLMGraphBuilderException(
                f"Groq env value must be model_name,api_key or model_name,base_url,api_key (got {env_value!r})"
            )
        return (
            OpenAILLM(
                model_name=model_name,
                model_params={"temperature": 0},
                api_key=api_key,
                base_url=base_url or GROQ_BASE_URL,
            ),
            model_name,
        )

    if "BEDROCK" in model:
        import boto3
        from neo4j_graphrag.llm import LLMInterface  # noqa: F401  (sanity import)
        try:
            from neo4j_graphrag.llm import BedrockLLM
        except ImportError as exc:
            raise LLMGraphBuilderException(
                "Bedrock LLM requires `pip install 'neo4j-graphrag[bedrock]'`"
            ) from exc

        model_name, aws_access_key, aws_secret_key, region_name = env_value.split(",")
        bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
        )
        return (
            BedrockLLM(
                model_id=model_name,
                client=bedrock_client,
                model_params={"temperature": 0},
            ),
            model_name,
        )

    if "OLLAMA" in model:
        from neo4j_graphrag.llm import OllamaLLM

        model_name, base_url = env_value.split(",")
        return (
            OllamaLLM(model_name=model_name, host=base_url, model_params={"temperature": 0}),
            model_name,
        )

    if "DIFFBOT" in model:
        raise LLMGraphBuilderException(
            "Diffbot extraction is not supported when USE_GRAPHRAG_EXTRACTOR=true. "
            "Disable the flag or pick a different model."
        )

    # Catch-all: an OpenAI-compatible custom endpoint, "model_name,api_endpoint,api_key".
    from neo4j_graphrag.llm import OpenAILLM

    model_name, api_endpoint, api_key = env_value.split(",")
    return (
        OpenAILLM(
            model_name=model_name,
            model_params={"temperature": 0},
            api_key=api_key,
            base_url=api_endpoint,
        ),
        model_name,
    )


def get_graphrag_llm(model: str) -> tuple[Any, str, TokenUsageCounter]:
    """Build a neo4j-graphrag LLM and return ``(llm, model_name, token_counter)``.

    The token counter aggregates per-call ``LLMResponse.usage`` and is the
    replacement for ``UniversalTokenUsageHandler``.
    """
    normalized = model.upper().replace(".", "_").strip()
    env_key = f"LLM_MODEL_CONFIG_{normalized}"
    env_value = get_value_from_env(env_key)
    if not env_value:
        raise LLMGraphBuilderException(
            f"Environment variable '{env_key}' is not defined as per format or missing"
        )

    llm, model_name = _build_llm(normalized, env_value)
    llm, counter = wrap_with_usage(llm)
    logging.info("graphrag LLM created: %s -> %s", env_key, model_name)
    return llm, model_name, counter
