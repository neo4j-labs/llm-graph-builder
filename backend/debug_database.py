#!/usr/bin/env python3
"""
Debug script to check what's in the database
"""

import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def debug_database():
    """Check what documents exist in the database."""
    try:
        from src.shared.common_fn import create_graph_database_connection
        
        # You'll need to update these connection details
        uri = "neo4j+s://9379df68.databases.neo4j.io:7687"
        username = "neo4j"
        password = "your_password_here"  # Update this with your actual password
        database = "neo4j"
        
        print("🔍 Connecting to database...")
        graph = create_graph_database_connection(uri, username, password, database)
        
        # Check what documents exist
        print("\n📄 Checking for documents...")
        doc_query = """
        MATCH (d:Document)
        RETURN d.fileName AS filename, d.id AS id, d.size AS size, d.created_date AS created_date
        LIMIT 20
        """
        docs = graph.query(doc_query, {})
        print(f"Found {len(docs)} documents:")
        for doc in docs:
            print(f"  - {doc['filename']} (ID: {doc['id']}, Size: {doc['size']})")
        
        # Check for specific document
        target_doc = "Abiy_Ahmed"
        print(f"\n🎯 Looking for document: {target_doc}")
        
        specific_query = """
        MATCH (d:Document {fileName: $doc_name})
        OPTIONAL MATCH (c:DocumentChunk)-[:BELONGS_TO]->(d)
        RETURN d.fileName AS doc_name, count(c) AS chunk_count, d.id AS doc_id
        """
        result = graph.query(specific_query, {"doc_name": target_doc})
        
        if result:
            doc_info = result[0]
            print(f"✅ Document found: {doc_info['doc_name']}")
            print(f"   Chunks: {doc_info['chunk_count']}")
            print(f"   ID: {doc_info['doc_id']}")
            
            if doc_info['chunk_count'] == 0:
                print("⚠️  Document exists but has no chunks!")
                print("   This usually means the document was uploaded but never processed.")
                
                # Check if there are any chunks at all
                chunk_query = """
                MATCH (c:DocumentChunk)
                RETURN count(c) AS total_chunks
                """
                chunk_result = graph.query(chunk_query, {})
                print(f"   Total chunks in database: {chunk_result[0]['total_chunks']}")
        else:
            print(f"❌ Document '{target_doc}' not found")
            
            # Check for similar names
            similar_query = """
            MATCH (d:Document)
            WHERE d.fileName CONTAINS 'Abiy' OR d.fileName CONTAINS 'Ahmed'
            RETURN d.fileName AS filename
            LIMIT 10
            """
            similar = graph.query(similar_query, {})
            if similar:
                print("🔍 Similar document names found:")
                for sim in similar:
                    print(f"   - {sim['filename']}")
        
        # Check document status
        print(f"\n📊 Document Status Check:")
        status_query = """
        MATCH (d:Document {fileName: $doc_name})
        RETURN d.Status AS status, d.processingTime AS processing_time, d.total_chunks AS total_chunks
        """
        status_result = graph.query(status_query, {"doc_name": target_doc})
        if status_result:
            status_info = status_result[0]
            print(f"   Status: {status_info['status']}")
            print(f"   Processing Time: {status_info['processing_time']}")
            print(f"   Total Chunks Expected: {status_info['total_chunks']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Make sure to update the password in the script!")
        print("💡 Also check if you have the required dependencies installed")

if __name__ == "__main__":
    debug_database()
