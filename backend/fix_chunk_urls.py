#!/usr/bin/env python3
"""
Fix Chunk URLs - Copy URL Properties from Documents to Chunks

This script updates all Chunk nodes to copy URL and fileSource properties
from their parent Document nodes, enabling proper URL citations in risk assessment.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.shared.common_fn import create_graph_database_connection, execute_graph_query

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_chunk_urls():
    """
    Copy URL properties from Document nodes to their associated Chunk nodes.
    """
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection details
    uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', 'password')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    try:
        print("🔧 FIXING CHUNK URLS - COPYING FROM DOCUMENTS")
        print("=" * 60)
        
        # Connect to database
        graph = create_graph_database_connection(uri, username, password, database)
        
        # Step 1: Check current state
        print("\n📋 Step 1: Checking current state")
        
        # Count documents with URLs
        doc_url_query = """
        MATCH (d:Document)
        WHERE d.url IS NOT NULL
        RETURN count(d) as docs_with_urls
        """
        doc_result = execute_graph_query(graph, doc_url_query)
        docs_with_urls = doc_result[0]['docs_with_urls'] if doc_result else 0
        
        # Count chunks with URLs
        chunk_url_query = """
        MATCH (c:Chunk)
        WHERE c.url IS NOT NULL
        RETURN count(c) as chunks_with_urls
        """
        chunk_result = execute_graph_query(graph, chunk_url_query)
        chunks_with_urls = chunk_result[0]['chunks_with_urls'] if chunk_result else 0
        
        # Count total chunks
        total_chunks_query = """
        MATCH (c:Chunk)
        RETURN count(c) as total_chunks
        """
        total_result = execute_graph_query(graph, total_chunks_query)
        total_chunks = total_result[0]['total_chunks'] if total_result else 0
        
        print(f"📊 Documents with URLs: {docs_with_urls}")
        print(f"📊 Chunks with URLs: {chunks_with_urls}")
        print(f"📊 Total chunks: {total_chunks}")
        
        # Step 2: Show documents with URLs
        print("\n📋 Step 2: Documents with URLs")
        doc_details_query = """
        MATCH (d:Document)
        WHERE d.url IS NOT NULL
        RETURN d.fileName as fileName, d.url as url, d.fileSource as fileSource
        LIMIT 10
        """
        doc_details = execute_graph_query(graph, doc_details_query)
        
        for doc in doc_details:
            print(f"   📄 {doc['fileName']}")
            print(f"      URL: {doc['url']}")
            print(f"      Source: {doc['fileSource']}")
        
        # Step 3: Find chunks that need URL properties
        print("\n📋 Step 3: Finding chunks that need URL properties")
        chunks_needing_urls_query = """
        MATCH (c:Chunk)-[:PART_OF]->(d:Document)
        WHERE c.url IS NULL AND d.url IS NOT NULL
        RETURN count(c) as chunks_needing_urls
        """
        chunks_needing_result = execute_graph_query(graph, chunks_needing_urls_query)
        chunks_needing_urls = chunks_needing_result[0]['chunks_needing_urls'] if chunks_needing_result else 0
        
        print(f"📊 Chunks needing URL properties: {chunks_needing_urls}")
        
        if chunks_needing_urls == 0:
            print("✅ All chunks already have URL properties!")
            return
        
        # Step 4: Update chunks with URL properties
        print("\n📋 Step 4: Updating chunks with URL properties")
        update_query = """
        MATCH (c:Chunk)-[:PART_OF]->(d:Document)
        WHERE c.url IS NULL AND d.url IS NOT NULL
        SET c.url = d.url, c.fileSource = d.fileSource
        RETURN count(c) as updated_count
        """
        
        update_result = execute_graph_query(graph, update_query)
        updated_count = update_result[0]['updated_count'] if update_result else 0
        print(f"📊 Successfully updated {updated_count} chunks with URL properties")
        
        # Step 5: Verify the fix
        print("\n📋 Step 5: Verifying the fix")
        
        # Check updated chunks
        verify_query = """
        MATCH (c:Chunk)
        WHERE c.url IS NOT NULL
        RETURN c.fileName as fileName, c.url as url, c.fileSource as fileSource
        LIMIT 5
        """
        verify_results = execute_graph_query(graph, verify_query)
        
        print(f"📊 Chunks with URLs after fix: {len(verify_results)}")
        for result in verify_results:
            print(f"   📝 {result['fileName']} -> {result['url']} (Source: {result['fileSource']})")
        
        # Step 6: Check Bill Gates chunks specifically
        print("\n📋 Step 6: Bill Gates chunks after fix")
        bill_gates_query = """
        MATCH (c:Chunk)
        WHERE c.fileName = 'Bill_Gates' AND c.url IS NOT NULL
        RETURN c.fileName as fileName, c.url as url, c.fileSource as fileSource
        LIMIT 3
        """
        bill_gates_results = execute_graph_query(graph, bill_gates_query)
        
        print(f"📊 Bill Gates chunks with URLs: {len(bill_gates_results)}")
        for result in bill_gates_results:
            print(f"   📝 {result['fileName']} -> {result['url']} (Source: {result['fileSource']})")
        
        # Step 7: Final statistics
        print("\n📋 Step 7: Final statistics")
        final_stats_query = """
        MATCH (c:Chunk)
        RETURN 
            count(c) as total_chunks,
            count(CASE WHEN c.url IS NOT NULL THEN c END) as chunks_with_urls,
            count(CASE WHEN c.url IS NULL THEN c END) as chunks_without_urls
        """
        final_stats = execute_graph_query(graph, final_stats_query)
        
        if final_stats:
            stats = final_stats[0]
            print(f"📊 Total chunks: {stats['total_chunks']}")
            print(f"📊 Chunks with URLs: {stats['chunks_with_urls']}")
            print(f"📊 Chunks without URLs: {stats['chunks_without_urls']}")
            
            if stats['total_chunks'] > 0:
                coverage = (stats['chunks_with_urls'] / stats['total_chunks']) * 100
                print(f"📊 URL coverage: {coverage:.1f}%")
        
        graph.close()
        
        # Summary
        print("\n📈 SUMMARY")
        print("=" * 60)
        
        if updated_count > 0:
            print(f"✅ Successfully updated {updated_count} chunks with URL properties")
            print("✅ Risk assessment should now show actual URLs instead of 'Chunk X'")
            print("✅ Example: 'https://en.wikipedia.org/wiki/Bill_Gates' instead of 'Chunk 7'")
        else:
            print("ℹ️  No chunks needed updating - they already have URL properties")
        
        print("\n🚀 Next Steps:")
        print("   1. Run a risk assessment to see the improved URL citations")
        print("   2. Check that sources now show actual URLs")
        print("   3. Verify that 'Chunk X' references are replaced with document URLs")
        
    except Exception as e:
        logger.error(f"Error fixing chunk URLs: {str(e)}")
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    fix_chunk_urls()
