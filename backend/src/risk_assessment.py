import logging
import json
import os
from typing import Dict, List, Any, Optional
from jinja2 import Template
from src.graph_query import search_and_get_subgraph, get_graphDB_driver
from src.llm import get_llm

# Risk assessment prompt template using Jinja2
RISK_ASSESSMENT_PROMPT = """
You are an expert Canadian research security risk assessor.
Assess the research-security risk of the following entity and return only a valid JSON object.

Entity: {{ entity_name }} ({{ entity_type }})

Risk Indicators & Weights (1–100 each):
{% for indicator, weight in risk_indicators.items() %}
{{ indicator }}: {{ weight }}
{% endfor %}

Context Information:
The following information was extracted from the knowledge graph about this entity:

{% if chunks %}
Relevant Document Chunks:
{% for chunk in chunks %}
Chunk {{ loop.index }}:
Text: {{ chunk.text }}
Source: {{ chunk.source if chunk.source else "Unknown" }}
Document: {{ chunk.document_name or chunk.document_id or "Unknown" }}
{% endfor %}

Source Reference Instructions:
- Use the exact source URL if available (e.g., "https://example.com/article")
- Use document names if no URL (e.g., "Document: Apple stock during pandemic.pdf")
- Use chunk references if no specific source (e.g., "Chunk 1", "Chunk 3")
- Use "nil" only when no evidence exists for an indicator

CRITICAL: When citing sources, ALWAYS use the "Source:" field from the chunk above, NOT "Chunk X" references.
If a chunk shows "Source: Document: Bill_Gates", cite it as "Document: Bill_Gates", not "Chunk 1".
{% else %}
No relevant document chunks found for this entity.
{% endif %}

{% if subgraph_info %}
Graph Context:
- Total related nodes: {{ subgraph_info.total_nodes }}
- Total relationships: {{ subgraph_info.total_relationships }}
- Entity connections: {{ subgraph_info.entity_connections }}
{% endif %}

Scoring Guidance:
For each indicator, assign a score from 1–5 (1 = very low risk, 5 = very high risk).
Provide a short, evidence-based explanation and at least one citation (URL or identifiable source) per indicator.
Use the actual source URLs from the chunks when available. If no specific evidence is found for an indicator, use "nil" as the source and score conservatively.

Weights reflect indicator importance (1–100). All weights are combined and normalized during calculation.

Final Score Calculation (deterministic):
Let totalWeight = sum(weights).
For each indicator, normalizedWeight = weight / totalWeight.
overallScore = sum(score_i * normalizedWeight_i) (range 1–5).

Traffic light mapping (use these exact thresholds):
Red if overallScore >= 4.0
Yellow if 2.5 <= overallScore < 4.0
Blue if overallScore < 2.5

Required JSON format (no extra keys, no commentary outside JSON):
{
  "entityName": "<entity name>",
  "entityType": "<individual | organization>",
  "riskAssessments": [
    {
      "indicator": "<risk indicator 1>",
      "weight": <1-100>,
      "score": <1-5>,
      "explanation": "<brief evidence-based rationale>",
      "sources": ["<source 1>", "<source 2>"],
      "normalizedWeight": <0-1>,
      "weightedContribution": <score * normalizedWeight>
    }
  ],
  "calculation": {
    "totalWeight": <sum of weights>,
    "overallScore": <weighted average 1-5 rounded to 2 decimals>,
    "thresholdsApplied": {
      "red": "overallScore >= 4.0",
      "yellow": "2.5 <= overallScore < 4.0",
      "blue": "overallScore < 2.5"
    }
  },
  "finalAssessment": {
    "trafficLight": "<Red | Yellow | Blue>",
    "overallExplanation": "<short rationale tying scores to final color>"
  }
}

IMPORTANT: Do not hallucinate. Only use evidence from the provided chunks and graph context. 

For sources, use the following priority:
1. If a chunk has a valid URL in its source field, use that URL
2. If a chunk has a document name but no URL, use "Document: [document_name]"
3. If no specific source is available, use "Chunk [number]" as reference
4. If no evidence exists for an indicator, use "nil" as the source

CRITICAL: Always use the exact "Source:" value from the chunk data above. Do NOT create "Chunk X" references.

Provide a conservative score with explanation that no evidence was found when appropriate.
"""

def extract_chunks_from_subgraph(subgraph_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract relevant chunks from subgraph data.
    
    Args:
        subgraph_data: Subgraph data from search_and_get_subgraph
        
    Returns:
        List of chunks with text and source information
    """
    chunks = []
    documents = {}  # Store document information for source URLs
    
    try:
        logging.info(f"Extracting chunks from subgraph data: {len(subgraph_data.get('subgraphs', []))} subgraphs")
        
        # First pass: collect document information
        for subgraph in subgraph_data.get('subgraphs', []):
            for node in subgraph.get('nodes', []):
                node_labels = node.get('labels', [])
                node_props = node.get('properties', {})
                
                # Look for document nodes that might contain source URLs
                if any(label in ['Document', 'File', 'Source'] for label in node_labels):
                    doc_id = node_props.get('id') or node_props.get('document_id') or node_props.get('name')
                    if doc_id:
                        documents[doc_id] = {
                            'url': node_props.get('url', ''),
                            'source': node_props.get('source', ''),
                            'file_name': node_props.get('name', ''),
                            'document_type': node_props.get('type', '')
                        }
                        logging.info(f"Found document: {doc_id} with URL: {documents[doc_id]['url']}")
        
        # Second pass: extract chunks and link to documents
        for subgraph in subgraph_data.get('subgraphs', []):
            logging.info(f"Processing subgraph with {len(subgraph.get('nodes', []))} nodes")
            
            for node in subgraph.get('nodes', []):
                node_labels = node.get('labels', [])
                node_props = node.get('properties', {})
                
                # Check for chunk nodes - look for various possible chunk labels
                is_chunk_node = any(label in ['Chunk', 'DocumentChunk', 'TextChunk'] for label in node_labels)
                
                # Also check if node has chunk-like properties
                has_chunk_props = any(key in ['text', 'content', 'chunk_text'] for key in node_props.keys())
                
                if is_chunk_node or has_chunk_props:
                    logging.info(f"Found chunk node: {node.get('element_id')} with labels: {node_labels}")
                    logging.info(f"Chunk node properties: {list(node_props.keys())}")
                    
                    # Try different possible property names for text content
                    text_content = (
                        node_props.get('text') or 
                        node_props.get('content') or 
                        node_props.get('chunk_text') or 
                        node_props.get('text_content') or
                        str(node_props)  # Fallback to string representation
                    )
                    
                    # Get document information - try multiple approaches
                    doc_id = node_props.get('document_id') or node_props.get('doc_id')
                    doc_info = documents.get(doc_id, {})
                    
                    # Enhanced source extraction - try to get actual source URL
                    source_url = None
                    
                    # 1. First try chunk's own URL property (for new chunks with URL fix)
                    if node_props.get('url'):
                        source_url = node_props.get('url')
                        logging.info(f"Using chunk's own URL: {source_url}")
                    
                    # 2. Try to get URL from document info
                    elif doc_info.get('url'):
                        source_url = doc_info.get('url')
                        logging.info(f"Using document URL: {source_url}")
                    
                    # 3. Try to get URL from document name lookup
                    elif node_props.get('fileName'):
                        # Look for document with this fileName
                        for doc_id, doc_info in documents.items():
                            if doc_info.get('file_name') == node_props.get('fileName'):
                                if doc_info.get('url'):
                                    source_url = doc_info.get('url')
                                    logging.info(f"Found URL via fileName lookup: {source_url}")
                                    break
                    
                    # 4. Try other fallbacks
                    elif node_props.get('source_url'):
                        source_url = node_props.get('source_url')
                    elif doc_info.get('source'):
                        source_url = doc_info.get('source')
                    elif node_props.get('source'):
                        source_url = node_props.get('source')
                    
                    # 5. Construct source reference if no URL found
                    if not source_url:
                        if doc_info.get('file_name'):
                            source_url = f"Document: {doc_info['file_name']}"
                        elif node_props.get('fileName'):
                            source_url = f"Document: {node_props['fileName']}"
                        else:
                            source_url = f"Chunk {len(chunks) + 1}"
                    
                    # Validate URL format
                    if source_url and not source_url.startswith(('http://', 'https://', 'Document:', 'Source:', 'Chunk')):
                        # If it looks like a URL but doesn't have protocol, add https://
                        if '.' in source_url and '/' in source_url:
                            source_url = f"https://{source_url}"
                        else:
                            source_url = f"Document: {source_url}"
                    
                    chunk_info = {
                        'text': text_content,
                        'source': source_url,
                        'document_id': doc_id or '',
                        'chunk_id': node_props.get('id', node.get('element_id', '')),
                        'document_name': doc_info.get('file_name', ''),
                        'document_type': doc_info.get('document_type', '')
                    }
                    
                    if chunk_info['text'] and len(chunk_info['text'].strip()) > 10:  # Only add non-empty chunks with substantial content
                        chunks.append(chunk_info)
                        logging.info(f"Added chunk with {len(chunk_info['text'])} characters, source: {chunk_info['source']}")
        
        # Remove duplicates based on chunk_id
        unique_chunks = []
        seen_ids = set()
        for chunk in chunks:
            if chunk['chunk_id'] not in seen_ids:
                unique_chunks.append(chunk)
                seen_ids.add(chunk['chunk_id'])
        
        logging.info(f"Extracted {len(unique_chunks)} unique chunks from subgraph")
        return unique_chunks[:10]  # Limit to 10 most relevant chunks
        
    except Exception as e:
        logging.error(f"Error extracting chunks from subgraph: {str(e)}")
        return []

def extract_subgraph_info(subgraph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract summary information about the subgraph.
    
    Args:
        subgraph_data: Subgraph data from search_and_get_subgraph
        
    Returns:
        Dictionary with subgraph summary information
    """
    try:
        total_nodes = 0
        total_relationships = 0
        entity_connections = 0
        
        for subgraph in subgraph_data.get('subgraphs', []):
            total_nodes += len(subgraph.get('nodes', []))
            total_relationships += len(subgraph.get('relationships', []))
            
            # Count entity connections
            for rel in subgraph.get('relationships', []):
                if rel.get('type') in ['MENTIONED_IN', 'RELATED_TO', 'WORKS_FOR', 'FOUNDED', 'INVESTED_IN']:
                    entity_connections += 1
        
        return {
            'total_nodes': total_nodes,
            'total_relationships': total_relationships,
            'entity_connections': entity_connections
        }
        
    except Exception as e:
        logging.error(f"Error extracting subgraph info: {str(e)}")
        return {
            'total_nodes': 0,
            'total_relationships': 0,
            'entity_connections': 0
        }

def assess_risk_with_llm(entity_name: str, entity_type: str, risk_indicators: Dict[str, int], 
                        chunks: List[Dict[str, Any]], subgraph_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use LLM to assess risk based on extracted chunks and graph context.
    
    Args:
        entity_name: Name of the entity to assess
        entity_type: Type of entity (individual or organization)
        risk_indicators: Dictionary of risk indicators and their weights
        chunks: List of relevant document chunks
        subgraph_info: Summary information about the subgraph
        
    Returns:
        Risk assessment result as dictionary
    """
    try:
        # Load LLM
        llm_model = os.getenv('RISK_ASSESSMENT_MODEL', 'openai_gpt_4o')
        llm, _ = get_llm(llm_model)
        
        # Prepare template context
        template_context = {
            'entity_name': entity_name,
            'entity_type': entity_type,
            'risk_indicators': risk_indicators,
            'chunks': chunks,
            'subgraph_info': subgraph_info
        }
        
        # Render prompt template
        template = Template(RISK_ASSESSMENT_PROMPT)
        prompt = template.render(**template_context)
        
        logging.info(f"Generating risk assessment for entity: {entity_name}")
        
        # Get LLM response
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Extract JSON from response
        try:
            # Find JSON in the response (in case there's extra text)
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != 0:
                json_str = response_text[start_idx:end_idx]
                risk_assessment = json.loads(json_str)
                
                # Validate required fields
                required_fields = ['entityName', 'entityType', 'riskAssessments', 'calculation', 'finalAssessment']
                for field in required_fields:
                    if field not in risk_assessment:
                        raise ValueError(f"Missing required field: {field}")
                
                return risk_assessment
            else:
                raise ValueError("No JSON found in response")
                
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse JSON from LLM response: {str(e)}")
            logging.error(f"Response text: {response_text}")
            raise ValueError(f"Invalid JSON response from LLM: {str(e)}")
            
    except Exception as e:
        logging.error(f"Error in risk assessment with LLM: {str(e)}")
        raise Exception(f"Failed to assess risk: {str(e)}")

def analyze_risk(uri: str, username: str, password: str, database: str, 
                entity_name: str, entity_type: str, risk_indicators: Dict[str, int], 
                depth: int = 4, max_results: int = 10) -> Dict[str, Any]:
    """
    Main function to analyze risk for an entity.
    
    Args:
        uri: Neo4j database URI
        username: Database username
        password: Database password
        database: Database name
        entity_name: Name of the entity to assess
        entity_type: Type of entity (individual or organization)
        risk_indicators: Dictionary of risk indicators and their weights
        depth: Depth for subgraph extraction
        max_results: Maximum number of search results to consider
        
    Returns:
        Complete risk assessment result
    """
    try:
        logging.info(f"Starting risk analysis for entity: {entity_name} ({entity_type})")
        
                               # Step 1: Search for entity and extract subgraph (same as search_nodes)
        subgraph_data = search_and_get_subgraph(
            uri=uri,
            username=username,
            password=password,
            database=database,
            search_term=entity_name,
            node_type=entity_type,
            depth=depth,
            max_results=max_results,
            extract_best_match_only=True,  # Only extract from best match for efficiency
            preserve_text=True  # Preserve text content for chunk extraction
        )
        
        if not subgraph_data.get('subgraphs'):
            logging.warning(f"No subgraph found for entity: {entity_name}")
            return {
                "error": "Entity not found in database",
                "entityName": entity_name,
                "entityType": entity_type
            }
        
        # Step 2: Extract relevant chunks from subgraph
        chunks = extract_chunks_from_subgraph(subgraph_data)
        logging.info(f"Extracted {len(chunks)} relevant chunks for risk assessment")
        
        # Step 3: Extract subgraph summary information
        subgraph_info = extract_subgraph_info(subgraph_data)
        logging.info(f"Subgraph info: {subgraph_info}")
        
        # Step 4: Use LLM to assess risk based on chunks and context
        risk_assessment = assess_risk_with_llm(
            entity_name=entity_name,
            entity_type=entity_type,
            risk_indicators=risk_indicators,
            chunks=chunks,
            subgraph_info=subgraph_info
        )
        
        # Step 5: Add metadata about the analysis
        risk_assessment['analysis_metadata'] = {
            'chunks_analyzed': len(chunks),
            'subgraph_nodes': subgraph_info['total_nodes'],
            'subgraph_relationships': subgraph_info['total_relationships'],
            'search_method': subgraph_data.get('best_match', {}).get('search_method', 'unknown'),
            'best_match_score': subgraph_data.get('best_match', {}).get('score', 'N/A')
        }
        
        logging.info(f"Risk analysis completed for entity: {entity_name}")
        return risk_assessment
        
    except Exception as e:
        logging.error(f"Error in risk analysis: {str(e)}")
        raise Exception(f"Risk analysis failed: {str(e)}")
