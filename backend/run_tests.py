#!/usr/bin/env python3
"""
Test runner script for LLM Graph Builder Backend
Run all tests or specific test categories
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests(test_type="all", verbose=False):
    """Run tests based on type"""
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Base pytest command
    cmd = ["python3", "-m", "pytest", "tests/"]
    
    # Add verbose flag
    if verbose:
        cmd.append("-v")
    
    # Add specific test type filters
    if test_type == "unit":
        cmd.extend(["-m", "unit"])
    elif test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "slow":
        cmd.extend(["-m", "slow"])
    elif test_type == "monitoring":
        cmd.extend(["tests/test_monitoring_integration.py", "-v"])
    elif test_type == "risk":
        cmd.extend(["tests/test_risk_*.py", "-v"])
    elif test_type == "search":
        cmd.extend(["tests/test_search*.py", "-v"])
    elif test_type == "extraction":
        cmd.extend(["tests/test_*extraction*.py", "-v"])
    
    # Add coverage if available
    try:
        import coverage
        cmd.extend(["--cov=src", "--cov-report=html", "--cov-report=term"])
    except ImportError:
        print("Coverage not available, install with: pip install coverage")
    
    print(f"🚀 Running {test_type} tests...")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 60)
    
    try:
        result = subprocess.run(cmd, check=True)
        print(f"\n✅ Tests completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print("❌ pytest not found. Install with: pip install pytest")
        return False

def main():
    """Main function to parse arguments and run tests"""
    
    if len(sys.argv) < 2:
        print("Usage: python3 run_tests.py <test_type> [--verbose]")
        print("\nTest types:")
        print("  all          - Run all tests")
        print("  unit         - Run unit tests only")
        print("  integration  - Run integration tests only")
        print("  slow         - Run slow/performance tests only")
        print("  monitoring   - Run monitoring integration tests")
        print("  risk         - Run risk assessment tests")
        print("  search       - Run search-related tests")
        print("  extraction   - Run extraction-related tests")
        print("\nOptions:")
        print("  --verbose    - Verbose output")
        return
    
    test_type = sys.argv[1].lower()
    verbose = "--verbose" in sys.argv
    
    # Validate test type
    valid_types = ["all", "unit", "integration", "slow", "monitoring", "risk", "search", "extraction"]
    if test_type not in valid_types:
        print(f"❌ Invalid test type: {test_type}")
        print(f"Valid types: {', '.join(valid_types)}")
        sys.exit(1)
    
    # Run tests
    success = run_tests(test_type, verbose)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
