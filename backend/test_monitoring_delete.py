#!/usr/bin/env python3
"""
Test script to debug monitoring delete functionality
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.monitoring_service import MonitoringService
from src.shared.common_fn import create_graph_database_connection

async def test_monitoring_delete():
    """Test the monitoring delete functionality"""
    
    # Connect to Neo4j using environment variables
    uri = os.getenv("NEO4J_URI", "neo4j+ssc://224c5da6.databases.neo4j.io")
    userName = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "_18dKuxBBytBxPuKZP5snPvXelfYs7uQKWcA_A9HUHU")
    database = os.getenv("NEO4J_DATABASE", "neo4j")
    
    print(f"Connecting to Neo4j: {uri}")
    print(f"Username: {userName}")
    print(f"Database: {database}")
    graph = create_graph_database_connection(uri, userName, password, database)
    
    # Create monitoring service
    monitoring_service = MonitoringService(graph)
    
    print("=== Testing Monitoring Delete Functionality ===")
    
    # 1. Check what entities exist
    print("\n1. Current monitored entities:")
    entities = monitoring_service.get_monitored_entities_from_db()
    for entity in entities:
        print(f"  - ID: {entity['id']}, Name: {entity['name']}, Type: {entity['type']}")
    
    # 2. Try to delete a specific entity (if any exist)
    if entities:
        test_entity_id = entities[0]['id']
        print(f"\n2. Attempting to delete entity: {test_entity_id}")
        
        success = await monitoring_service.remove_monitored_entity(test_entity_id)
        print(f"   Delete result: {success}")
        
        # 3. Check if entity was actually deleted
        print("\n3. Entities after deletion:")
        remaining_entities = await monitoring_service.get_monitored_entities_from_db()
        for entity in remaining_entities:
            print(f"  - ID: {entity['id']}, Name: {entity['name']}, Type: {entity['type']}")
    else:
        print("\n2. No entities to test deletion with")
    
    # 4. Test with a non-existent ID
    print("\n4. Testing deletion with non-existent ID:")
    fake_id = "fake_entity_123"
    success = await monitoring_service.remove_monitored_entity(fake_id)
    print(f"   Delete result for fake ID: {success}")

if __name__ == "__main__":
    asyncio.run(test_monitoring_delete())
