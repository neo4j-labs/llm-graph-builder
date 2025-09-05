"""
Risk Monitoring Module
Provides functionality to monitor documents for specific names and risk indicators
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from .constants.risk_monitoring_prompts import RISK_MONITORING_PROMPTS, RISK_LEVELS


def validate_document_exists(graph, document_name: str) -> Optional[Dict[str, Any]]:
    """Check if document exists and return basic info."""
    try:
        # First, let's check what documents exist and their exact names
        debug_query = """
        MATCH (d:Document)
        RETURN d.fileName AS filename, d.id AS id, d.size AS size, d.created_date AS created_date
        LIMIT 10
        """
        debug_result = graph.query(debug_query, {})
        logging.info(f"Available documents: {debug_result}")
        
        # Now check for the specific document
        query = """
        MATCH (d:Document)
        WHERE d.fileName = $document_name
        OPTIONAL MATCH (c:Chunk)-[:PART_OF]->(d)
        WITH d, count(c) AS chunk_count
        RETURN {
            exists: true,
            document_id: d.id,
            size: d.size,
            chunk_count: chunk_count,
            created_date: d.created_date
        } AS info
        """
        
        result = graph.query(query, {"document_name": document_name})
        if result:
            logging.info(f"Document found: {result[0]}")
            return result[0]
        else:
            logging.warning(f"Document '{document_name}' not found in database")
            return None
    except Exception as e:
        logging.error(f"Error validating document existence: {str(e)}")
        return None


def extract_document_chunks(graph, document_name: str) -> List[Dict[str, Any]]:
    """Extract all chunks from a document."""
    try:
        # First, let's check if the document exists and has chunks
        debug_query = """
        MATCH (d:Document {fileName: $document_name})
        OPTIONAL MATCH (c:Chunk)-[:PART_OF]->(d)
        RETURN d.fileName AS doc_name, count(c) AS chunk_count
        """
        debug_result = graph.query(debug_query, {"document_name": document_name})
        logging.info(f"Document chunk check: {debug_result}")
        
        # Now get the actual chunks
        query = """
        MATCH (c:Chunk)-[:PART_OF]->(d:Document)
        WHERE d.fileName = $document_name
        RETURN {
            id: c.id,
            text: c.text,
            position: c.position,
            metadata: c.metadata
        } AS chunk
        ORDER BY c.position
        """
        
        result = graph.query(query, {"document_name": document_name})
        logging.info(f"Found {len(result)} chunks for document '{document_name}'")
        
        if not result:
            logging.warning(f"No chunks found for document '{document_name}'. This usually means the document was uploaded but never processed.")
        
        # Extract the chunk data from the query result
        chunks = []
        for row in result:
            chunk_data = row.get('chunk', {})
            if chunk_data:
                chunks.append(dict(chunk_data))
        
        return chunks
    except Exception as e:
        logging.error(f"Error extracting document chunks: {str(e)}")
        return []


def call_llm_for_analysis(prompt: str, model: str) -> Optional[str]:
    """Call LLM for analysis with error handling."""
    try:
        # Import here to avoid circular imports
        from .llm import get_llm
        
        # Use the proper LLM configuration system
        llm, model_name = get_llm(model)
        
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        logging.error(f"LLM call failed: {str(e)}")
        return None


def create_fallback_name_results(llm_response: str, monitored_names: List[str]) -> Dict[str, Any]:
    """Create fallback results if LLM response parsing fails."""
    # Return empty results to avoid false positives
    # The LLM should provide proper JSON responses, not fallback to text matching
    return {
        "names_found": [],
        "occurrences": [],
        "context": {},
        "risk_indicators": {}
    }


def create_fallback_risk_results(llm_response: str, risk_indicators: List[str]) -> Dict[str, Any]:
    """Create fallback results if LLM response parsing fails."""
    # Return empty results to avoid false positives
    # The LLM should provide proper JSON responses, not fallback to text matching
    return {
        "indicators_found": [],
        "risk_scores": {},
        "evidence": {},
        "severity_assessment": {}
    }


def parse_name_monitoring_response(llm_response: str, monitored_names: List[str]) -> Dict[str, Any]:
    """Parse LLM response for name monitoring."""
    try:
        # Clean the response - remove markdown code blocks if present
        cleaned_response = llm_response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove ```
        cleaned_response = cleaned_response.strip()
        
        parsed = json.loads(cleaned_response)
        return parsed
    except json.JSONDecodeError:
        logging.warning("Failed to parse LLM response as JSON, using fallback parsing")
        return create_fallback_name_results(llm_response, monitored_names)


def parse_risk_analysis_response(llm_response: str, risk_indicators: List[str]) -> Dict[str, Any]:
    """Parse LLM response for risk analysis."""
    try:
        # Clean the response - remove markdown code blocks if present
        cleaned_response = llm_response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove ```
        cleaned_response = cleaned_response.strip()
        
        parsed = json.loads(cleaned_response)
        return parsed
    except json.JSONDecodeError:
        logging.warning("Failed to parse LLM response as JSON, using fallback parsing")
        return create_fallback_risk_results(llm_response, risk_indicators)


def monitor_names_in_document(document_chunks: List[Dict[str, Any]], monitored_names: List[str], model: str) -> Dict[str, Any]:
    """Monitor document for specific names and their context."""
    
    # Create LLM prompt for name monitoring
    document_content = "\n\n".join([f"Chunk {i+1}: {chunk['text']}" for i, chunk in enumerate(document_chunks)])
    
    # Debug logging
    logging.info(f"Document content length: {len(document_content)}")
    logging.info(f"Document content preview: {document_content[:500]}...")
    logging.info(f"Monitored names: {monitored_names}")
    
    name_monitoring_prompt = RISK_MONITORING_PROMPTS["NAME_MONITORING"].format(
        monitored_names=", ".join(monitored_names),
        document_content=document_content
    )
    
    # Use LLM to analyze names
    llm_response = call_llm_for_analysis(name_monitoring_prompt, model)
    
    # Debug logging
    logging.info(f"Name monitoring LLM response: {llm_response}")
    
    if not llm_response:
        # Fallback to simple text search
        return create_fallback_name_results("", monitored_names)
    
    # Parse LLM response
    name_results = parse_name_monitoring_response(llm_response, monitored_names)
    
    return {
        "names_found": name_results.get("names_found", []),
        "name_occurrences": name_results.get("occurrences", []),
        "context_analysis": name_results.get("context", {}),
        "risk_indicators_per_name": name_results.get("risk_indicators", {})
    }


def analyze_risk_indicators(document_chunks: List[Dict[str, Any]], risk_indicators: List[str], model: str) -> Dict[str, Any]:
    """Analyze document for risk indicators."""
    
    # Create LLM prompt for risk analysis
    document_content = "\n\n".join([f"Chunk {i+1}: {chunk['text']}" for i, chunk in enumerate(document_chunks)])
    
    risk_analysis_prompt = RISK_MONITORING_PROMPTS["RISK_ANALYSIS"].format(
        risk_indicators=", ".join(risk_indicators),
        document_content=document_content
    )
    
    # Use LLM to analyze risk indicators
    llm_response = call_llm_for_analysis(risk_analysis_prompt, model)
    
    # Debug logging
    logging.info(f"Risk analysis LLM response: {llm_response}")
    
    if not llm_response:
        # Fallback to simple text search
        return create_fallback_risk_results("", risk_indicators)
    
    # Parse LLM response
    risk_results = parse_risk_analysis_response(llm_response, risk_indicators)
    
    return {
        "indicators_found": risk_results.get("indicators_found", []),
        "risk_scores": risk_results.get("risk_scores", {}),
        "evidence": risk_results.get("evidence", {}),
        "severity_assessment": risk_results.get("severity", {})
    }


def calculate_name_risk_score(name_monitoring_results: Dict[str, Any]) -> float:
    """Calculate overall risk score from name monitoring."""
    if not name_monitoring_results.get("names_found"):
        return 0.0
    
    total_score = 0.0
    count = 0
    
    for name_result in name_monitoring_results["names_found"]:
        if "overall_risk_score" in name_result:
            total_score += name_result["overall_risk_score"]
            count += 1
    
    return total_score / count if count > 0 else 0.0


def calculate_indicator_risk_score(risk_analysis_results: Dict[str, Any]) -> float:
    """Calculate overall risk score from risk indicator analysis."""
    if not risk_analysis_results.get("indicators_found"):
        return 0.0
    
    total_score = 0.0
    count = 0
    
    for indicator_result in risk_analysis_results["indicators_found"]:
        if "risk_score" in indicator_result:
            total_score += indicator_result["risk_score"]
            count += 1
    
    return total_score / count if count > 0 else 0.0


def get_risk_level(risk_score: float) -> str:
    """Get risk level based on score."""
    for level, config in RISK_LEVELS.items():
        if config["min"] <= risk_score <= config["max"]:
            return level
    return "UNKNOWN"


def generate_risk_assessment(name_monitoring_results: Dict[str, Any], risk_analysis_results: Dict[str, Any], risk_threshold: float) -> Dict[str, Any]:
    """Generate overall risk assessment and alerts."""
    
    # Calculate overall risk score
    name_risk_score = calculate_name_risk_score(name_monitoring_results)
    indicator_risk_score = calculate_indicator_risk_score(risk_analysis_results)
    
    overall_risk_score = (name_risk_score + indicator_risk_score) / 2
    
    # Generate alerts
    alerts = []
    if overall_risk_score >= risk_threshold:
        alerts.append({
            "type": "HIGH_RISK",
            "score": overall_risk_score,
            "description": f"Overall risk score {overall_risk_score:.2f} exceeds threshold {risk_threshold}",
            "timestamp": datetime.now().isoformat()
        })
    
    # Add specific alerts for high-risk names
    for name_result in name_monitoring_results.get("names_found", []):
        if name_result.get("overall_risk_score", 0) >= risk_threshold:
            alerts.append({
                "type": "NAME_RISK",
                "name": name_result["name"],
                "score": name_result["overall_risk_score"],
                "description": f"High risk associated with name: {name_result['name']}",
                "context": name_result.get("context", ""),
                "timestamp": datetime.now().isoformat()
            })
    
    # Add specific alerts for high-risk indicators
    for indicator_result in risk_analysis_results.get("indicators_found", []):
        if indicator_result.get("risk_score", 0) >= risk_threshold:
            alerts.append({
                "type": "INDICATOR_RISK",
                "indicator": indicator_result["indicator"],
                "score": indicator_result["risk_score"],
                "description": f"High risk indicator found: {indicator_result['indicator']}",
                "evidence": indicator_result.get("evidence", ""),
                "timestamp": datetime.now().isoformat()
            })
    
    return {
        "overall_risk_score": overall_risk_score,
        "name_risk_score": name_risk_score,
        "indicator_risk_score": indicator_risk_score,
        "alert_required": overall_risk_score >= risk_threshold,
        "alerts": alerts,
        "risk_level": get_risk_level(overall_risk_score)
    }


def generate_entity_risk_alerts(document_chunks: List[Dict[str, Any]], monitored_names: List[str], risk_indicators: List[str], risk_threshold: float, model: str) -> List[Dict[str, Any]]:
    """Generate alerts for entities with risk indicators found in document."""
    
    # Create comprehensive LLM prompt for entity risk alerts
    document_content = "\n\n".join([f"Chunk {i+1}: {chunk['text']}" for i, chunk in enumerate(document_chunks)])
    
    entity_risk_prompt = RISK_MONITORING_PROMPTS["ENTITY_RISK_ALERTS"].format(
        monitored_names=", ".join(monitored_names),
        risk_indicators=", ".join(risk_indicators),
        risk_threshold=risk_threshold,
        document_content=document_content
    )
    
    # Use LLM to generate entity-based alerts
    llm_response = call_llm_for_analysis(entity_risk_prompt, model)
    
    # Debug logging
    logging.info(f"Entity risk alerts LLM response: {llm_response}")
    logging.info(f"Document chunks count: {len(document_chunks)}")
    logging.info(f"Monitored names: {monitored_names}")
    logging.info(f"Risk indicators: {risk_indicators}")
    
    if not llm_response:
        logging.warning("No LLM response received")
        return []
    
    # Parse LLM response
    try:
        cleaned_response = llm_response.strip()
        
        # Handle markdown code blocks
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]
        
        # Find the end of the JSON block (before any explanation)
        json_end = cleaned_response.find('```')
        if json_end != -1:
            cleaned_response = cleaned_response[:json_end]
        
        # Also look for explanation markers
        explanation_markers = ['### Explanation:', '## Explanation:', '# Explanation:', 'Explanation:']
        for marker in explanation_markers:
            explanation_start = cleaned_response.find(marker)
            if explanation_start != -1:
                cleaned_response = cleaned_response[:explanation_start]
        
        cleaned_response = cleaned_response.strip()
        
        parsed = json.loads(cleaned_response)
        alerts = parsed.get("alerts", [])
        
        # Format alerts for frontend
        formatted_alerts = []
        for i, alert in enumerate(alerts):
            formatted_alerts.append({
                "id": f"alert_{i + 1}",
                "title": alert.get("title", f"Risk Alert for {alert.get('entity_name', 'Unknown')}"),
                "description": alert.get("description", ""),
                "timestamp": datetime.now().isoformat(),
                "risk_score": alert.get("risk_score", 0.0),
                "is_active": True,
                "entity_name": alert.get("entity_name", "Unknown"),
                "evidence": alert.get("evidence", ""),
                "risk_indicator": alert.get("risk_indicator", "")
            })
        
        return formatted_alerts
        
    except json.JSONDecodeError:
        logging.warning("Failed to parse entity risk alerts LLM response as JSON")
        return []


def perform_risk_monitoring(
    graph, 
    document_name: str, 
    monitored_names: List[str], 
    risk_indicators: List[str], 
    risk_threshold: float = 0.7, 
    model: str = "gpt-4", 
    mode: str = None
) -> Dict[str, Any]:
    """
    Monitor a document for specific names and risk indicators.
    
    Args:
        graph: Database connection
        document_name: Name of the document to monitor
        monitored_names: List of names to monitor
        risk_indicators: List of risk indicators to check
        risk_threshold: Risk score threshold for alerts
        model: LLM model to use
        mode: Processing mode
        write_access: User write permissions
    
    Returns:
        dict: Risk monitoring results with alerts and analysis
    """
    try:
        # 1. Validate document exists
        document_info = validate_document_exists(graph, document_name)
        if not document_info:
            return {
                "success": False,
                "error": f"Document '{document_name}' not found",
                "info": {"document_name": document_name}
            }
        
        # 2. Extract document content and chunks
        document_chunks = extract_document_chunks(graph, document_name)
        if not document_chunks:
            return {
                "success": False,
                "error": f"No content found in document '{document_name}'",
                "info": {"document_name": document_name}
            }
        
        # 3. Generate entity-based risk alerts
        alerts = generate_entity_risk_alerts(
            document_chunks,
            monitored_names,
            risk_indicators,
            risk_threshold,
            model
        )
        
        # 4. Format results for frontend (matching MonitoringResult interface)
        formatted_results = {
            "success": True,
            "document_name": document_name,
            "alerts": alerts,
            "debug_info": {
                "chunks_analyzed": len(document_chunks),
                "monitored_names": monitored_names,
                "risk_indicators": risk_indicators,
                "alerts_generated": len(alerts)
            }
        }
        
        return formatted_results
        
    except Exception as e:
        logging.error(f"Error in perform_risk_monitoring: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "document_name": document_name,
            "alerts": []
        }
