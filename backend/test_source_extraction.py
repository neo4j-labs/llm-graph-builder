#!/usr/bin/env python3
"""
Test script to examine source information in chunks and documents.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.graph_query import search_and_get_subgraph
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_source_extraction():
    """Test source extraction from the database."""
    
    # Connection parameters
    uri = "neo4j+ssc://224c5da6.databases.neo4j.io"
    username = "neo4j"
    password = ""  # Add your password here
    database = "neo4j"
    
    print("🔍 Testing source extraction from database...")
    print(f"Connecting to: {uri}")
    print(f"Database: {database}")
    print(f"Username: {username}")
    
    try:
        # Search for Bill Gates and extract subgraph
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
        
        if not subgraph_data.get('subgraphs'):
            print("❌ No subgraph found")
            return
        
        print(f"\n📊 Subgraph extracted:")
        print(f"  Subgraphs: {len(subgraph_data['subgraphs'])}")
        
        # Analyze nodes in the subgraph
        all_nodes = []
        document_nodes = []
        chunk_nodes = []
        
        for subgraph in subgraph_data['subgraphs']:
            for node in subgraph.get('nodes', []):
                all_nodes.append(node)
                node_labels = node.get('labels', [])
                node_props = node.get('properties', {})
                
                # Categorize nodes
                if any(label in ['Document', 'File', 'Source'] for label in node_labels):
                    document_nodes.append({
                        'element_id': node.get('element_id'),
                        'labels': node_labels,
                        'properties': node_props
                    })
                elif any(label in ['Chunk', 'DocumentChunk', 'TextChunk'] for label in node_labels):
                    chunk_nodes.append({
                        'element_id': node.get('element_id'),
                        'labels': node_labels,
                        'properties': node_props
                    })
        
        print(f"  Total nodes: {len(all_nodes)}")
        print(f"  Document nodes: {len(document_nodes)}")
        print(f"  Chunk nodes: {len(chunk_nodes)}")
        
        # Analyze document nodes
        print(f"\n📄 Document nodes found:")
        for i, doc in enumerate(document_nodes[:5]):  # Show first 5
            print(f"\n  Document {i+1}:")
            print(f"    Element ID: {doc['element_id']}")
            print(f"    Labels: {doc['labels']}")
            print(f"    Properties: {list(doc['properties'].keys())}")
            
            # Show key properties
            for key in ['id', 'name', 'url', 'source', 'document_id', 'type']:
                if key in doc['properties']:
                    print(f"    {key}: {doc['properties'][key]}")
        
        # Analyze chunk nodes
        print(f"\n📝 Chunk nodes found:")
        for i, chunk in enumerate(chunk_nodes[:5]):  # Show first 5
            print(f"\n  Chunk {i+1}:")
            print(f"    Element ID: {chunk['element_id']}")
            print(f"    Labels: {chunk['labels']}")
            print(f"    Properties: {list(chunk['properties'].keys())}")
            
            # Show key properties
            for key in ['id', 'text', 'content', 'source', 'document_id', 'doc_id', 'url']:
                if key in chunk['properties']:
                    value = chunk['properties'][key]
                    if key in ['text', 'content'] and len(str(value)) > 100:
                        value = str(value)[:100] + "..."
                    print(f"    {key}: {value}")
        
        # Test the enhanced chunk extraction
        print(f"\n🔧 Testing enhanced chunk extraction...")
        from src.risk_assessment import extract_chunks_from_subgraph
        
        chunks = extract_chunks_from_subgraph(subgraph_data)
        
        print(f"\n📋 Extracted {len(chunks)} chunks:")
        for i, chunk in enumerate(chunks):
            print(f"\n  Chunk {i+1}:")
            print(f"    ID: {chunk['chunk_id']}")
            print(f"    Document: {chunk['document_name'] or chunk['document_id']}")
            print(f"    Source: {chunk['source']}")
            print(f"    Text length: {len(chunk['text'])} characters")
            print(f"    Text preview: {chunk['text'][:100]}...")
        
        # Save detailed results
        results = {
            'subgraph_summary': {
                'total_nodes': len(all_nodes),
                'document_nodes': len(document_nodes),
                'chunk_nodes': len(chunk_nodes)
            },
            'document_nodes': document_nodes,
            'chunk_nodes': chunk_nodes,
            'extracted_chunks': chunks
        }
        
        with open('source_extraction_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: source_extraction_results.json")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        logging.exception("Error in source extraction test")

if __name__ == "__main__":
    test_source_extraction()
