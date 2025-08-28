#!/usr/bin/env python3
"""
Test script to verify search method is properly captured.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.graph_query import search_and_get_subgraph
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_search_method():
    """Test that search method is properly captured."""
    
    # Connection parameters
    uri = "neo4j+ssc://224c5da6.databases.neo4j.io"
    username = "neo4j"
    password = ""  # Add your password here
    database = "neo4j"
    
    if not password:
        print("❌ Please set the password in the script")
        return
    
    print("🔍 Testing search method capture...")
    
    try:
        # Test search and subgraph extraction
        subgraph_data = search_and_get_subgraph(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term="Bill Gates",
            node_type="Person",
            depth=4,
            max_results=10,
            extract_best_match_only=True,
            preserve_text=True
        )
        
        print(f"\n📊 Search results:")
        print(f"  Total results: {subgraph_data.get('total_results', 0)}")
        
        # Check best match information
        best_match = subgraph_data.get('best_match', {})
        print(f"\n🏆 Best match:")
        print(f"  Node name: {best_match.get('node_name', 'Unknown')}")
        print(f"  Score: {best_match.get('score', 'N/A')}")
        print(f"  Search method: {best_match.get('search_method', 'unknown')}")
        print(f"  Element ID: {best_match.get('element_id', 'Unknown')}")
        
        # Check all matches
        all_matches = subgraph_data.get('all_matches', [])
        print(f"\n📋 All matches ({len(all_matches)}):")
        for i, match in enumerate(all_matches[:3]):  # Show first 3
            print(f"  {i+1}. {match.get('node_name', 'Unknown')}")
            print(f"     Score: {match.get('score', 'N/A')}")
            print(f"     Search method: {match.get('search_method', 'unknown')}")
        
        # Test the risk assessment metadata
        print(f"\n🔧 Testing risk assessment metadata...")
        from src.risk_assessment import analyze_risk
        
        risk_indicators = {
            "Foreign State Influence": 80,
            "Dual-Use Technology Exposure": 70
        }
        
        result = analyze_risk(
            uri=uri,
            username=username,
            password=password,
            database=database,
            entity_name="Bill Gates",
            entity_type="Person",
            risk_indicators=risk_indicators,
            depth=4,
            max_results=10
        )
        
        if 'error' not in result:
            metadata = result.get('analysis_metadata', {})
            print(f"\n✅ Risk assessment metadata:")
            print(f"  Search method: {metadata.get('search_method', 'unknown')}")
            print(f"  Best match score: {metadata.get('best_match_score', 'N/A')}")
            print(f"  Chunks analyzed: {metadata.get('chunks_analyzed', 0)}")
            print(f"  Subgraph nodes: {metadata.get('subgraph_nodes', 0)}")
            
            if metadata.get('search_method') != 'unknown':
                print(f"  ✅ Search method is now properly captured!")
            else:
                print(f"  ⚠️  Search method still shows as 'unknown'")
        else:
            print(f"❌ Error in risk assessment: {result['error']}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        logging.exception("Error in search method test")

if __name__ == "__main__":
    test_search_method()
