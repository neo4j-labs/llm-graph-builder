#!/usr/bin/env python3
"""
Debug URL Extraction in Risk Assessment

This script investigates why URLs aren't being extracted and displayed
in the risk assessment sources.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graph_query import search_and_get_subgraph
from src.shared.common_fn import create_graph_database_connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_url_extraction():
    """
    Debug URL extraction for Bill Gates risk assessment.
    """
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection details
    uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', 'password')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    try:
        print("🔍 DEBUGGING URL EXTRACTION")
        print("=" * 60)
        
        # Step 1: Get subgraph data
        print("📋 Step 1: Getting subgraph data for Bill Gates...")
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
        
        if 'error' in subgraph_data:
            print(f"❌ Error getting subgraph: {subgraph_data['error']}")
            return
        
        print(f"✅ Got subgraph with {len(subgraph_data.get('subgraphs', []))} subgraphs")
        
        # Step 2: Examine Document nodes
        print("\n📋 Step 2: Examining Document nodes...")
        documents = {}
        
        for subgraph in subgraph_data.get('subgraphs', []):
            for node in subgraph.get('nodes', []):
                if 'Document' in node.get('labels', []):
                    doc_id = node.get('id')
                    doc_props = node.get('properties', {})
                    
                    documents[doc_id] = {
                        'file_name': doc_props.get('fileName'),
                        'url': doc_props.get('url'),
                        'file_source': doc_props.get('fileSource'),
                        'source': doc_props.get('source'),
                        'source_url': doc_props.get('source_url')
                    }
                    
                    print(f"📄 Document: {doc_props.get('fileName', 'Unknown')}")
                    print(f"   ID: {doc_id}")
                    print(f"   URL: {doc_props.get('url', 'None')}")
                    print(f"   File Source: {doc_props.get('fileSource', 'None')}")
                    print(f"   Source: {doc_props.get('source', 'None')}")
                    print(f"   Source URL: {doc_props.get('source_url', 'None')}")
                    print()
        
        print(f"📊 Found {len(documents)} Document nodes")
        
        # Step 3: Examine Chunk nodes
        print("\n📋 Step 3: Examining Chunk nodes...")
        chunks = []
        
        for subgraph in subgraph_data.get('subgraphs', []):
            for node in subgraph.get('nodes', []):
                if 'Chunk' in node.get('labels', []):
                    chunk_props = node.get('properties', {})
                    
                    chunk_info = {
                        'id': chunk_props.get('id'),
                        'fileName': chunk_props.get('fileName'),
                        'url': chunk_props.get('url'),
                        'fileSource': chunk_props.get('fileSource'),
                        'text_length': len(chunk_props.get('text', '')),
                        'position': chunk_props.get('position')
                    }
                    
                    chunks.append(chunk_info)
                    
                    print(f"📝 Chunk: {chunk_props.get('id', 'Unknown')[:8]}...")
                    print(f"   File: {chunk_props.get('fileName', 'None')}")
                    print(f"   URL: {chunk_props.get('url', 'None')}")
                    print(f"   File Source: {chunk_props.get('fileSource', 'None')}")
                    print(f"   Text Length: {len(chunk_props.get('text', ''))}")
                    print()
        
        print(f"📊 Found {len(chunks)} Chunk nodes")
        
        # Step 4: Check for URLs in chunks
        print("\n📋 Step 4: URL Analysis...")
        chunks_with_urls = [c for c in chunks if c['url']]
        chunks_without_urls = [c for c in chunks if not c['url']]
        
        print(f"📊 Chunks with URLs: {len(chunks_with_urls)}")
        print(f"📊 Chunks without URLs: {len(chunks_without_urls)}")
        
        if chunks_with_urls:
            print("\n✅ Chunks with URLs found:")
            for chunk in chunks_with_urls:
                print(f"   Chunk {chunk['id'][:8]}... -> {chunk['url']}")
        else:
            print("\n❌ No chunks have URL properties")
            
            # Check if documents have URLs
            docs_with_urls = [d for d in documents.values() if d['url']]
            print(f"\n📊 Documents with URLs: {len(docs_with_urls)}")
            
            if docs_with_urls:
                print("✅ Documents with URLs found:")
                for doc_name, doc_info in documents.items():
                    if doc_info['url']:
                        print(f"   {doc_info['file_name']} -> {doc_info['url']}")
            else:
                print("❌ No documents have URL properties")
        
        # Step 5: Check database directly for URLs
        print("\n📋 Step 5: Direct database query for URLs...")
        
        from src.shared.common_fn import execute_graph_query
        
        # Query for all Document nodes with URLs
        doc_url_query = """
        MATCH (d:Document)
        WHERE d.url IS NOT NULL
        RETURN d.fileName as fileName, d.url as url, d.fileSource as fileSource
        LIMIT 10
        """
        
        doc_results = execute_graph_query(graph, doc_url_query)
        print(f"📊 Documents with URLs in database: {len(doc_results)}")
        
        for result in doc_results:
            print(f"   {result['fileName']} -> {result['url']} (Source: {result['fileSource']})")
        
        # Query for all Chunk nodes with URLs
        chunk_url_query = """
        MATCH (c:Chunk)
        WHERE c.url IS NOT NULL
        RETURN c.fileName as fileName, c.url as url, c.fileSource as fileSource
        LIMIT 10
        """
        
        chunk_results = execute_graph_query(graph, chunk_url_query)
        print(f"\n📊 Chunks with URLs in database: {len(chunk_results)}")
        
        for result in chunk_results:
            print(f"   {result['fileName']} -> {result['url']} (Source: {result['fileSource']})")
        
        # Query for all nodes with any URL-related property
        url_props_query = """
        MATCH (n)
        WHERE n.url IS NOT NULL OR n.source_url IS NOT NULL OR n.source IS NOT NULL
        RETURN labels(n) as labels, n.fileName as fileName, 
               n.url as url, n.source_url as source_url, n.source as source
        LIMIT 20
        """
        
        url_props_results = execute_graph_query(graph, url_props_query)
        print(f"\n📊 All nodes with URL-related properties: {len(url_props_results)}")
        
        for result in url_props_results:
            labels = result['labels']
            print(f"   {labels} - {result['fileName']}")
            print(f"      URL: {result['url']}")
            print(f"      Source URL: {result['source_url']}")
            print(f"      Source: {result['source']}")
            print()
        
        graph.close()
        
        # Summary
        print("\n📈 SUMMARY")
        print("=" * 60)
        
        if chunks_with_urls:
            print("✅ Chunks have URL properties - they should be used in risk assessment")
        elif docs_with_urls:
            print("⚠️  Documents have URLs but chunks don't - URL copying may not be working")
        else:
            print("❌ No URLs found in database - documents may not have URL properties")
        
    except Exception as e:
        logger.error(f"Error debugging URL extraction: {str(e)}")
        print(f"❌ Error: {str(e)}")
    finally:
        if 'graph' in locals():
            graph.close()

if __name__ == "__main__":
    debug_url_extraction()
