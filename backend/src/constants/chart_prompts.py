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
1. Use READ-ONLY operations (MATCH, RETURN, WITH, WHERE, ORDER BY, etc.)
2. NO write operations (CREATE, DELETE, SET, REMOVE, MERGE, etc.)
3. Return data in a format suitable for visualization
4. Use appropriate LIMIT to balance performance and completeness
5. Complex queries are allowed - use WITH, aggregation functions, and subqueries as needed
6. For multiple data series, use UNION ALL to combine results
7. Use meaningful column names that describe the data

Based on the user's question, generate an appropriate Cypher query that will return data suitable for visualization.

EXAMPLES OF FLEXIBLE QUERIES:

Simple counts:
MATCH (n) RETURN labels(n)[0] as NodeType, count(*) as Count ORDER BY Count DESC

Complex aggregations:
MATCH (n)-[r]->(m) 
WITH type(r) as RelationshipType, count(r) as Count
RETURN RelationshipType, Count ORDER BY Count DESC

Multiple data series:
MATCH (n:Person) RETURN 'Person' as Category, count(n) as Count
UNION ALL
MATCH (n:Organization) RETURN 'Organization' as Category, count(n) as Count

Time-based analysis:
MATCH (n) 
WHERE n.created_at IS NOT NULL
RETURN date(n.created_at) as Date, count(n) as Count
ORDER BY Date

Relationship analysis:
MATCH (a)-[r]->(b)
RETURN labels(a)[0] as SourceType, type(r) as RelationshipType, labels(b)[0] as TargetType, count(r) as Count
ORDER BY Count DESC

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

IMPORTANT: 
- For single-series data (like counts by category), use the "name" and "value" format in chartData
- For multi-series data, use the appropriate format shown in examples
- For time-series data, use "date" or "time" as the x-axis and numeric values for y-axis
- For relationship data, include both source and target information
- Use meaningful labels that clearly describe what the data represents

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

For bar charts (multi-series with categories):
{{
  "chartConfig": {{
    "sales": {{ "label": "Sales", "color": "#2563eb" }},
    "revenue": {{ "label": "Revenue", "color": "#60a5fa" }}
  }},
  "chartData": [
    {{ "name": "Q1", "sales": 186, "revenue": 80 }},
    {{ "name": "Q2", "sales": 305, "revenue": 200 }}
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
