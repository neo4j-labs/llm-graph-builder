#!/usr/bin/env python3
"""
Test script for the enhanced vector search functionality
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_nodes, check_vector_availability

load_dotenv()

def test_vector_search_functionality():
    """Test the enhanced vector search functionality"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔍 Testing enhanced vector search functionality...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Test 1: Check vector availability for different node types
        print("\n1. Checking vector availability...")
        from src.graph_query import get_graphDB_driver
        
        driver = get_graphDB_driver(uri, username, password, database)
        
        node_types_to_check = ["Person", "Organization", "Location", "Technology"]
        
        for node_type in node_types_to_check:
            vector_info = check_vector_availability(driver, node_type)
            print(f"   {node_type}: {vector_info['has_embeddings']} "
                  f"({vector_info['nodes_with_embeddings']}/{vector_info['total_nodes']} nodes, "
                  f"{vector_info['embedding_coverage']:.1%} coverage)")
        
        driver.close()
        
        # Test 2: Search with vector preference (default)
        print("\n2. Testing search with vector preference...")
        search_results = search_nodes(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="software engineer",
            node_type="Person",
            max_results=5,
            prefer_vector=True
        )
        
        print(f"✅ Search completed successfully")
        print(f"   Search method used: {search_results['search_method']}")
        print(f"   Vector available: {search_results['search_metadata']['vector_available']}")
        print(f"   Embedding coverage: {search_results['search_metadata']['embedding_coverage']:.1%}")
        print(f"   Total results: {search_results['total_results']}")
        print(f"   Nodes found: {len(search_results['nodes'])}")
        
        if search_results['nodes']:
            print(f"   Sample node: {search_results['nodes'][0]}")
            
            # Show similarity scores if using vector search
            if search_results['search_method'] == 'vector_similarity':
                print("   Similarity scores:")
                for i, node in enumerate(search_results['nodes'][:3]):
                    print(f"     {i+1}. {node.get('properties', {}).get('id', 'Unknown')}: {node.get('similarity_score', 'N/A')}")
        
        # Test 3: Search with text preference
        print("\n3. Testing search with text preference...")
        text_search_results = search_nodes(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="John",
            node_type="Person",
            max_results=5,
            prefer_vector=False
        )
        
        print(f"✅ Text search completed successfully")
        print(f"   Search method used: {text_search_results['search_method']}")
        print(f"   Total results: {text_search_results['total_results']}")
        
        # Test 4: Search for organizations
        print("\n4. Testing organization search...")
        org_search_results = search_nodes(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="technology company",
            node_type="Organization",
            max_results=3,
            prefer_vector=True
        )
        
        print(f"✅ Organization search completed successfully")
        print(f"   Search method used: {org_search_results['search_method']}")
        print(f"   Total results: {org_search_results['total_results']}")
        
        if org_search_results['nodes']:
            print("   Organizations found:")
            for i, node in enumerate(org_search_results['nodes']):
                org_name = node.get('properties', {}).get('id', 'Unknown')
                similarity = node.get('similarity_score', 'N/A')
                print(f"     {i+1}. {org_name} (similarity: {similarity})")
        
        print("\n🎉 All tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_vector_search_functionality()
    sys.exit(0 if success else 1)
