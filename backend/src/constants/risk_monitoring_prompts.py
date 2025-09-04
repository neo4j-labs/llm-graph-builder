"""
Constants for Risk Monitoring System
Contains LLM prompts and risk level definitions
"""

RISK_MONITORING_PROMPTS = {
    "NAME_MONITORING": """
    You are a risk monitoring specialist. Analyze ONLY the provided document content for the presence of these specific names: {monitored_names}
    
    IMPORTANT: Only report names that are EXPLICITLY mentioned in the document content below. Do NOT use external knowledge or make assumptions.
    
    Document Content:
    {document_content}
    
    For each name found, provide:
    1. Exact occurrences and locations
    2. Context around each occurrence
    3. Any risk indicators associated with the name
    4. Risk score (0.0 to 1.0) based on context and associations
    
    If no names are found, return an empty names_found array.
    
    Respond in this JSON format:
    {{
        "names_found": [
            {{
                "name": "John Doe",
                "occurrences": [
                    {{
                        "chunk": 1,
                        "context": "John Doe was mentioned in connection with...",
                        "risk_indicators": ["financial", "regulatory"],
                        "risk_score": 0.8
                    }}
                ],
                "overall_risk_score": 0.8
            }}
        ]
    }}
    """,
    
    "RISK_ANALYSIS": """
    You are a risk assessment specialist. Analyze ONLY the provided document content for these risk indicators: {risk_indicators}
    
    IMPORTANT: Only report risk indicators that are EXPLICITLY mentioned or clearly evident in the document content below. Do NOT use external knowledge or make assumptions.
    
    Document Content:
    {document_content}
    
    For each risk indicator found, provide:
    1. Evidence and context
    2. Severity assessment
    3. Risk score (0.0 to 1.0)
    4. Potential impact
    
    If no risk indicators are found, return an empty indicators_found array.
    
    Respond in this JSON format:
    {{
        "indicators_found": [
            {{
                "indicator": "financial_fraud",
                "evidence": "Mention of suspicious financial transactions...",
                "severity": "high",
                "risk_score": 0.9,
                "impact": "Potential financial loss and regulatory violations"
            }}
        ]
    }}
    """,
    
    "RISK_SUMMARY": """
    You are a risk analyst. Based on the following monitoring results, provide a comprehensive risk assessment summary.
    
    Name Monitoring Results: {name_monitoring_results}
    Risk Indicator Analysis: {risk_analysis_results}
    
    Provide:
    1. Overall risk assessment
    2. Key risk factors
    3. Recommended actions
    4. Priority level
    
    Respond in clear, actionable language suitable for risk management teams.
    """
}

RISK_LEVELS = {
    "LOW": {"min": 0.0, "max": 0.3, "color": "green", "action": "Monitor"},
    "MEDIUM": {"min": 0.3, "max": 0.7, "color": "yellow", "action": "Review"},
    "HIGH": {"min": 0.7, "max": 1.0, "color": "red", "action": "Immediate Action Required"}
}
