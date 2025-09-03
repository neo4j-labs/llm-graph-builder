#!/usr/bin/env python3
"""
Test script to verify enhanced source extraction functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.risk_assessment import extract_chunks_from_subgraph
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_enhanced_source_extraction():
    """Test the enhanced source extraction with various scenarios."""
    
    # Test case 1: Chunks with URLs
    test_data_1 = {
        'subgraphs': [{
            'nodes': [
                {
                    'element_id': 'doc1',
                    'labels': ['Document'],
                    'properties': {
                        'id': 'doc1',
                        'name': 'Apple stock during pandemic.pdf',
                        'url': 'https://example.com/apple-stock-pandemic.pdf'
                    }
                },
                {
                    'element_id': 'chunk1',
                    'labels': ['Chunk'],
                    'properties': {
                        'id': 'chunk1',
                        'text': 'Bill Gates is a co-founder of Microsoft Corporation.',
                        'document_id': 'doc1'
                    }
                }
            ],
            'relationships': []
        }]
    }
    
    # Test case 2: Chunks with document names but no URLs
    test_data_2 = {
        'subgraphs': [{
            'nodes': [
                {
                    'element_id': 'doc2',
                    'labels': ['Document'],
                    'properties': {
                        'id': 'doc2',
                        'name': 'Microsoft financial report.pdf'
                    }
                },
                {
                    'element_id': 'chunk2',
                    'labels': ['Chunk'],
                    'properties': {
                        'id': 'chunk2',
                        'text': 'Microsoft was founded in 1975 by Bill Gates and Paul Allen.',
                        'document_id': 'doc2'
                    }
                }
            ],
            'relationships': []
        }]
    }
    
    # Test case 3: Chunks with no document info
    test_data_3 = {
        'subgraphs': [{
            'nodes': [
                {
                    'element_id': 'chunk3',
                    'labels': ['Chunk'],
                    'properties': {
                        'id': 'chunk3',
                        'text': 'Bill Gates is known for his philanthropic work.',
                        'source': 'unknown source'
                    }
                }
            ],
            'relationships': []
        }]
    }
    
    test_cases = [
        ("Chunks with URLs", test_data_1),
        ("Chunks with document names", test_data_2),
        ("Chunks with no document info", test_data_3)
    ]
    
    for test_name, test_data in test_cases:
        print(f"\n🧪 Testing: {test_name}")
        print("=" * 50)
        
        chunks = extract_chunks_from_subgraph(test_data)
        
        print(f"Extracted {len(chunks)} chunks:")
        for i, chunk in enumerate(chunks):
            print(f"\n  Chunk {i+1}:")
            print(f"    ID: {chunk['chunk_id']}")
            print(f"    Document: {chunk['document_name'] or chunk['document_id']}")
            print(f"    Source: {chunk['source']}")
            print(f"    Text: {chunk['text'][:50]}...")
    
    # Test the prompt template rendering
    print(f"\n📝 Testing prompt template rendering...")
    from src.risk_assessment import RISK_ASSESSMENT_PROMPT
    from jinja2 import Template
    
    template = Template(RISK_ASSESSMENT_PROMPT)
    
    # Sample data for template
    sample_context = {
        'entity_name': 'Bill Gates',
        'entity_type': 'Person',
        'risk_indicators': {'Foreign State Influence': 80, 'Dual-Use Technology Exposure': 70},
        'chunks': [
            {
                'text': 'Bill Gates is a co-founder of Microsoft Corporation.',
                'source': 'https://example.com/apple-stock-pandemic.pdf',
                'document_name': 'Apple stock during pandemic.pdf'
            },
            {
                'text': 'Microsoft was founded in 1975 by Bill Gates and Paul Allen.',
                'source': 'Document: Microsoft financial report.pdf',
                'document_name': 'Microsoft financial report.pdf'
            }
        ],
        'subgraph_info': {'total_nodes': 139, 'total_relationships': 276, 'entity_connections': 15}
    }
    
    rendered_prompt = template.render(**sample_context)
    
    print(f"\nRendered prompt preview (first 500 chars):")
    print(rendered_prompt[:500] + "...")
    
    # Check if source instructions are included
    if "Source Reference Instructions" in rendered_prompt:
        print("✅ Source reference instructions included in prompt")
    else:
        print("❌ Source reference instructions missing from prompt")

if __name__ == "__main__":
    test_enhanced_source_extraction()
