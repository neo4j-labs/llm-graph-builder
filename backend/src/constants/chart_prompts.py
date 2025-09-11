"""
Chart generation prompts for MCP Neo4j integration
Contains LLM prompts for generating Cypher queries and formatting chart data
"""

def create_cypher_query_prompt(query: str, schema_info: dict = None) -> str:
    """Create a prompt for generating Cypher queries from natural language"""
    schema_text = ""
    if schema_info:
        labels = ", ".join(schema_info.get('labels', []))
        relationships = ", ".join(schema_info.get('relationship_types', []))
        properties = ", ".join(schema_info.get('property_keys', []))
        
        schema_text = f"""
Database Schema:
- Node Labels: {labels}
- Relationship Types: {relationships}
- Property Keys: {properties}

"""
    
    return f"""{schema_text}User Question: {query}

Based on the user's question, generate a Cypher query that will return data suitable for visualization.

Return only the Cypher query, no explanations or markdown formatting."""

def create_chart_formatting_prompt(query: str, chart_type: str, raw_data: list) -> str:
    """Create a prompt for formatting Neo4j data into chart-ready format with colors"""
    import json
    raw_data_json = json.dumps(raw_data, indent=2)
    
    return f"""Original Query: {query}
Chart Type: {chart_type}

Raw Neo4j Data:
{raw_data_json}

Based on the original query and the raw data above, format this data for {chart_type} chart visualization.

IMPORTANT: Generate bright, vibrant, and visually appealing colors for each data series. Use a diverse color palette with good contrast. Choose colors that are:
- Bright and eye-catching
- Visually distinct from each other
- Complementary when possible
- Professional yet vibrant

Return a JSON object with this structure:
{{
    "chartData": [
        {{
            "name": "Data Point Name",
            "value": 123
        }}
    ],
    "chartConfig": {{
        // Color configuration for each data series - USE DIFFERENT BRIGHT COLORS
        "category_name": {{
            "label": "Display Name",
            "color": "#HEX_COLOR"  // Generate a bright, vibrant hex color
        }}
    }}
}}

IMPORTANT: Each item in chartData MUST have "name" and "value" fields exactly as shown above.

Examples of good colors to inspire you (but generate your own unique colors):
- Bright coral: #FF6B6B
- Electric blue: #4ECDC4
- Vibrant purple: #8B5CF6
- Neon green: #10B981
- Sunset orange: #F59E0B
- Hot pink: #EC4899

Return only the JSON object, no explanations or markdown formatting."""
