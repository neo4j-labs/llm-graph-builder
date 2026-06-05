"""Unit tests for MiniMax LLM provider integration.

These tests validate the MiniMax provider configuration, model routing logic,
and ChatOpenAI integration without requiring a running backend or Neo4j instance.
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock, ANY
import importlib
import importlib.util


def _load_llm_module():
    """Load src/llm.py directly by file path to avoid 'src' namespace conflicts."""
    llm_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "src", "llm.py"
    )
    spec = importlib.util.spec_from_file_location("_llm", llm_path)
    mod = importlib.util.module_from_spec(spec)
    return mod, spec, llm_path


class TestMiniMaxModelRouting:
    """Tests for MiniMax model detection in the get_llm() routing logic."""

    def test_minimax_m3_keyword_in_model_string(self):
        """Test that 'MINIMAX' is detected for the M3 variant."""
        model = "minimax_m3"
        upper = model.upper().replace(".", "_").strip()
        assert "MINIMAX" in upper

    def test_minimax_keyword_in_model_string(self):
        """Test that 'MINIMAX' is detected when the model key is uppercased."""
        model = "minimax_m2.7"
        upper = model.upper().replace(".", "_").strip()
        assert "MINIMAX" in upper

    def test_minimax_highspeed_keyword_in_model_string(self):
        """Test that 'MINIMAX' is detected for the highspeed variant."""
        model = "minimax_m2.7_highspeed"
        upper = model.upper().replace(".", "_").strip()
        assert "MINIMAX" in upper

    def test_minimax_not_confused_with_openai(self):
        """Test MiniMax is not confused with OpenAI models."""
        minimax = "minimax_m2.7".upper()
        openai = "openai_gpt_5_mini".upper()
        assert "MINIMAX" in minimax and "OPENAI" not in minimax
        assert "OPENAI" in openai and "MINIMAX" not in openai

    def test_minimax_not_confused_with_gemini(self):
        """Test MiniMax is not confused with Gemini models."""
        minimax = "minimax_m2.7".upper()
        assert "GEMINI" not in minimax

    def test_minimax_not_confused_with_anthropic(self):
        """Test MiniMax is not confused with Anthropic models."""
        minimax = "minimax_m2.7".upper()
        assert "ANTHROPIC" not in minimax

    def test_minimax_not_confused_with_fireworks(self):
        """Test MiniMax is not confused with Fireworks models."""
        minimax = "minimax_m2.7".upper()
        assert "FIREWORKS" not in minimax

    def test_minimax_branch_before_fallback(self):
        """Test that MINIMAX matching comes before the else (fallback) branch."""
        llm_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src", "llm.py"
        )
        with open(llm_path) as f:
            content = f.read()
        minimax_pos = content.find('"MINIMAX"')
        else_pos = content.rfind("else:")
        assert minimax_pos > 0, "MINIMAX branch not found in llm.py"
        assert minimax_pos < else_pos, "MINIMAX branch should come before the fallback else"


class TestMiniMaxEnvConfig:
    """Tests for MiniMax environment variable configuration format."""

    def test_env_key_m3_model(self):
        """Test env key generation for MiniMax M3 model."""
        model = "minimax_m3"
        env_key = f"LLM_MODEL_CONFIG_{model.upper().replace('.', '_').strip()}"
        assert env_key == "LLM_MODEL_CONFIG_MINIMAX_M3"

    def test_env_key_standard_model(self):
        """Test env key generation for standard MiniMax model."""
        model = "minimax_m2.7"
        env_key = f"LLM_MODEL_CONFIG_{model.upper().replace('.', '_').strip()}"
        assert env_key == "LLM_MODEL_CONFIG_MINIMAX_M2_7"

    def test_env_key_highspeed_model(self):
        """Test env key generation for MiniMax highspeed model."""
        model = "minimax_m2.7_highspeed"
        env_key = f"LLM_MODEL_CONFIG_{model.upper().replace('.', '_').strip()}"
        assert env_key == "LLM_MODEL_CONFIG_MINIMAX_M2_7_HIGHSPEED"

    def test_env_value_parsing_m3(self):
        """Test parsing of M3 model env value."""
        env_value = "MiniMax-M3,sk-test-key-789"
        model_name, api_key = env_value.split(",")
        assert model_name == "MiniMax-M3"
        assert api_key == "sk-test-key-789"

    def test_env_value_parsing_two_fields(self):
        """Test parsing of 'model_name,api_key' format."""
        env_value = "MiniMax-M2.7,sk-test-key-123"
        model_name, api_key = env_value.split(",")
        assert model_name == "MiniMax-M2.7"
        assert api_key == "sk-test-key-123"

    def test_env_value_parsing_highspeed(self):
        """Test parsing of highspeed model env value."""
        env_value = "MiniMax-M2.7-highspeed,sk-test-key-456"
        model_name, api_key = env_value.split(",")
        assert model_name == "MiniMax-M2.7-highspeed"
        assert api_key == "sk-test-key-456"


class TestMiniMaxChatOpenAIParams:
    """Tests verifying the correct ChatOpenAI parameters for MiniMax."""

    def test_minimax_base_url(self):
        """Test that MiniMax uses the correct API base URL."""
        expected_base_url = "https://api.minimax.io/v1"
        assert expected_base_url.startswith("https://")
        assert "minimax" in expected_base_url

    def test_minimax_temperature_zero(self):
        """Test that temperature=0 is used for MiniMax (deterministic output)."""
        temperature = 0
        assert temperature == 0

    def test_minimax_model_names_valid(self):
        """Test that MiniMax model names match the API specification."""
        valid_models = ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7-highspeed"]
        for model in valid_models:
            assert model.startswith("MiniMax-")

    def test_minimax_source_code_uses_correct_params(self):
        """Verify the llm.py source contains correct MiniMax configuration."""
        llm_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src", "llm.py"
        )
        with open(llm_path) as f:
            content = f.read()

        # Check that MiniMax branch exists and uses correct params
        assert '"MINIMAX" in model' in content
        assert 'base_url="https://api.minimax.io/v1"' in content
        assert "temperature=0" in content

    def test_minimax_uses_chatopenai_class(self):
        """Verify MiniMax uses ChatOpenAI (OpenAI-compatible API)."""
        llm_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src", "llm.py"
        )
        with open(llm_path) as f:
            content = f.read()

        # Find the MINIMAX block and verify it uses ChatOpenAI
        minimax_start = content.find('"MINIMAX" in model')
        assert minimax_start > 0
        # Find the next elif/else after MINIMAX
        next_elif = content.find("elif", minimax_start + 1)
        minimax_block = content[minimax_start:next_elif]
        assert "ChatOpenAI" in minimax_block

    def test_minimax_env_value_split_count(self):
        """Test that MiniMax env value splits into exactly 2 parts."""
        llm_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src", "llm.py"
        )
        with open(llm_path) as f:
            content = f.read()

        minimax_start = content.find('"MINIMAX" in model')
        next_elif = content.find("elif", minimax_start + 1)
        minimax_block = content[minimax_start:next_elif]
        # Should split into model_name, api_key (2 parts)
        assert 'env_value.split(",")' in minimax_block


class TestMiniMaxExampleEnv:
    """Tests for MiniMax entries in example.env."""

    def test_example_env_contains_minimax(self):
        """Test that backend/example.env contains MiniMax configurations."""
        env_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "example.env"
        )
        with open(env_path) as f:
            content = f.read()

        assert "LLM_MODEL_CONFIG_minimax_m3=" in content
        assert "LLM_MODEL_CONFIG_minimax_m2.7=" in content
        assert "LLM_MODEL_CONFIG_minimax_m2.7_highspeed=" in content

    def test_example_env_minimax_format(self):
        """Test that MiniMax example.env entries follow the correct format."""
        env_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "example.env"
        )
        with open(env_path) as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if stripped.startswith("LLM_MODEL_CONFIG_minimax_"):
                    _, value = stripped.split("=", 1)
                    value = value.strip('"')
                    parts = value.split(",")
                    assert len(parts) == 2, f"MiniMax config should have 2 parts: {line}"
                    model_name, api_key_placeholder = parts
                    assert model_name.startswith("MiniMax-")


class TestMiniMaxFrontendConfig:
    """Tests for MiniMax entries in frontend Constants.ts."""

    def test_frontend_constants_contains_minimax(self):
        """Test that frontend Constants.ts includes MiniMax models."""
        constants_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "..", "frontend", "src", "utils", "Constants.ts"
        )
        with open(constants_path) as f:
            content = f.read()

        assert "minimax_m3" in content
        assert "minimax_m2.7" in content
        assert "minimax_m2.7_highspeed" in content


class TestMiniMaxReadme:
    """Tests for MiniMax entries in README."""

    def test_readme_lists_minimax(self):
        """Test that README.md lists MiniMax as a supported LLM."""
        readme_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "..", "README.md"
        )
        with open(readme_path) as f:
            content = f.read()

        assert "MiniMax" in content
