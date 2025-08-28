#!/usr/bin/env python3
"""
Test script to check what entity types are available in the database for search
"""

import os
import sys
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import diagnose_database_entities, search_nodes

load_dotenv()

def test_entity_types():
    """Check what entity types are available in the database"""
    
    # Get connection details from environment or use defaults
    uri = os.getenv('NEO4J_URI', 'neo4j+ssc://224c5da6.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', '')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    if not password:
        print("❌ NEO4J_PASSWORD environment variable not set")
        return False
    
    try:
        print("🔍 Checking available entity types in the database...")
        print(f"Connecting to: {uri}")
        print(f"Database: {database}")
        print(f"Username: {username}")
        
        # Get database diagnosis
        print("\n1️⃣ Getting database entity diagnosis...")
        diagnosis = diagnose_database_entities(uri, username, password, database)
        
        print(f"\n📊 Found {diagnosis['total_entity_types']} entity types:")
        for entity_type in diagnosis['entity_types']:
            print(f"   • {entity_type['type']}: {entity_type['count']} entities")
        
        print(f"\n📋 Sample entities:")
        for entity in diagnosis['sample_entities']:
            labels = entity['labels']
            entity_id = entity['id']
            entity_name = entity.get('name', 'N/A')
            entity_description = entity.get('description', 'N/A')
            entity_type = entity.get('type', 'N/A')
            
            print(f"   • Labels: {labels}")
            print(f"     ID: {entity_id}")
            print(f"     Name: {entity_name}")
            print(f"     Description: {entity_description}")
            print(f"     Type: {entity_type}")
            print()
        
        # Test search for different entity types
        print("2️⃣ Testing search for different entity types...")
        
        # Test search for each entity type
        for entity_type in diagnosis['entity_types'][:5]:  # Test first 5 types
            entity_type_name = entity_type['type']
            entity_count = entity_type['count']
            
            print(f"\n🔍 Testing search for entity type: '{entity_type_name}' ({entity_count} entities)")
            
            try:
                # Try a generic search term
                search_results = search_nodes(
                    uri=uri,
                    username=username,
                    password=password,
                    database=database,
                    search_term="test",  # Generic search term
                    node_type=entity_type_name,
                    max_results=3,
                    prefer_vector=True,
                    use_hybrid=True
                )
                
                print(f"   Search method: {search_results['search_method']}")
                print(f"   Total results: {search_results['total_results']}")
                print(f"   Vector coverage: {search_results['vector_info']['embedding_coverage']:.1%}")
                
                if search_results['nodes']:
                    print("   Top results:")
                    for i, node in enumerate(search_results['nodes'][:3]):
                        node_name = node.get('properties', {}).get('id', 'Unknown')
                        combined_score = node.get('combined_score', 'N/A')
                        print(f"     {i+1}. {node_name} (score: {combined_score})")
                else:
                    print("   ❌ No results found")
                    
            except Exception as e:
                print(f"   ⚠️  Search failed: {str(e)}")
        
        # Test specific entity type searches
        print("\n3️⃣ Testing specific entity type searches...")
        
        # Common entity types to test
        test_cases = [
            {"type": "Person", "search_term": "Bill"},
            {"type": "Organization", "search_term": "Microsoft"},
            {"type": "Company", "search_term": "Apple"},
            {"type": "Institution", "search_term": "University"},
            {"type": "Location", "search_term": "New York"},
            {"type": "Country", "search_term": "USA"},
            {"type": "City", "search_term": "London"},
            {"type": "Technology", "search_term": "AI"},
            {"type": "Product", "search_term": "iPhone"},
            {"type": "Event", "search_term": "Conference"}
        ]
        
        for test_case in test_cases:
            entity_type = test_case["type"]
            search_term = test_case["search_term"]
            
            print(f"\n🔍 Testing '{entity_type}' search with term '{search_term}'")
            
            try:
                search_results = search_nodes(
                    uri=uri,
                    username=username,
                    password=password,
                    database=database,
                    search_term=search_term,
                    node_type=entity_type,
                    max_results=3,
                    prefer_vector=True,
                    use_hybrid=True
                )
                
                print(f"   Results: {search_results['total_results']} found")
                if search_results['nodes']:
                    for i, node in enumerate(search_results['nodes'][:2]):
                        node_name = node.get('properties', {}).get('id', 'Unknown')
                        combined_score = node.get('combined_score', 'N/A')
                        print(f"     {i+1}. {node_name} (score: {combined_score})")
                        
            except Exception as e:
                print(f"   ⚠️  Search failed: {str(e)}")
        
        print("\n✅ Entity type testing completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_entity_types()
    sys.exit(0 if success else 1)
