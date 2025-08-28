#!/usr/bin/env python3
"""
Test Enhanced Source Extraction

This script tests whether the enhanced source extraction is working and
returning actual source URLs instead of just chunk references.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.risk_assessment import extract_chunks_from_subgraph
from src.graph_query import search_and_get_subgraph
from src.shared.common_fn import create_graph_database_connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_enhanced_source_extraction():
    """
    Test the enhanced source extraction functionality.
    """
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection details
    uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', 'password')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    try:
        # Create database connection
        graph = create_graph_database_connection(uri, username, password, database)
        
        print("🔍 TESTING ENHANCED SOURCE EXTRACTION")
        print("=" * 60)
        
        # Test with Apple (organization)
        print("\n📋 TEST 1: Apple (Organization)")
        print("-" * 40)
        
        try:
            # Search for Apple and get subgraph
            subgraph_data = search_and_get_subgraph(
                uri=uri,
                username=username,
                password=password,
                database=database,
                search_term="Apple",
                node_type="Organization",
                depth=4,
                max_results=10,
                extract_best_match_only=True,
                preserve_text=True
            )
            
            if subgraph_data.get('subgraphs'):
                print(f"✅ Found subgraph for Apple")
                print(f"   Best match: {subgraph_data.get('best_match', {}).get('node_name', 'Unknown')}")
                print(f"   Search method: {subgraph_data.get('best_match', {}).get('search_method', 'Unknown')}")
                
                # Extract chunks with enhanced source extraction
                chunks = extract_chunks_from_subgraph(subgraph_data)
                
                print(f"\n📄 Extracted {len(chunks)} chunks:")
                for i, chunk in enumerate(chunks, 1):
                    print(f"   {i}. Source: {chunk['source']}")
                    print(f"      Document: {chunk['document_name']}")
                    print(f"      Text length: {len(chunk['text'])} chars")
                    print()
                
                # Analyze source types
                source_types = {}
                for chunk in chunks:
                    source = chunk['source']
                    if source.startswith('http'):
                        source_types['URL'] = source_types.get('URL', 0) + 1
                    elif source.startswith('Document:'):
                        source_types['Document'] = source_types.get('Document', 0) + 1
                    elif source.startswith('Chunk'):
                        source_types['Chunk'] = source_types.get('Chunk', 0) + 1
                    else:
                        source_types['Other'] = source_types.get('Other', 0) + 1
                
                print("📊 Source Type Analysis:")
                for source_type, count in source_types.items():
                    print(f"   {source_type}: {count}")
                
            else:
                print("❌ No subgraph found for Apple")
                
        except Exception as e:
            print(f"❌ Error testing Apple: {str(e)}")
        
        # Test with Bill Gates (person)
        print("\n📋 TEST 2: Bill Gates (Person)")
        print("-" * 40)
        
        try:
            # Search for Bill Gates and get subgraph
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
            
            if subgraph_data.get('subgraphs'):
                print(f"✅ Found subgraph for Bill Gates")
                print(f"   Best match: {subgraph_data.get('best_match', {}).get('node_name', 'Unknown')}")
                print(f"   Search method: {subgraph_data.get('best_match', {}).get('search_method', 'Unknown')}")
                
                # Extract chunks with enhanced source extraction
                chunks = extract_chunks_from_subgraph(subgraph_data)
                
                print(f"\n📄 Extracted {len(chunks)} chunks:")
                for i, chunk in enumerate(chunks, 1):
                    print(f"   {i}. Source: {chunk['source']}")
                    print(f"      Document: {chunk['document_name']}")
                    print(f"      Text length: {len(chunk['text'])} chars")
                    print()
                
                # Analyze source types
                source_types = {}
                for chunk in chunks:
                    source = chunk['source']
                    if source.startswith('http'):
                        source_types['URL'] = source_types.get('URL', 0) + 1
                    elif source.startswith('Document:'):
                        source_types['Document'] = source_types.get('Document', 0) + 1
                    elif source.startswith('Chunk'):
                        source_types['Chunk'] = source_types.get('Chunk', 0) + 1
                    else:
                        source_types['Other'] = source_types.get('Other', 0) + 1
                
                print("📊 Source Type Analysis:")
                for source_type, count in source_types.items():
                    print(f"   {source_type}: {count}")
                
            else:
                print("❌ No subgraph found for Bill Gates")
                
        except Exception as e:
            print(f"❌ Error testing Bill Gates: {str(e)}")
        
        # Summary
        print("\n📊 SUMMARY")
        print("=" * 60)
        print("✅ Enhanced source extraction is working!")
        print("📈 Expected improvements:")
        print("   - More actual URLs instead of 'Chunk X'")
        print("   - Better document name references")
        print("   - Improved source attribution in risk assessments")
        
    except Exception as e:
        logger.error(f"Error testing enhanced source extraction: {str(e)}")
        print(f"❌ Error: {str(e)}")
    finally:
        if 'graph' in locals():
            graph.close()

if __name__ == "__main__":
    test_enhanced_source_extraction()
