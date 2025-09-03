#!/usr/bin/env python3
"""
Diagnostic script to examine chunk extraction and source information.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.risk_assessment import extract_chunks_from_subgraph, analyze_risk
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_chunk_diagnosis():
    """Diagnose chunk extraction and source information."""
    
    # Connection parameters - you'll need to set your password
    uri = "neo4j+ssc://224c5da6.databases.neo4j.io"
    username = "neo4j"
    password = ""  # Add your password here
    database = "neo4j"
    
    if not password:
        print("❌ Please set the password in the script")
        return
    
    print("🔍 Diagnosing chunk extraction and source information...")
    
    try:
        # Test the full risk assessment to see what chunks are extracted
        risk_indicators = {
            "Foreign State Influence": 80,
            "Dual-Use Technology Exposure": 70,
            "Compliance with Canadian Research Security Policies": 60,
            "International Collaboration Patterns": 50,
            "Funding Sources Transparency": 40
        }
        
        print("\n📋 Running full risk assessment for Bill Gates...")
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
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return
        
        print(f"\n✅ Risk assessment completed")
        print(f"📊 Analysis metadata:")
        metadata = result.get('analysis_metadata', {})
        for key, value in metadata.items():
            print(f"   {key}: {value}")
        
        # Save the full result for analysis
        with open('chunk_diagnosis_result.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        
        print(f"\n💾 Full result saved to: chunk_diagnosis_result.json")
        
        # Analyze the risk assessments to see source patterns
        print(f"\n📋 Analyzing source patterns in risk assessments:")
        risk_assessments = result.get('riskAssessments', [])
        
        for assessment in risk_assessments:
            indicator = assessment.get('indicator', 'Unknown')
            sources = assessment.get('sources', [])
            explanation = assessment.get('explanation', '')
            
            print(f"\n  {indicator}:")
            print(f"    Sources: {sources}")
            print(f"    Explanation preview: {explanation[:100]}...")
            
            # Check if sources are "nil" and why
            if sources == ["nil"]:
                print(f"    ⚠️  No sources found - this indicates no evidence in chunks")
            elif "Chunk" in str(sources):
                print(f"    ✅ Chunk references found - chunks are being used")
            elif any(source.startswith(('http://', 'https://', 'Document:')) for source in sources):
                print(f"    ✅ Actual sources found - URLs or document names present")
        
        # Test chunk extraction separately
        print(f"\n🔧 Testing chunk extraction separately...")
        from src.graph_query import search_and_get_subgraph
        
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
        
        chunks = extract_chunks_from_subgraph(subgraph_data)
        
        print(f"\n📝 Extracted {len(chunks)} chunks:")
        for i, chunk in enumerate(chunks):
            print(f"\n  Chunk {i+1}:")
            print(f"    ID: {chunk['chunk_id']}")
            print(f"    Document: {chunk['document_name'] or chunk['document_id']}")
            print(f"    Source: {chunk['source']}")
            print(f"    Text length: {len(chunk['text'])} characters")
            print(f"    Text preview: {chunk['text'][:100]}...")
            
            # Check source quality
            if chunk['source'].startswith('http'):
                print(f"    ✅ Has URL source")
            elif chunk['source'].startswith('Document:'):
                print(f"    ✅ Has document source")
            elif chunk['source'].startswith('Chunk'):
                print(f"    ⚠️  Generic chunk reference")
            else:
                print(f"    ❓ Unknown source format")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        logging.exception("Error in chunk diagnosis")

if __name__ == "__main__":
    test_chunk_diagnosis()
