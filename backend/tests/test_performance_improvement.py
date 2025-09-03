#!/usr/bin/env python3
"""
Test script to demonstrate performance improvement from extracting only the best match
"""

import os
import sys
import time
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_and_get_subgraph

load_dotenv()

def test_performance_improvement():
    """Test the performance improvement from extracting only the best match"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🚀 Testing performance improvement with best match extraction...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Test search term that should return multiple results
        search_term = "Bil Gate"  # Should match "Bill Gates" and potentially others
        
        print(f"\n🔍 Testing search term: '{search_term}'")
        
        # Test 1: Extract from best match only (fast)
        print("\n1️⃣ Testing with extract_best_match_only=True (FAST)")
        start_time = time.time()
        
        result_fast = search_and_get_subgraph(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term=search_term,
            node_type="Person",
            depth=4,
            max_results=10,
            extract_best_match_only=True
        )
        
        fast_time = time.time() - start_time
        
        print(f"   ⏱️  Time taken: {fast_time:.2f} seconds")
        print(f"   📊 Total matches found: {result_fast['total_results']}")
        print(f"   🎯 Best match: {result_fast['best_match']['node_name']}")
        print(f"   🏆 Best match score: {result_fast['best_match']['score']}")
        print(f"   📈 Subgraphs extracted: {len(result_fast['subgraphs'])}")
        
        if result_fast['subgraphs']:
            subgraph = result_fast['subgraphs'][0]
            print(f"   🔗 Subgraph nodes: {len(subgraph.get('nodes', []))}")
            print(f"   🔗 Subgraph relationships: {len(subgraph.get('relationships', []))}")
        
        # Test 2: Extract from all matches (slow)
        print("\n2️⃣ Testing with extract_best_match_only=False (SLOW)")
        start_time = time.time()
        
        result_slow = search_and_get_subgraph(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term=search_term,
            node_type="Person",
            depth=4,
            max_results=5,  # Limit to 5 to avoid too much delay
            extract_best_match_only=False
        )
        
        slow_time = time.time() - start_time
        
        print(f"   ⏱️  Time taken: {slow_time:.2f} seconds")
        print(f"   📊 Total matches found: {result_slow['total_results']}")
        print(f"   🎯 Best match: {result_slow['best_match']['node_name']}")
        print(f"   🏆 Best match score: {result_slow['best_match']['score']}")
        print(f"   📈 Subgraphs extracted: {len(result_slow['subgraphs'])}")
        
        # Performance comparison
        print("\n📊 Performance Comparison:")
        print(f"   Fast method (best match only): {fast_time:.2f}s")
        print(f"   Slow method (all matches): {slow_time:.2f}s")
        
        if slow_time > 0:
            speedup = slow_time / fast_time
            print(f"   🚀 Speedup: {speedup:.1f}x faster")
        
        # Show all matches found
        print("\n📋 All matches found:")
        for i, match in enumerate(result_fast['all_matches'][:5]):
            print(f"   {i+1}. {match['node_name']} (score: {match['score']}, method: {match['search_method']})")
        
        print("\n✅ Performance test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_performance_improvement()
    sys.exit(0 if success else 1)
