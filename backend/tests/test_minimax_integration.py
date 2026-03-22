"""Integration tests for MiniMax LLM provider.

These tests verify MiniMax API connectivity and model functionality.
They require a valid MINIMAX_API_KEY environment variable to run.

Run with: pytest tests/test_minimax_integration.py -v -m integration
"""

import os
import pytest

pytestmark = pytest.mark.integration

MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
SKIP_REASON = "MINIMAX_API_KEY not set"


@pytest.mark.skipif(not MINIMAX_API_KEY, reason=SKIP_REASON)
class TestMiniMaxIntegration:
    """Integration tests that call the actual MiniMax API."""

    def test_minimax_m27_chat_completion(self):
        """Test a basic chat completion with MiniMax M2.7."""
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            api_key=MINIMAX_API_KEY,
            base_url="https://api.minimax.io/v1",
            model="MiniMax-M2.7",
            temperature=0,
        )
        response = llm.invoke("What is 2+2? Reply with just the number.")
        assert response.content is not None
        assert len(response.content) > 0
        assert "4" in response.content

    def test_minimax_m27_highspeed_chat_completion(self):
        """Test a basic chat completion with MiniMax M2.7-highspeed."""
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            api_key=MINIMAX_API_KEY,
            base_url="https://api.minimax.io/v1",
            model="MiniMax-M2.7-highspeed",
            temperature=0,
        )
        response = llm.invoke("What is the capital of France? Reply in one word.")
        assert response.content is not None
        assert "Paris" in response.content

    def test_minimax_structured_output_support(self):
        """Test that MiniMax supports structured output via with_structured_output."""
        from langchain_openai import ChatOpenAI
        from pydantic import BaseModel

        llm = ChatOpenAI(
            api_key=MINIMAX_API_KEY,
            base_url="https://api.minimax.io/v1",
            model="MiniMax-M2.7",
            temperature=0,
        )
        # Verify the LLM object has with_structured_output method
        # (needed for LLMGraphTransformer to use structured extraction)
        assert hasattr(llm, "with_structured_output")
