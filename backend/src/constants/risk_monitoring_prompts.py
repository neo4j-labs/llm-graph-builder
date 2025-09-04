"""
Constants for Risk Monitoring System
Contains LLM prompts and risk level definitions
"""

RISK_MONITORING_PROMPTS = {
    "ENTITY_RISK_ALERTS": """
    You are a risk monitoring specialist. Analyze the document content for specific entities and risk indicators to generate alerts.
    
    MONITORED ENTITIES: {monitored_names}
    RISK INDICATORS: {risk_indicators}
    RISK THRESHOLD: {risk_threshold}
    
    IMPORTANT RULES:
    1. Only generate alerts for entities that are EXPLICITLY mentioned in the document
    2. Generate a SEPARATE alert for EACH risk indicator found for each entity
    3. If you have 3 risk indicators and only 1 is found, generate 1 alert for that specific indicator
    4. Each alert must be specific to an entity + risk indicator combination
    5. If an entity is not mentioned in the document, do NOT generate any alerts for that entity
    6. Risk score should be based on the severity of the specific risk indicator in relation to the entity
    
    Document Content:
    {document_content}
    
    Generate alerts only for entities that:
    - Are explicitly mentioned in the document
    - Have associated risk indicators found in the document
    - Have a risk score >= {risk_threshold}
    
    Respond in this JSON format:
    {{
        "alerts": [
            {{
                "entity_name": "John Doe",
                "risk_indicator": "financial_fraud",
                "title": "Financial Fraud Risk Alert for John Doe",
                "description": "John Doe mentioned in connection with financial fraud activities involving [specific details from document]",
                "risk_score": 0.8,
                "evidence": "Specific text from document showing the risk"
            }},
            {{
                "entity_name": "John Doe", 
                "risk_indicator": "regulatory_violation",
                "title": "Regulatory Violation Risk Alert for John Doe",
                "description": "John Doe mentioned in connection with regulatory violations involving [specific details from document]",
                "risk_score": 0.6,
                "evidence": "Specific text from document showing the risk"
            }}
        ]
    }}
    
    If no entities are found with risk indicators, return: {{"alerts": []}}
    """
}

RISK_LEVELS = {
    "LOW": {"min": 0.0, "max": 0.3, "color": "green", "action": "Monitor"},
    "MEDIUM": {"min": 0.3, "max": 0.7, "color": "yellow", "action": "Review"},
    "HIGH": {"min": 0.7, "max": 1.0, "color": "red", "action": "Immediate Action Required"}
}
