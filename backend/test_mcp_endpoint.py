#!/usr/bin/env python3
"""
Test script for the MCP API endpoint
"""

import requests
import json
import time

def test_mcp_endpoint():
    """Test the MCP chart generation endpoint"""
    
    # Test data
    test_data = {
        'query': 'Show me all documents in the database',
        'chart_type': 'bar',
        'uri': 'neo4j+s://9379df68.databases.neo4j.io:7687',
        'userName': 'neo4j',
        'password': '_18dKuxBBytBxPuKZP5snPvXelfYs7uQKWcA_A9HUHU',  # Replace with actual password
        'database': 'neo4j',
        'openai_api_key': 'your-openai-api-key-here',  # Replace with actual API key
        'model': 'gpt-4'
    }
    
    # Backend URL
    backend_url = "http://localhost:8000/mcp/generate_chart"
    
    print("🧪 Testing MCP Chart Generation Endpoint")
    print("=" * 50)
    
    try:
        print(f"📡 Sending request to: {backend_url}")
        print(f"📝 Query: {test_data['query']}")
        print(f"📊 Chart Type: {test_data['chart_type']}")
        
        # Send POST request
        response = requests.post(backend_url, data=test_data, timeout=60)
        
        print(f"📈 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Request successful!")
            print(f"📋 Response: {json.dumps(result, indent=2)}")
            
            if result.get('status') == 'Success':
                print("🎉 Chart generated successfully!")
                if 'data' in result:
                    chart_data = result['data']
                    print(f"📊 Chart Type: {chart_data.get('metadata', {}).get('chart_type', 'Unknown')}")
                    print(f"⏱️ Processing Time: {chart_data.get('metadata', {}).get('processing_time', 'Unknown')}s")
                    print(f"🔍 Cypher Query: {chart_data.get('metadata', {}).get('cypher_query', 'Unknown')}")
            else:
                print(f"❌ Chart generation failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_stop_server():
    """Test the MCP server stop endpoint"""
    
    backend_url = "http://localhost:8000/mcp/stop_server"
    
    print("\n🛑 Testing MCP Server Stop Endpoint")
    print("=" * 50)
    
    try:
        response = requests.post(backend_url, timeout=10)
        print(f"📈 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Request successful!")
            print(f"📋 Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("🚀 MCP Endpoint Test Suite")
    print("=" * 60)
    
    # Test chart generation
    test_mcp_endpoint()
    
    # Wait a bit
    time.sleep(2)
    
    # Test server stop
    test_stop_server()
    
    print("\n✅ Test suite completed!")
