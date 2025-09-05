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
    
    ANALYSIS APPROACH:
    1. For each monitored entity, check if they are mentioned in the document
    2. For each mentioned entity, analyze their activities, connections, and context
    3. Match entity activities to risk indicators using semantic understanding
    4. Generate alerts for ANY reasonable connection between entity and risk indicator
    
    RISK INDICATOR MATCHING RULES:
    - Use semantic understanding, not just exact word matches
    - Consider related concepts, synonyms, and contextual connections
    - Technology-related activities → "Technology", "Dual-Use Technology Exposure"
    - Business/Corporate activities → "Business", "Organizational structure transparency assessment"
    - Government connections → "Foreign government control indicators", "Foreign government interference indicators"
    - Financial activities → "Financial", "Conflict of interest detection"
    - Military/Defense connections → "Direct/Indirect connections with foreign military entities"
    - Research activities → "Unauthorized knowledge transfer risks", "Intellectual property theft connections"
    
    CONSISTENCY REQUIREMENTS:
    - Be consistent in your analysis approach
    - If an entity has technology connections, flag technology-related indicators
    - If an entity has business connections, flag business-related indicators
    - Use a risk score of 0.3-0.5 for general connections, 0.6-0.8 for specific connections, 0.9+ for direct connections
    
    Document Content:
    {document_content}
    
    Generate alerts for entities that:
    - Are mentioned in the document
    - Have activities/connections that relate to any risk indicator
    - Have a risk score >= {risk_threshold}
    
    Respond in this JSON format:
    {{
        "alerts": [
            {{
                "entity_name": "John Doe",
                "risk_indicator": "Technology",
                "title": "Technology Risk Alert for John Doe",
                "description": "John Doe mentioned in connection with technology-related activities: [specific details from document]",
                "risk_score": 0.7,
                "evidence": "Specific text from document showing the connection"
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
