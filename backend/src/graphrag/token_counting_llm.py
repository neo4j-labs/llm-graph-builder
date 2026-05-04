"""Thin wrapper around neo4j-graphrag's LLMInterface that records token usage.

Mirrors the role of LangChain's UniversalTokenUsageHandler in src/shared/common_fn.py
but at the call-result layer rather than via a callback registry. Each invoke /
ainvoke captures LLMResponse.usage into the wrapper's `usage` counter; callers
read `wrapper.usage` after the run, exactly as they did with
`UniversalTokenUsageHandler.input_tokens` etc. before this migration.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TokenUsageCounter:
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    requests: int = 0
    extras: dict[str, Any] = field(default_factory=dict)

    def add(self, llm_usage: Any) -> None:
        """Add a single LLMResponse.usage payload to the running totals.

        Tolerates the small shape variations between providers — neo4j-graphrag's
        ``LLMUsage`` exposes ``request_tokens``/``response_tokens``/``total_tokens``;
        some adapters set only the totals.
        """
        if llm_usage is None:
            return
        try:
            self.input_tokens += int(getattr(llm_usage, "request_tokens", 0) or 0)
            self.output_tokens += int(getattr(llm_usage, "response_tokens", 0) or 0)
            total = getattr(llm_usage, "total_tokens", None)
            if total is not None:
                self.total_tokens += int(total)
            else:
                self.total_tokens += self.input_tokens + self.output_tokens
            self.requests += 1
        except Exception as e:
            logging.warning(f"Could not record LLM usage: {e}")


def wrap_with_usage(llm: Any) -> tuple[Any, TokenUsageCounter]:
    """Wrap an LLMInterface so post-call `usage` flows into a counter.

    We override `invoke` and `ainvoke` to inspect their return values; everything
    else delegates to the wrapped instance.
    """
    counter = TokenUsageCounter()
    original_invoke = getattr(llm, "invoke", None)
    original_ainvoke = getattr(llm, "ainvoke", None)

    def invoke_wrapper(*args, **kwargs):
        response = original_invoke(*args, **kwargs)
        counter.add(getattr(response, "usage", None))
        return response

    async def ainvoke_wrapper(*args, **kwargs):
        response = await original_ainvoke(*args, **kwargs)
        counter.add(getattr(response, "usage", None))
        return response

    if callable(original_invoke):
        try:
            llm.invoke = invoke_wrapper  # type: ignore[assignment]
        except Exception:
            logging.debug("Could not patch invoke() on %s; usage tracking will be partial", type(llm).__name__)
    if callable(original_ainvoke):
        try:
            llm.ainvoke = ainvoke_wrapper  # type: ignore[assignment]
        except Exception:
            logging.debug("Could not patch ainvoke() on %s; usage tracking will be partial", type(llm).__name__)
    return llm, counter
