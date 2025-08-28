#!/usr/bin/env python3
"""
Test script for name variation search (e.g., "Bill Gates" vs "Billy Gates")
"""

import os
import sys
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_nodes, check_vector_availability

load_dotenv()

def test_name_variations():
    """Test how the search handles name variations"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔍 Testing name variation search functionality...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Test cases for name variations
        test_cases = [
            {
                "search_term": "Billy Gates",
                "expected": "Bill Gates",
                "description": "Nickname variation"
            },
            {
                "search_term": "William Gates",
                "expected": "Bill Gates", 
                "description": "Full name variation"
            },
            {
                "search_term": "Gates Bill",
                "expected": "Bill Gates",
                "description": "Reversed name order"
            },
            {
                "search_term": "Bill",
                "expected": "Bill Gates",
                "description": "Partial name"
            },
            {
                "search_term": "Gates",
                "expected": "Bill Gates",
                "description": "Last name only"
            }
        ]
        
        print(f"\n📋 Testing {len(test_cases)} name variation scenarios...")
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{i}. Testing: '{test_case['search_term']}' -> Expected: '{test_case['expected']}'")
            print(f"   Description: {test_case['description']}")
            
            # Test with hybrid search (default)
            print("   🔄 Testing with hybrid search...")
            hybrid_results = search_nodes(
                uri=uri,
                username=username,
                password=password,
                database=database,
                search_term=test_case['search_term'],
                node_type="Person",
                max_results=5,
                prefer_vector=True,
                use_hybrid=True
            )
            
            print(f"      Search method: {hybrid_results['search_method']}")
            print(f"      Total results: {hybrid_results['total_results']}")
            
            if hybrid_results['nodes']:
                print("      Top results:")
                for j, node in enumerate(hybrid_results['nodes'][:3]):
                    node_name = node.get('properties', {}).get('id', 'Unknown')
                    combined_score = node.get('combined_score', 'N/A')
                    similarity_score = node.get('similarity_score', 'N/A')
                    match_ratio = node.get('match_ratio', 'N/A')
                    
                    print(f"        {j+1}. {node_name}")
                    print(f"           Combined score: {combined_score}")
                    print(f"           Vector similarity: {similarity_score}")
                    print(f"           Fuzzy match ratio: {match_ratio}")
                    
                    # Check if we found the expected result
                    if test_case['expected'].lower() in node_name.lower():
                        print(f"           ✅ Found expected result!")
                        break
                else:
                    print(f"           ❌ Expected result '{test_case['expected']}' not found in top 3")
            else:
                print("      ❌ No results found")
            
            # Test with vector-only search
            print("   🧠 Testing with vector-only search...")
            vector_results = search_nodes(
                uri=uri,
                username=username,
                password=password,
                database=database,
                search_term=test_case['search_term'],
                node_type="Person",
                max_results=5,
                prefer_vector=True,
                use_hybrid=False
            )
            
            print(f"      Search method: {vector_results['search_method']}")
            print(f"      Total results: {vector_results['total_results']}")
            
            if vector_results['nodes']:
                print("      Top vector results:")
                for j, node in enumerate(vector_results['nodes'][:3]):
                    node_name = node.get('properties', {}).get('id', 'Unknown')
                    similarity_score = node.get('similarity_score', 'N/A')
                    print(f"        {j+1}. {node_name} (similarity: {similarity_score})")
            
            # Test with fuzzy text-only search
            print("   🔤 Testing with fuzzy text-only search...")
            fuzzy_results = search_nodes(
                uri=uri,
                username=username,
                password=password,
                database=database,
                search_term=test_case['search_term'],
                node_type="Person",
                max_results=5,
                prefer_vector=False,
                use_hybrid=False
            )
            
            print(f"      Search method: {fuzzy_results['search_method']}")
            print(f"      Total results: {fuzzy_results['total_results']}")
            
            if fuzzy_results['nodes']:
                print("      Top fuzzy text results:")
                for j, node in enumerate(fuzzy_results['nodes'][:3]):
                    node_name = node.get('properties', {}).get('id', 'Unknown')
                    match_ratio = node.get('match_ratio', 'N/A')
                    print(f"        {j+1}. {node_name} (match ratio: {match_ratio})")
        
        print("\n🎉 Name variation tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_name_variations()
    sys.exit(0 if success else 1)
