#!/usr/bin/env python3
"""
URL Sources Analysis - Why URLs are Missing in Most Cases

This script analyzes the document processing pipeline to understand why URL sources
are not being properly preserved and linked to chunks in the knowledge graph.
"""

import logging
import json
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def analyze_url_source_issues():
    """
    Comprehensive analysis of why URL sources are missing in most cases.
    """
    
    print("🔍 URL SOURCES ANALYSIS: Why URLs Are Missing in Most Cases")
    print("=" * 80)
    
    # Issue 1: Document Node Creation
    print("\n📋 ISSUE 1: Document Node Creation")
    print("-" * 50)
    print("✅ URLs ARE stored in Document nodes during creation:")
    print("   - S3: obj_source_node.url = str(source_url+file_name)")
    print("   - GCS: obj_source_node.url = file_metadata['url']")
    print("   - Web: obj_source_node.url = urllib.parse.unquote(source_url)")
    print("   - Wikipedia: obj_source_node.url = pages[0].metadata['source']")
    print("   - YouTube: obj_source_node.url = source_url")
    print("   - Local: ❌ NO URL stored (file_source = 'local file')")
    
    # Issue 2: Chunk Node Creation
    print("\n📋 ISSUE 2: Chunk Node Creation")
    print("-" * 50)
    print("❌ URLs are NOT copied to chunk nodes during creation:")
    print("   - Chunk nodes only store: text, position, length, fileName, content_offset")
    print("   - Missing: url, source_url, document_url properties")
    print("   - Only relationship: (c:Chunk)-[:PART_OF]->(d:Document)")
    
    # Issue 3: Source Extraction Logic
    print("\n📋 ISSUE 3: Source Extraction in Risk Assessment")
    print("-" * 50)
    print("🔍 Current extraction logic tries multiple fallbacks:")
    print("   1. node_props.get('url') - ❌ Chunks don't have URL property")
    print("   2. node_props.get('source_url') - ❌ Chunks don't have source_url property")
    print("   3. doc_info.get('url') - ✅ Document nodes have URL")
    print("   4. doc_info.get('source') - ❌ Document nodes don't have 'source' property")
    print("   5. node_props.get('source', '') - ❌ Chunks don't have source property")
    
    # Issue 4: Document-Chunk Relationship
    print("\n📋 ISSUE 4: Document-Chunk Relationship")
    print("-" * 50)
    print("🔗 Current relationship structure:")
    print("   (c:Chunk)-[:PART_OF]->(d:Document)")
    print("   - Chunk has: fileName property")
    print("   - Document has: fileName and url properties")
    print("   - ❌ No direct URL transfer during chunk creation")
    
    # Issue 5: Source Types Analysis
    print("\n📋 ISSUE 5: Source Types Analysis")
    print("-" * 50)
    source_types = {
        "local file": "❌ No URL (local files)",
        "s3 bucket": "✅ Has URL (s3://bucket/path/file.pdf)",
        "gcs bucket": "✅ Has URL (https://storage.googleapis.com/...)",
        "web page": "✅ Has URL (https://example.com)",
        "Wikipedia": "✅ Has URL (https://en.wikipedia.org/wiki/...)",
        "youtube": "✅ Has URL (https://youtube.com/watch?v=...)"
    }
    
    for source_type, url_status in source_types.items():
        print(f"   {source_type:15} : {url_status}")
    
    # Issue 6: Risk Assessment Source Extraction
    print("\n📋 ISSUE 6: Risk Assessment Source Extraction")
    print("-" * 50)
    print("🔍 Current extraction process:")
    print("   1. Extract subgraph with depth-based traversal")
    print("   2. Find Document nodes in subgraph")
    print("   3. Find Chunk nodes in subgraph")
    print("   4. Try to link chunks to document URLs")
    print("   ❌ Problem: Not all Document nodes may be in subgraph")
    print("   ❌ Problem: Chunk nodes don't have direct URL references")
    
    # Solutions
    print("\n💡 SOLUTIONS")
    print("=" * 80)
    
    print("\n🔧 SOLUTION 1: Copy URL to Chunk Nodes")
    print("-" * 40)
    print("Modify create_relation_between_chunks() in make_relationships.py:")
    print("""
    # Get document URL first
    doc_url_query = "MATCH (d:Document {fileName: $f_name}) RETURN d.url as url"
    doc_result = execute_graph_query(graph, doc_url_query, {"f_name": file_name})
    doc_url = doc_result[0]['url'] if doc_result else None
    
    # Add URL to chunk data
    chunk_data = {
        "id": current_chunk_id,
        "pg_content": chunk_document.page_content,
        "position": position,
        "length": chunk_document.metadata["length"],
        "f_name": file_name,
        "url": doc_url,  # ← ADD THIS
        "previous_id": previous_chunk_id,
        "content_offset": offset
    }
    
    # Update chunk creation query
    query_to_create_chunk_and_PART_OF_relation = '''
        UNWIND $batch_data AS data
        MERGE (c:Chunk {id: data.id})
        SET c.text = data.pg_content, c.position = data.position, 
            c.length = data.length, c.fileName=data.f_name, 
            c.url = data.url, c.content_offset=data.content_offset
        ...
    '''
    """)
    
    print("\n🔧 SOLUTION 2: Enhanced Source Extraction")
    print("-" * 40)
    print("Modify extract_chunks_from_subgraph() in risk_assessment.py:")
    print("""
    # Add direct URL lookup for chunks
    def get_document_url_for_chunk(chunk_file_name):
        doc_url_query = "MATCH (d:Document {fileName: $f_name}) RETURN d.url as url"
        doc_result = execute_graph_query(graph, doc_url_query, {"f_name": chunk_file_name})
        return doc_result[0]['url'] if doc_result else None
    
    # In chunk extraction loop
    chunk_file_name = node_props.get('fileName')
    if chunk_file_name:
        doc_url = get_document_url_for_chunk(chunk_file_name)
        if doc_url:
            source_url = doc_url
    """)
    
    print("\n🔧 SOLUTION 3: Improve Subgraph Extraction")
    print("-" * 40)
    print("Modify get_subgraph_from_node() to include Document nodes:")
    print("""
    # Include Document nodes in subgraph extraction
    subgraph_query = f'''
    MATCH (startNode)
    WHERE elementId(startNode) = $node_id
    MATCH path = (startNode)-[*1..{depth}]-(connectedNode)
    WITH startNode, collect(DISTINCT path) AS paths
    UNWIND paths AS path
    WITH startNode, path, nodes(path) AS pathNodes, relationships(path) AS pathRels
    UNWIND pathNodes AS node
    WITH startNode, path, pathRels, collect(DISTINCT node) AS allNodes
    UNWIND pathRels AS rel
    WITH startNode, allNodes, collect(DISTINCT rel) AS allRels
    
    // Also include Document nodes for chunks
    WITH startNode, allNodes, allRels
    OPTIONAL MATCH (c:Chunk)-[:PART_OF]->(d:Document)
    WHERE c IN allNodes
    WITH startNode, allNodes + collect(d) AS allNodes, allRels
    RETURN allNodes AS nodes, allRels AS relationships
    LIMIT $max_nodes
    '''
    """)
    
    print("\n🔧 SOLUTION 4: Add URL Property to Chunk Schema")
    print("-" * 40)
    print("Update chunk creation to always include URL:")
    print("""
    # In create_relation_between_chunks()
    # Always get document URL, even for local files
    doc_url = None
    if file_name:
        doc_url_query = "MATCH (d:Document {fileName: $f_name}) RETURN d.url as url, d.fileSource as source"
        doc_result = execute_graph_query(graph, doc_url_query, {"f_name": file_name})
        if doc_result:
            doc_url = doc_result[0]['url']
            file_source = doc_result[0]['source']
            if not doc_url and file_source == 'local file':
                doc_url = f"local://{file_name}"  # Create local file reference
    
    # Add to chunk data
    chunk_data["url"] = doc_url
    chunk_data["fileSource"] = file_source
    """)
    
    print("\n📊 SUMMARY")
    print("=" * 80)
    print("✅ URLs ARE stored in Document nodes")
    print("❌ URLs are NOT copied to Chunk nodes")
    print("❌ Risk assessment can't easily access Document URLs")
    print("❌ Local files have no URL representation")
    print("❌ Subgraph extraction may not include Document nodes")
    
    print("\n🎯 RECOMMENDED FIXES (in order of impact):")
    print("1. Copy URL from Document to Chunk nodes during creation")
    print("2. Enhance subgraph extraction to include Document nodes")
    print("3. Add direct URL lookup in risk assessment")
    print("4. Create URL references for local files")
    
    print("\n🚀 IMPLEMENTATION PRIORITY:")
    print("HIGH: Solution 1 (Copy URL to Chunk nodes)")
    print("MEDIUM: Solution 3 (Improve subgraph extraction)")
    print("LOW: Solution 4 (Add URL property to schema)")

if __name__ == "__main__":
    analyze_url_source_issues()
