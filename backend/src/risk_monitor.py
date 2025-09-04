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
        
        # 3. Perform name monitoring
        name_monitoring_results = monitor_names_in_document(
            document_chunks, 
            monitored_names, 
            model
        )
        
        # 4. Perform risk indicator analysis
        risk_analysis_results = analyze_risk_indicators(
            document_chunks, 
            risk_indicators, 
            model
        )
        
        # 5. Generate risk assessment
        risk_assessment = generate_risk_assessment(
            name_monitoring_results,
            risk_analysis_results,
            risk_threshold
        )
        
        # 6. Store risk assessments in PostgreSQL for entities found in document
        stored_assessments = []
        try:
            from src.monitoring_service_pg import MonitoringServicePG
            monitoring_service = MonitoringServicePG()
            
            # Store risk assessment for each monitored entity found in the document
            for name_result in name_monitoring_results.get("names_found", []):
                entity_name = name_result["name"]
                entity_risk_score = name_result.get("overall_risk_score", 0.0)
                
                # Get entity from database
                entity = monitoring_service.get_entity_by_name(entity_name)
                if entity:
                    # Store risk assessment
                    assessment_data = {
                        "risk_score": entity_risk_score,
                        "risk_level": "HIGH" if entity_risk_score >= 0.7 else "MEDIUM" if entity_risk_score >= 0.3 else "LOW",
                        "connections_count": 0,  # Could be enhanced to get actual connection count
                        "risk_indicators": [indicator for occurrence in name_result.get("occurrences", []) for indicator in occurrence.get("risk_indicators", [])]
                    }
                    
                    assessment_id = monitoring_service.store_risk_assessment(entity["id"], assessment_data)
                    stored_assessments.append({
                        "entity_name": entity_name,
                        "entity_id": entity["id"],
                        "assessment_id": assessment_id,
                        "risk_score": entity_risk_score
                    })
                    
                    # Create alert if risk exceeds threshold
                    if entity_risk_score >= entity["risk_threshold"]:
                        alert_message = f"High risk detected for {entity_name} in document {document_name}. Risk score: {entity_risk_score:.2f}"
                        alert_data = {
                            "type": "NAME_RISK",
                            "score": entity_risk_score,
                            "description": alert_message,
                            "name": entity_name,
                            "context": f"Risk detected in document: {document_name}"
                        }
                        alert_id = monitoring_service.create_alert(entity["id"], alert_data)
                        logging.info(f"Created alert {alert_id} for entity {entity_name}")
            
            # Store all LLM-generated alerts in PostgreSQL
            stored_alerts = []
            for alert in risk_assessment.get("alerts", []):
                try:
                    # Get entity for the alert (if it's a name-based alert)
                    entity = None
                    if alert.get("type") == "NAME_RISK" and alert.get("name"):
                        entity = monitoring_service.get_entity_by_name(alert["name"])
                    elif alert.get("type") == "INDICATOR_RISK":
                        # For indicator alerts, we might need to create a generic entity or associate with document
                        # For now, we'll store without entity_id
                        pass
                    
                    if entity:
                        alert_id = monitoring_service.create_alert(entity["id"], alert)
                        stored_alerts.append({
                            "alert_id": alert_id,
                            "type": alert.get("type"),
                            "entity_name": alert.get("name", ""),
                            "score": alert.get("score", 0.0)
                        })
                        logging.info(f"Stored LLM alert {alert_id} in PostgreSQL")
                    else:
                        logging.warning(f"Could not store alert - no entity found: {alert}")
                        
                except Exception as e:
                    logging.error(f"Error storing alert: {str(e)}")
            
            logging.info(f"Stored {len(stored_assessments)} risk assessments and {len(stored_alerts)} alerts in PostgreSQL")
            
        except Exception as e:
            logging.error(f"Error storing risk assessments: {str(e)}")
            # Don't fail the entire process if storage fails
        
        # 7. Format results
        formatted_results = {
            "success": True,
            "document_name": document_name,
            "monitoring_summary": {
                "names_monitored": len(monitored_names),
                "risk_indicators_checked": len(risk_indicators),
                "risk_threshold": risk_threshold,
                "total_risk_score": risk_assessment["overall_risk_score"],
                "alert_required": risk_assessment["alert_required"],
                "entities_found": len(name_monitoring_results.get("names_found", [])),
                "assessments_stored": len(stored_assessments)
            },
            "name_monitoring": name_monitoring_results,
            "risk_analysis": risk_analysis_results,
            "risk_assessment": risk_assessment,
            "alerts": risk_assessment["alerts"],
            "stored_assessments": stored_assessments,
            "info": {
                "processing_time": 0,
                "document_size": document_info.get("size", 0),
                "chunks_analyzed": len(document_chunks),
                "model_used": model
            }
        }
        
        return formatted_results
        
    except Exception as e:
        logging.error(f"Error in perform_risk_monitoring: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "info": {"document_name": document_name}
        }
