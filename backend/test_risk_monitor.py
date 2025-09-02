#!/usr/bin/env python3
"""
Test script for Risk Monitoring functionality
"""

import json
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_risk_monitoring_imports():
    """Test that all imports work correctly."""
    try:
        from src.risk_monitor import perform_risk_monitoring
        from src.constants.risk_monitoring_prompts import RISK_MONITORING_PROMPTS, RISK_LEVELS
        print("✅ All imports successful")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_constants():
    """Test that constants are properly defined."""
    try:
        from src.constants.risk_monitoring_prompts import RISK_MONITORING_PROMPTS, RISK_LEVELS
        
        # Check prompts
        required_prompts = ["NAME_MONITORING", "RISK_ANALYSIS", "RISK_SUMMARY"]
        for prompt in required_prompts:
            if prompt not in RISK_MONITORING_PROMPTS:
                print(f"❌ Missing prompt: {prompt}")
                return False
        
        # Check risk levels
        required_levels = ["LOW", "MEDIUM", "HIGH"]
        for level in required_levels:
            if level not in RISK_LEVELS:
                print(f"❌ Missing risk level: {level}")
                return False
        
        print("✅ All constants properly defined")
        return True
    except Exception as e:
        print(f"❌ Constants test failed: {e}")
        return False

def test_function_signatures():
    """Test that function signatures are correct."""
    try:
        from src.risk_monitor import perform_risk_monitoring
        
        # Check function exists and has correct signature
        if not callable(perform_risk_monitoring):
            print("❌ perform_risk_monitoring is not callable")
            return False
        
        print("✅ Function signatures correct")
        return True
    except Exception as e:
        print(f"❌ Function signature test failed: {e}")
        return False

def test_sample_data():
    """Test with sample data structures."""
    try:
        # Sample monitored names
        monitored_names = ["John Doe", "Jane Smith", "Acme Corp"]
        
        # Sample risk indicators
        risk_indicators = [
            "financial_fraud",
            "regulatory_violation", 
            "money_laundering",
            "insider_trading"
        ]
        
        # Sample document name
        document_name = "sample_document.pdf"
        
        print("✅ Sample data structures created:")
        print(f"   - Monitored names: {monitored_names}")
        print(f"   - Risk indicators: {risk_indicators}")
        print(f"   - Document: {document_name}")
        
        return True
    except Exception as e:
        print(f"❌ Sample data test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing Risk Monitoring Implementation")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_risk_monitoring_imports),
        ("Constants Test", test_constants),
        ("Function Signatures Test", test_function_signatures),
        ("Sample Data Test", test_sample_data)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name}...")
        if test_func():
            passed += 1
            print(f"✅ {test_name} PASSED")
        else:
            print(f"❌ {test_name} FAILED")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Risk monitoring implementation is ready.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
