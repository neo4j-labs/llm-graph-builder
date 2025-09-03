"""
Pytest configuration and fixtures for LLM Graph Builder Backend tests
"""

import pytest
import os
import sys
from pathlib import Path

# Add src to Python path for imports
backend_dir = Path(__file__).parent.parent
src_dir = backend_dir / "src"
sys.path.insert(0, str(src_dir))

# Test configuration
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest with custom markers and settings"""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow running tests"
    )

def pytest_collection_modifyitems(config, items):
    """Automatically mark tests based on their names"""
    for item in items:
        # Mark integration tests
        if "integration" in item.name.lower():
            item.add_marker(pytest.mark.integration)
        
        # Mark performance tests
        if "performance" in item.name.lower():
            item.add_marker(pytest.mark.slow)
        
        # Mark unit tests (default)
        if not any(marker.name in ['integration', 'slow'] for marker in item.iter_markers()):
            item.add_marker(pytest.mark.unit)

@pytest.fixture(scope="session")
def test_data_dir():
    """Provide path to test data directory"""
    return Path(__file__).parent / "data"

@pytest.fixture(scope="session")
def backend_src_dir():
    """Provide path to backend src directory"""
    return Path(__file__).parent.parent / "src"
