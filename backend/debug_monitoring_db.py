#!/usr/bin/env python3
"""
Debug script to check monitoring database state
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.monitoring_service_pg import MonitoringServicePG
from src.database import DatabaseManager

def debug_monitoring_db():
    """Debug the monitoring database state"""
    
    print("🔍 Debugging Monitoring Database State")
    print("=" * 50)
    
    try:
        # Initialize monitoring service
        monitoring_service = MonitoringServicePG()
        
        # Check schema
        print("\n1️⃣ Checking Monitoring Schema...")
        schema_ok = monitoring_service.initialize_monitoring_schema()
        print(f"Schema initialized: {schema_ok}")
        
        # Get monitored entities
        print("\n2️⃣ Monitored Entities in PostgreSQL...")
        entities = monitoring_service.get_monitored_entities_from_db()
        print(f"Found {len(entities)} monitored entities:")
        for entity in entities:
            print(f"   - ID: {entity['id']}, Name: {entity['name']}, Type: {entity['type']}, Status: {entity['status']}")
            print(f"     Risk Threshold: {entity['risk_threshold']}, Category: {entity['category']}")
        
        # Check if Lori Greiner exists
        print("\n3️⃣ Checking for Lori Greiner...")
        lori_entity = None
        for entity in entities:
            if "Lori" in entity['name'] or "Greiner" in entity['name']:
                lori_entity = entity
                break
        
        if lori_entity:
            print(f"✅ Found Lori Greiner: {lori_entity}")
        else:
            print("❌ Lori Greiner not found in monitored entities")
        
        # Check alerts
        print("\n4️⃣ Current Alerts...")
        alerts = monitoring_service.get_monitoring_alerts()
        print(f"Found {len(alerts)} alerts:")
        for alert in alerts:
            print(f"   - {alert['entity_name']}: {alert['message']} ({alert['severity']})")
        
        # Check risk assessments
        print("\n5️⃣ Risk Assessments...")
        if lori_entity:
            risk_assessment = monitoring_service.get_latest_risk_assessment(lori_entity['id'])
            if risk_assessment:
                print(f"Latest risk assessment for Lori: {risk_assessment}")
            else:
                print("No risk assessment found for Lori")
        
        # Check database directly
        print("\n6️⃣ Direct Database Query...")
        db = DatabaseManager()
        
        # Check monitored_entities table
        entities_result = db.execute_query("SELECT * FROM monitored_entities ORDER BY name")
        print(f"Monitored entities table has {len(entities_result)} rows:")
        for row in entities_result:
            print(f"   - {row}")
        
        # Check if there are any entities in Neo4j
        print("\n7️⃣ Checking Neo4j Connection...")
        try:
            from src.shared.common_fn import create_graph_database_connection
            
            # You'll need to provide actual connection details
            print("Note: To check Neo4j, you need to provide connection details")
            print("This would check if Lori Greiner exists as an entity in the graph")
            
        except Exception as e:
            print(f"Error checking Neo4j: {e}")
        
        print("\n" + "=" * 50)
        print("🎯 Debug Summary:")
        print(f"   • Monitored entities: {len(entities)}")
        print(f"   • Alerts: {len(alerts)}")
        print(f"   • Lori Greiner found: {'✅' if lori_entity else '❌'}")
        
        if lori_entity:
            print(f"   • Lori entity ID: {lori_entity['id']}")
            print(f"   • Lori status: {lori_entity['status']}")
        
    except Exception as e:
        print(f"\n❌ Debug failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_monitoring_db()
