#!/usr/bin/env python3
"""
Test script to verify chunk extraction in risk assessment.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.risk_assessment import extract_chunks_from_subgraph
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_chunk_extraction():
    """Test the chunk extraction function with sample data."""
    
    # Sample subgraph data structure
    sample_subgraph_data = {
        'subgraphs': [
            {
                'nodes': [
                    {
                        'element_id': 'node1',
                        'labels': ['Person'],
                        'properties': {
                            'id': 'Bill Gates',
                            'name': 'Bill Gates'
                        }
                    },
                    {
                        'element_id': 'node2',
                        'labels': ['Chunk'],
                        'properties': {
                            'id': 'chunk1',
                            'text': 'Bill Gates is a co-founder of Microsoft Corporation and a prominent philanthropist.',
                            'source': 'document1.pdf',
                            'document_id': 'doc1'
                        }
                    },
                    {
                        'element_id': 'node3',
                        'labels': ['DocumentChunk'],
                        'properties': {
                            'id': 'chunk2',
                            'content': 'Microsoft was founded in 1975 by Bill Gates and Paul Allen.',
                            'source': 'document2.pdf',
                            'document_id': 'doc2'
                        }
                    },
                    {
                        'element_id': 'node4',
                        'labels': ['Organization'],
                        'properties': {
                            'id': 'Microsoft',
                            'name': 'Microsoft Corporation'
                        }
                    }
                ],
                'relationships': []
            }
        ]
    }
    
    print("Testing chunk extraction...")
    print(f"Sample subgraph has {len(sample_subgraph_data['subgraphs'][0]['nodes'])} nodes")
    
    # Extract chunks
    chunks = extract_chunks_from_subgraph(sample_subgraph_data)
    
    print(f"\nExtracted {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i+1}:")
        print(f"  ID: {chunk['chunk_id']}")
        print(f"  Text: {chunk['text'][:100]}...")
        print(f"  Source: {chunk['source']}")
        print(f"  Document: {chunk['document_id']}")
    
    return chunks

if __name__ == "__main__":
    test_chunk_extraction()
