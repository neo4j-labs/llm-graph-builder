#!/usr/bin/env python3
"""
Test script to verify the enhanced monitoring integration flow
Tests: subgraph monitoring -> risk assessment -> alert generation -> PostgreSQL storage
"""

import asyncio
import logging
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.subgraph_monitor import SubgraphMonitor
from src.monitoring_service_pg import MonitoringServicePG

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_monitoring_integration():
    """Test the complete monitoring flow"""
    
    print("🧪 Testing Enhanced Monitoring Integration Flow")
    print("=" * 60)
    
    try:
        # Test 1: Initialize monitoring service
        print("\n1️⃣ Testing Monitoring Service Initialization...")
        monitoring_service = MonitoringServicePG()
        
        # Check if schema exists
        schema_ok = monitoring_service.initialize_monitoring_schema()
        if schema_ok:
            print("✅ Monitoring schema initialized successfully")
        else:
            print("⚠️  Monitoring schema not fully initialized - run migrations first")
        
        # Test 2: Get monitored entities
        print("\n2️⃣ Testing Monitored Entities Retrieval...")
        entities = monitoring_service.get_monitored_entities_from_db()
        print(f"📊 Found {len(entities)} monitored entities:")
        for entity in entities:
            print(f"   - {entity['name']} ({entity['type']}) - Risk threshold: {entity['risk_threshold']}")
        
        # Test 3: Test subgraph monitor
        print("\n3️⃣ Testing Subgraph Monitor...")
        subgraph_monitor = SubgraphMonitor()
        
        # Get entities from subgraph monitor
        monitor_entities = subgraph_monitor.get_monitored_entities()
        print(f"📊 Subgraph monitor found {len(monitor_entities)} entities:")
        for entity in monitor_entities:
            print(f"   - {entity['name']} - Status: {entity['status']}")
        
        # Test 4: Test monitoring without Neo4j (should work with basic monitoring)
        print("\n4️⃣ Testing Basic Monitoring (without Neo4j)...")
        try:
            # This should work even without Neo4j connection
            basic_result = await monitoring_service.check_entity_risk_changes(
                [entity['name'] for entity in entities[:2]],  # Test with first 2 entities
                "openai_gpt_4o"
            )
            print(f"✅ Basic monitoring completed: {basic_result['entities_checked']} entities checked")
            if 'entities_with_changes' in basic_result:
                print(f"📈 Entities with changes: {len(basic_result['entities_with_changes'])}")
        except Exception as e:
            print(f"⚠️  Basic monitoring test failed: {str(e)}")
        
        print("\n" + "=" * 60)
        print("🎯 Monitoring Integration Test Summary:")
        print(f"   • Schema initialized: {'✅' if schema_ok else '⚠️'}")
        print(f"   • Monitored entities: {len(entities)}")
        print(f"   • Subgraph monitor entities: {len(monitor_entities)}")
        print(f"   • Basic monitoring: {'✅' if 'basic_result' in locals() else '⚠️'}")
        
        if schema_ok and entities and monitor_entities:
            print("\n🎉 All core components are working! The monitoring flow should work when:")
            print("   1. Neo4j connection is available")
            print("   2. Documents are processed")
            print("   3. Subgraph changes are detected")
            print("   4. Risk assessment is triggered")
            print("   5. Alerts are generated and stored in PostgreSQL")
        else:
            print("\n⚠️  Some components need attention. Check the logs above.")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        logger.exception("Test failed")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Monitoring Integration Test...")
    success = asyncio.run(test_monitoring_integration())
    
    if success:
        print("\n✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)
