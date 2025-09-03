#!/usr/bin/env python3
"""
Test URL Copying to Chunk Nodes

This script tests whether URLs are now being properly copied from Document nodes
to Chunk nodes during the chunk creation process.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.graphDB_dataAccess import graphDBdataAccess
from src.shared.common_fn import create_graph_database_connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_url_copying():
    """
    Test whether URLs are being copied to chunk nodes.
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
        graph_db_access = graphDBdataAccess(graph)
        
        print("🔍 TESTING URL COPYING TO CHUNK NODES")
        print("=" * 60)
        
        # Test 1: Check Document nodes with URLs
        print("\n📋 TEST 1: Document Nodes with URLs")
        print("-" * 40)
        
        doc_query = """
        MATCH (d:Document)
        WHERE d.url IS NOT NULL
        RETURN d.fileName as fileName, d.url as url, d.fileSource as source
        LIMIT 5
        """
        
        doc_results = graph.query(doc_query)
        if doc_results:
            print("✅ Found Document nodes with URLs:")
            for record in doc_results:
                print(f"   📄 {record['fileName']}")
                print(f"      URL: {record['url']}")
                print(f"      Source: {record['source']}")
                print()
        else:
            print("❌ No Document nodes with URLs found")
        
        # Test 2: Check Chunk nodes with URLs
        print("\n📋 TEST 2: Chunk Nodes with URLs")
        print("-" * 40)
        
        chunk_query = """
        MATCH (c:Chunk)
        WHERE c.url IS NOT NULL
        RETURN c.fileName as fileName, c.url as url, c.fileSource as source, c.position as position
        LIMIT 10
        """
        
        chunk_results = graph.query(chunk_query)
        if chunk_results:
            print("✅ Found Chunk nodes with URLs:")
            for record in chunk_results:
                print(f"   📄 {record['fileName']} (Position: {record['position']})")
                print(f"      URL: {record['url']}")
                print(f"      Source: {record['source']}")
                print()
        else:
            print("❌ No Chunk nodes with URLs found")
            print("   This means the URL copying fix hasn't been applied to existing data")
        
        # Test 3: Check Document-Chunk relationships
        print("\n📋 TEST 3: Document-Chunk Relationships")
        print("-" * 40)
        
        rel_query = """
        MATCH (c:Chunk)-[:PART_OF]->(d:Document)
        WHERE d.url IS NOT NULL
        RETURN d.fileName as docName, d.url as docUrl, 
               c.fileName as chunkName, c.url as chunkUrl,
               c.fileSource as chunkSource
        LIMIT 5
        """
        
        rel_results = graph.query(rel_query)
        if rel_results:
            print("✅ Document-Chunk relationships:")
            for record in rel_results:
                print(f"   📄 Document: {record['docName']}")
                print(f"      Doc URL: {record['docUrl']}")
                print(f"      Chunk: {record['chunkName']}")
                print(f"      Chunk URL: {record['chunkUrl']}")
                print(f"      Chunk Source: {record['chunkSource']}")
                print()
        else:
            print("❌ No Document-Chunk relationships found")
        
        # Test 4: Check for chunks without URLs
        print("\n📋 TEST 4: Chunks Without URLs")
        print("-" * 40)
        
        no_url_query = """
        MATCH (c:Chunk)
        WHERE c.url IS NULL
        RETURN c.fileName as fileName, c.fileSource as source, c.position as position
        LIMIT 5
        """
        
        no_url_results = graph.query(no_url_query)
        if no_url_results:
            print("⚠️  Found Chunk nodes WITHOUT URLs:")
            for record in no_url_results:
                print(f"   📄 {record['fileName']} (Position: {record['position']})")
                print(f"      Source: {record['source']}")
                print()
            print("   These are likely from before the URL copying fix")
        else:
            print("✅ All Chunk nodes have URLs!")
        
        # Test 5: Check local file references
        print("\n📋 TEST 5: Local File References")
        print("-" * 40)
        
        local_query = """
        MATCH (c:Chunk)
        WHERE c.url STARTS WITH 'local://'
        RETURN c.fileName as fileName, c.url as url, c.fileSource as source
        LIMIT 5
        """
        
        local_results = graph.query(local_query)
        if local_results:
            print("✅ Found local file references:")
            for record in local_results:
                print(f"   📄 {record['fileName']}")
                print(f"      URL: {record['url']}")
                print(f"      Source: {record['source']}")
                print()
        else:
            print("ℹ️  No local file references found")
        
        # Summary
        print("\n📊 SUMMARY")
        print("=" * 60)
        
        # Count documents with URLs
        doc_count_query = "MATCH (d:Document) WHERE d.url IS NOT NULL RETURN count(d) as count"
        doc_count = graph.query(doc_count_query)[0]['count']
        
        # Count chunks with URLs
        chunk_count_query = "MATCH (c:Chunk) WHERE c.url IS NOT NULL RETURN count(c) as count"
        chunk_count = graph.query(chunk_count_query)[0]['count']
        
        # Count total chunks
        total_chunks_query = "MATCH (c:Chunk) RETURN count(c) as count"
        total_chunks = graph.query(total_chunks_query)[0]['count']
        
        print(f"📄 Documents with URLs: {doc_count}")
        print(f"📄 Chunks with URLs: {chunk_count}/{total_chunks} ({chunk_count/total_chunks*100:.1f}%)")
        
        if chunk_count > 0:
            print("✅ URL copying is working for new chunks!")
        else:
            print("❌ URL copying not working - check the implementation")
        
        if chunk_count < total_chunks:
            print("ℹ️  Some chunks don't have URLs (likely from before the fix)")
        
    except Exception as e:
        logger.error(f"Error testing URL copying: {str(e)}")
        print(f"❌ Error: {str(e)}")
    finally:
        if 'graph' in locals():
            graph.close()

if __name__ == "__main__":
    test_url_copying()
