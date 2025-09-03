#!/usr/bin/env python3
"""
Test script to check Neo4j entities and subgraph extraction
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.shared.common_fn import create_graph_database_connection

def test_neo4j_entities():
    """Test Neo4j connection and entity extraction"""
    
    print("🔍 Testing Neo4j Entity Extraction")
    print("=" * 50)
    
    # You'll need to provide actual connection details
    # These are placeholders - replace with your actual values
    uri = "neo4j+ssc://224c5da6.databases.neo4j.io:7687"  # From your logs
    username = "neo4j"  # From your logs
    password = "your_password_here"  # You need to provide this
    database = "neo4j"  # From your logs
    
    print(f"Connecting to: {uri}")
    print(f"Database: {database}")
    print(f"Username: {username}")
    
    try:
        # Test connection
        print("\n1️⃣ Testing Neo4j Connection...")
        graph = create_graph_database_connection(uri, username, password, database)
        print("✅ Neo4j connection successful")
        
        # Test basic query
        print("\n2️⃣ Testing Basic Query...")
        test_query = "MATCH (n) RETURN count(n) as total_nodes LIMIT 1"
        result = graph.query(test_query)
        print(f"Total nodes in database: {result[0]['total_nodes'] if result else 'Unknown'}")
        
        # Check what entity labels exist
        print("\n3️⃣ Checking Entity Labels...")
        labels_query = "CALL db.labels() YIELD label RETURN label ORDER BY label"
        labels_result = graph.query(labels_query)
        print("Available labels:")
        for row in labels_result:
            print(f"   - {row['label']}")
        
        # Check for entities with different possible labels
        print("\n4️⃣ Checking for Lori Greiner with different labels...")
        
        # Try __Entity__ label (from subgraph_monitor.py)
        entity_query = """
        MATCH (e:__Entity__ {id: 'Lori Greiner'})
        RETURN e.id as id, e.description as description, labels(e) as labels
        """
        entity_result = graph.query(entity_query)
        if entity_result:
            print("✅ Found Lori Greiner with __Entity__ label:")
            for row in entity_result:
                print(f"   - ID: {row['id']}, Description: {row['description']}, Labels: {row['labels']}")
        else:
            print("❌ Lori Greiner not found with __Entity__ label")
        
        # Try Entity label (without underscores)
        entity_query2 = """
        MATCH (e:Entity {id: 'Lori Greiner'})
        RETURN e.id as id, e.description as description, labels(e) as labels
        """
        entity_result2 = graph.query(entity_query2)
        if entity_result2:
            print("✅ Found Lori Greiner with Entity label:")
            for row in entity_result2:
                print(f"   - ID: {row['id']}, Description: {row['description']}, Labels: {row['labels']}")
        else:
            print("❌ Lori Greiner not found with Entity label")
        
        # Try searching by name property
        name_query = """
        MATCH (e)
        WHERE e.name = 'Lori Greiner' OR e.id = 'Lori Greiner'
        RETURN e.id as id, e.name as name, e.description as description, labels(e) as labels
        LIMIT 5
        """
        name_result = graph.query(name_query)
        if name_result:
            print("✅ Found entities with name/id 'Lori Greiner':")
            for row in name_result:
                print(f"   - ID: {row['id']}, Name: {row['name']}, Description: {row['description']}, Labels: {row['labels']}")
        else:
            print("❌ No entities found with name/id 'Lori Greiner'")
        
        # Check what entities exist
        print("\n5️⃣ Checking What Entities Exist...")
        entities_query = """
        MATCH (e)
        WHERE e.id IS NOT NULL OR e.name IS NOT NULL
        RETURN e.id as id, e.name as name, labels(e) as labels
        LIMIT 10
        """
        entities_result = graph.query(entities_query)
        print("Sample entities in database:")
        for row in entities_result:
            print(f"   - ID: {row['id']}, Name: {row['name']}, Labels: {row['labels']}")
        
        # Test subgraph extraction query
        print("\n6️⃣ Testing Subgraph Extraction Query...")
        if entity_result or entity_result2:
            # Use the label that worked
            working_label = "__Entity__" if entity_result else "Entity"
            subgraph_query = f"""
            MATCH (e:{working_label} {{id: 'Lori Greiner'}})
            OPTIONAL MATCH (e)-[r]-(related)
            WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
            RETURN 
                size(nodes) as node_count, 
                size(relationships) as relationship_count,
                e.id as entity_id,
                e.description as entity_description
            """
            
            subgraph_result = graph.query(subgraph_query)
            if subgraph_result:
                print("✅ Subgraph extraction successful:")
                for row in subgraph_result:
                    print(f"   - Nodes: {row['node_count']}, Relationships: {row['relationship_count']}")
                    print(f"   - Entity ID: {row['entity_id']}")
                    print(f"   - Description: {row['entity_description']}")
            else:
                print("❌ Subgraph extraction failed")
        else:
            print("❌ Cannot test subgraph extraction - entity not found")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("⚠️  Note: You need to provide your actual Neo4j password in this script")
    print("   Edit the script and replace 'your_password_here' with your actual password")
    print()
    
    # Uncomment the line below and add your password to test
    # test_neo4j_entities()
    
    print("To run this test:")
    print("1. Edit this script and add your Neo4j password")
    print("2. Uncomment the test_neo4j_entities() call")
    print("3. Run: python3 test_neo4j_entities.py")
