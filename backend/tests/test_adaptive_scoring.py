#!/usr/bin/env python3
"""
Test script to demonstrate adaptive scoring fix for embedding coverage issues
"""

import os
import sys
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_nodes, combine_search_results

load_dotenv()

def test_adaptive_scoring():
    """Test the adaptive scoring with different embedding coverage scenarios"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔧 Testing adaptive scoring with embedding coverage...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Test search term that should match "Bill Gates"
        search_term = "Bil Gate"
        expected_match = "Bill Gates"
        
        print(f"\n🔍 Testing search term: '{search_term}' -> Expected: '{expected_match}'")
        
        # Test with current database (low embedding coverage)
        print("\n1️⃣ Testing with current database (low embedding coverage ~3.8%)")
        try:
            result = search_nodes(
                uri=uri,
                username=username,
                password=password,
                database=database,
                search_term=search_term,
                node_type="Person",
                max_results=5,
                prefer_vector=True,
                use_hybrid=True
            )
            
            print(f"   Search method: {result['search_method']}")
            print(f"   Vector coverage: {result['vector_info']['embedding_coverage']:.1%}")
            print(f"   Total results: {result['total_results']}")
            
            if result['nodes']:
                print("   Top results:")
                found_expected = False
                for i, node in enumerate(result['nodes'][:3]):
                    node_name = node.get('properties', {}).get('id', 'Unknown')
                    combined_score = node.get('combined_score', 'N/A')
                    vector_score = node.get('similarity_score', 'N/A')
                    fuzzy_score = node.get('match_ratio', 'N/A')
                    vector_weight = node.get('vector_weight', 'N/A')
                    fuzzy_weight = node.get('fuzzy_weight', 'N/A')
                    search_method = node.get('search_method', 'unknown')
                    
                    print(f"     {i+1}. {node_name}")
                    print(f"        Combined score: {combined_score}")
                    print(f"        Vector score: {vector_score}")
                    print(f"        Fuzzy score: {fuzzy_score}")
                    print(f"        Vector weight: {vector_weight}")
                    print(f"        Fuzzy weight: {fuzzy_weight}")
                    print(f"        Search method: {search_method}")
                    
                    if expected_match.lower() in node_name.lower():
                        print(f"        ✅ Found expected result!")
                        if i == 0:
                            print(f"        🏆 Expected result is the BEST match!")
                        else:
                            print(f"        📊 Expected result is #{i+1} in ranking")
                        found_expected = True
                        break
                
                if not found_expected:
                    print(f"        ❌ Expected result '{expected_match}' not found in top 3")
                    
        except Exception as e:
            print(f"   ⚠️  Database test failed: {str(e)}")
        
        # Test adaptive scoring with simulated data
        print("\n2️⃣ Testing adaptive scoring with simulated data")
        
        # Simulate low embedding coverage scenario (like current database)
        print("   📊 Low embedding coverage scenario (3.8%):")
        vector_nodes = [
            {
                "element_id": "1",
                "properties": {"id": "Wendy Sun"},
                "similarity_score": 0.8844,
                "search_method": "vector_similarity"
            }
        ]
        
        fuzzy_nodes = [
            {
                "element_id": "2", 
                "properties": {"id": "Bill Gates"},
                "match_ratio": 1.0,
                "search_method": "fuzzy_text"
            },
            {
                "element_id": "3",
                "properties": {"id": "French Gates"}, 
                "match_ratio": 0.5,
                "search_method": "fuzzy_text"
            }
        ]
        
        # Test with low coverage (should favor fuzzy text)
        low_coverage_results = combine_search_results(vector_nodes, fuzzy_nodes, 5, 0.038)
        print("   Results with 3.8% coverage:")
        for i, node in enumerate(low_coverage_results):
            node_name = node.get('properties', {}).get('id', 'Unknown')
            combined_score = node.get('combined_score', 'N/A')
            vector_weight = node.get('vector_weight', 'N/A')
            fuzzy_weight = node.get('fuzzy_weight', 'N/A')
            print(f"     {i+1}. {node_name} (score: {combined_score}, weights: {vector_weight}/{fuzzy_weight})")
        
        # Test with high coverage (should favor vector)
        print("   📊 High embedding coverage scenario (80%):")
        high_coverage_results = combine_search_results(vector_nodes, fuzzy_nodes, 5, 0.8)
        print("   Results with 80% coverage:")
        for i, node in enumerate(high_coverage_results):
            node_name = node.get('properties', {}).get('id', 'Unknown')
            combined_score = node.get('combined_score', 'N/A')
            vector_weight = node.get('vector_weight', 'N/A')
            fuzzy_weight = node.get('fuzzy_weight', 'N/A')
            print(f"     {i+1}. {node_name} (score: {combined_score}, weights: {vector_weight}/{fuzzy_weight})")
        
        # Test with medium coverage
        print("   📊 Medium embedding coverage scenario (30%):")
        medium_coverage_results = combine_search_results(vector_nodes, fuzzy_nodes, 5, 0.3)
        print("   Results with 30% coverage:")
        for i, node in enumerate(medium_coverage_results):
            node_name = node.get('properties', {}).get('id', 'Unknown')
            combined_score = node.get('combined_score', 'N/A')
            vector_weight = node.get('vector_weight', 'N/A')
            fuzzy_weight = node.get('fuzzy_weight', 'N/A')
            print(f"     {i+1}. {node_name} (score: {combined_score}, weights: {vector_weight}/{fuzzy_weight})")
        
        print("\n✅ Adaptive scoring tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_adaptive_scoring()
    sys.exit(0 if success else 1)
