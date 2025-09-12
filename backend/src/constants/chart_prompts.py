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

IMPORTANT RULES FOR CYPHER QUERIES:
1. Use ONLY MATCH statements - no CREATE, DELETE, SET, REMOVE, etc.
2. NO UNION or UNION ALL - use separate queries if needed
3. Return data in format: NodeType, Count (for counts) or Name, Value (for values)
4. Keep queries simple and focused on data retrieval
5. Use LIMIT to avoid large result sets

Based on the user's question, generate a simple MATCH query that will return data suitable for visualization.

Return only the Cypher query, no explanations or markdown formatting."""

def create_chart_formatting_prompt(query: str, raw_data: list) -> str:
    """Create a prompt for generating structured chart data and config"""
    import json
    raw_data_json = json.dumps(raw_data, indent=2)
    
    return f"""You are a helpful assistant that works with Neo4j databases. You can help with schema discovery, running Cypher queries, and data manipulation.

User requirement: {query}

IMPORTANT: Analyze the user requirement to determine the most appropriate chart type:
- Use "pie" for: pie charts, pie chart, proportions, percentages, parts of a whole, distribution
- Use "bar" for: bar charts, bar chart, comparisons, categories, rankings, counts
- Use "line" for: line charts, line chart, trends, time series, changes over time, progression

Given the user requirement and the data below, return a JSON object that would be used for data visualization. It should include the chartConfig and the chartData in a single object. Feel free to pick appropriate colors and labels for your chartConfig.

IMPORTANT: For single-series data (like counts by category), use the "name" and "value" format in chartData. For multi-series data, use the appropriate format shown in examples.

DATA: {raw_data_json}

Examples of responses:

For pie charts:
{{
  "chartConfig": {{
    "Desktop": {{ "label": "Desktop", "color": "#2563eb" }},
    "Mobile": {{ "label": "Mobile", "color": "#60a5fa" }}
  }},
  "chartData": [
    {{ "name": "Desktop", "value": 186 }},
    {{ "name": "Mobile", "value": 80 }}
  ],
  "type": "pie"
}}

For bar charts (single series):
{{
  "chartConfig": {{
    "Desktop": {{ "label": "Desktop", "color": "#2563eb" }},
    "Mobile": {{ "label": "Mobile", "color": "#60a5fa" }}
  }},
  "chartData": [
    {{ "name": "Desktop", "value": 186 }},
    {{ "name": "Mobile", "value": 80 }}
  ],
  "type": "bar"
}}

For bar charts (multi-series):
{{
  "chartConfig": {{
    "desktop": {{ "label": "Desktop", "color": "#2563eb" }},
    "mobile": {{ "label": "Mobile", "color": "#60a5fa" }}
  }},
  "chartData": [
    {{ "month": "January", "desktop": 186, "mobile": 80 }},
    {{ "month": "February", "desktop": 305, "mobile": 200 }}
  ],
  "type": "bar"
}}

For line charts:
{{
  "chartConfig": {{
    "sales": {{ "label": "Sales", "color": "#2563eb" }},
    "revenue": {{ "label": "Revenue", "color": "#60a5fa" }}
  }},
  "chartData": [
    {{ "month": "January", "sales": 186, "revenue": 80 }},
    {{ "month": "February", "sales": 305, "revenue": 200 }}
  ],
  "type": "line"
}}

Return ONLY valid JSON with no explanations or markdown formatting. Use the actual data provided above and choose the most appropriate chart type based on the user requirement."""
