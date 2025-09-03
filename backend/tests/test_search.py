#!/usr/bin/env python3
"""
Test script for the search functionality
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_nodes, get_subgraph_from_node, search_and_get_subgraph

load_dotenv()

def test_search_functionality():
    """Test the search functionality with sample data"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔍 Testing search functionality...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Test 1: Search for nodes
        print("\n1. Testing node search...")
        search_results = search_nodes(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="test",
            node_type="Person",
            max_results=5
        )
        
        print(f"✅ Search completed successfully")
        print(f"   Total results: {search_results['total_results']}")
        print(f"   Nodes found: {len(search_results['nodes'])}")
        
        if search_results['nodes']:
            print(f"   Sample node: {search_results['nodes'][0]}")
            
            # Test 2: Get subgraph from first node
            print("\n2. Testing subgraph extraction...")
            first_node = search_results['nodes'][0]
            subgraph = get_subgraph_from_node(
                uri=uri,
                username=username,
                password=password,
                database=database,
                node_id=first_node['element_id'],
                depth=2,
                max_nodes=100
            )
            
            print(f"✅ Subgraph extraction completed successfully")
            print(f"   Nodes in subgraph: {len(subgraph['nodes'])}")
            print(f"   Relationships in subgraph: {len(subgraph['relationships'])}")
        
        # Test 3: Combined search and subgraph
        print("\n3. Testing combined search and subgraph...")
        combined_results = search_and_get_subgraph(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="test",
            node_type="Person",
            depth=2,
            max_results=3
        )
        
        print(f"✅ Combined search completed successfully")
        print(f"   Total results: {combined_results['total_results']}")
        print(f"   Subgraphs extracted: {len(combined_results['subgraphs'])}")
        
        print("\n🎉 All tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_search_functionality()
    sys.exit(0 if success else 1)
