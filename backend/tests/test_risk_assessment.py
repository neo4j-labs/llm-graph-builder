#!/usr/bin/env python3
"""
Test script to demonstrate risk assessment functionality
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.risk_assessment import analyze_risk

load_dotenv()

def test_risk_assessment():
    """Test the risk assessment functionality"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔍 Testing risk assessment functionality...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Define risk indicators for testing
        risk_indicators = {
            "Foreign State Influence": 80,
            "Dual-Use Technology Exposure": 70,
            "Compliance with Canadian Research Security Policies": 60,
            "International Collaboration Patterns": 50,
            "Funding Sources Transparency": 40
        }
        
        # Test cases
        test_cases = [
            {
                "entity_name": "Bill Gates",
                "entity_type": "Person",
                "description": "Individual person assessment"
            },
            {
                "entity_name": "Microsoft",
                "entity_type": "Organization", 
                "description": "Organization assessment"
            },
            {
                "entity_name": "OpenAI",
                "entity_type": "Organization",
                "description": "AI company assessment"
            }
        ]
        
        print(f"\n📋 Testing {len(test_cases)} risk assessment scenarios...")
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{i}. Testing: '{test_case['entity_name']}' ({test_case['entity_type']})")
            print(f"   Description: {test_case['description']}")
            
            try:
                # Perform risk assessment
                result = analyze_risk(
                    uri=uri,
                    username=username,
                    password=password,
                    database=database,
                    entity_name=test_case['entity_name'],
                    entity_type=test_case['entity_type'],
                    risk_indicators=risk_indicators,
                    depth=4,
                    max_results=10
                )
                
                # Check if entity was found
                if 'error' in result:
                    print(f"   ❌ {result['error']}")
                    continue
                
                # Display results
                print(f"   ✅ Risk assessment completed")
                print(f"   📊 Analysis metadata:")
                metadata = result.get('analysis_metadata', {})
                print(f"      Chunks analyzed: {metadata.get('chunks_analyzed', 0)}")
                print(f"      Subgraph nodes: {metadata.get('subgraph_nodes', 0)}")
                print(f"      Subgraph relationships: {metadata.get('subgraph_relationships', 0)}")
                print(f"      Search method: {metadata.get('search_method', 'unknown')}")
                print(f"      Best match score: {metadata.get('best_match_score', 'N/A')}")
                
                # Display risk assessment results
                calculation = result.get('calculation', {})
                final_assessment = result.get('finalAssessment', {})
                
                print(f"   🎯 Risk assessment results:")
                print(f"      Overall score: {calculation.get('overallScore', 'N/A')}")
                print(f"      Traffic light: {final_assessment.get('trafficLight', 'N/A')}")
                print(f"      Overall explanation: {final_assessment.get('overallExplanation', 'N/A')}")
                
                # Display individual risk indicators
                risk_assessments = result.get('riskAssessments', [])
                print(f"   📋 Individual risk indicators:")
                for assessment in risk_assessments:
                    indicator = assessment.get('indicator', 'Unknown')
                    score = assessment.get('score', 'N/A')
                    weight = assessment.get('weight', 'N/A')
                    sources = assessment.get('sources', [])
                    explanation = assessment.get('explanation', 'N/A')
                    
                    print(f"      • {indicator}")
                    print(f"        Score: {score}/5, Weight: {weight}")
                    print(f"        Sources: {sources if sources else ['nil']}")
                    print(f"        Explanation: {explanation[:100]}...")
                
                # Save detailed results to file
                output_file = f"risk_assessment_{test_case['entity_name'].replace(' ', '_')}.json"
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"   💾 Detailed results saved to: {output_file}")
                
            except Exception as e:
                print(f"   ❌ Risk assessment failed: {str(e)}")
        
        print("\n✅ Risk assessment tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

def test_api_endpoint():
    """Test the risk assessment API endpoint"""
    
    print("\n🌐 Testing API endpoint...")
    
    # Example curl command
    risk_indicators_json = json.dumps({
        "Foreign State Influence": 80,
        "Dual-Use Technology Exposure": 70,
        "Compliance with Canadian Research Security Policies": 60
    })
    
    curl_command = f'''curl -X POST "http://localhost:8000/analyze_risk" \\
  -F "uri=your_neo4j_uri" \\
  -F "userName=your_username" \\
  -F "password=your_password" \\
  -F "database=neo4j" \\
  -F "entity_name=Bill Gates" \\
  -F "entity_type=Person" \\
  -F "risk_indicators='{risk_indicators_json}'" \\
  -F "depth=4" \\
  -F "max_results=10"'''
    
    print("Example API call:")
    print(curl_command)
    
    print("\n📝 API Parameters:")
    print("  • entity_name: Name of the entity to assess")
    print("  • entity_type: Type of entity (Person, Organization, etc.)")
    print("  • risk_indicators: JSON string of risk indicators and weights")
    print("  • depth: Depth for subgraph extraction (default: 4)")
    print("  • max_results: Maximum search results to consider (default: 10)")

if __name__ == "__main__":
    success = test_risk_assessment()
    test_api_endpoint()
    sys.exit(0 if success else 1)
