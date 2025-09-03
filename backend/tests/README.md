# Backend Tests

This directory contains all test files for the LLM Graph Builder Backend.

## Test Structure

### Test Categories

- **Unit Tests** (`test_*.py`): Test individual functions and classes in isolation
- **Integration Tests** (`test_*integration*.py`): Test interactions between components
- **Performance Tests** (`Performance_test.py`): Test system performance and load handling

### Test Files

#### Core Functionality Tests
- `test_monitoring_integration.py` - Tests the complete monitoring flow
- `test_risk_assessment.py` - Tests risk assessment functionality
- `test_risk_monitor.py` - Tests risk monitoring features
- `test_search.py` - Tests search functionality
- `test_search_method.py` - Tests different search methods

#### Extraction Tests
- `test_chunk_extraction.py` - Tests document chunking
- `test_source_extraction.py` - Tests source extraction
- `test_enhanced_source_extraction.py` - Tests enhanced extraction features
- `test_enhanced_sources.py` - Tests various source types

#### Entity and Graph Tests
- `test_entity_types.py` - Tests entity type handling
- `test_name_variations.py` - Tests name variation detection
- `test_chunk_diagnosis.py` - Tests chunk analysis

#### Performance and Load Tests
- `Performance_test.py` - Performance benchmarking
- `test_performance_improvement.py` - Performance optimization tests

#### Integration Tests
- `test_integrationqa.py` - End-to-end integration tests
- `test_commutiesqa.py` - Community QA integration tests

## Running Tests

### Using the Test Runner Script

```bash
# Run all tests
python3 run_tests.py all

# Run specific test categories
python3 run_tests.py monitoring    # Monitoring tests only
python3 run_tests.py risk         # Risk assessment tests only
python3 run_tests.py search       # Search tests only
python3 run_tests.py extraction   # Extraction tests only

# Run with verbose output
python3 run_tests.py all --verbose
```

### Using Pytest Directly

```bash
# Install pytest if not already installed
pip install pytest pytest-cov

# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_monitoring_integration.py

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test markers
pytest tests/ -m unit          # Unit tests only
pytest tests/ -m integration   # Integration tests only
pytest tests/ -m slow          # Slow tests only
```

### Test Markers

Tests are automatically categorized using markers:

- `@pytest.mark.unit` - Unit tests (default)
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Performance/slow tests

## Test Configuration

- `conftest.py` - Pytest configuration and fixtures
- `__init__.py` - Package initialization
- Test data directory (if needed)

## Adding New Tests

1. Create test file with `test_` prefix
2. Use descriptive test names
3. Add appropriate markers if needed
4. Follow existing test patterns
5. Update this README if adding new test categories

## Test Data

If your tests require specific data files, place them in a `tests/data/` directory and use the `test_data_dir` fixture.

## Coverage

Run tests with coverage to see code coverage reports:

```bash
pytest tests/ --cov=src --cov-report=html --cov-report=term
```

This will generate both terminal and HTML coverage reports.
