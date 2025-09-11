"""
MCP Neo4j Service for NRC MVP
Provides natural language query processing and chart generation using MCP Neo4j server
"""

import asyncio
import json
import logging
import subprocess
import httpx
from typing import Dict, Any, List, Optional
import openai
from datetime import datetime
from src.constants.chart_prompts import create_cypher_query_prompt, create_chart_formatting_prompt

logger = logging.getLogger(__name__)

# Random color generation for fallback scenarios
def generate_random_color():
    """Generate a random bright color"""
    import random
    # Generate random RGB values with higher saturation for bright colors
    r = random.randint(100, 255)
    g = random.randint(100, 255)
    b = random.randint(100, 255)
    return f"#{r:02x}{g:02x}{b:02x}"

class MCPNeo4jService:
    """Service for MCP Neo4j integration"""
    
    def __init__(self):
        """Initialize the MCP service"""
        self.mcp_process = None
        self.http_client = None
        self.server_url = "http://localhost:8001/api/mcp/"
        self.openai_client = None
        
    async def start_mcp_server(self, neo4j_config: Dict[str, str]) -> bool:
        """Start the MCP Neo4j server as a subprocess"""
        try:
            # Start the MCP server process with command line arguments
            cmd = [
                "mcp-neo4j-cypher",
                "--transport", "http",
                "--server-host", "127.0.0.1",
                "--server-port", "8001",  # Use different port to avoid conflict with FastAPI backend
                "--server-path", "/api/mcp/",
                "--db-url", neo4j_config["uri"],
                "--username", neo4j_config["username"],
                "--password", neo4j_config["password"],
                "--database", neo4j_config["database"]
            ]
            
            logger.info(f"Starting MCP server with command: {' '.join(cmd)}")
            
            self.mcp_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for server to start
            await asyncio.sleep(3)
            
            # Check if process is still running
            if self.mcp_process.poll() is not None:
                stdout, stderr = self.mcp_process.communicate()
                logger.error(f"MCP server process exited early. stdout: {stdout.decode()}, stderr: {stderr.decode()}")
                return False
            
            # Initialize HTTP client
            self.http_client = httpx.AsyncClient(timeout=30.0)
            
            logger.info("MCP Neo4j server started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
            return False
    
    async def stop_mcp_server(self):
        """Stop the MCP server process"""
        if self.mcp_process:
            self.mcp_process.terminate()
            self.mcp_process.wait()
            logger.info("MCP Neo4j server stopped")
        
        if self.http_client:
            await self.http_client.aclose()
    
    def _parse_sse_response(self, sse_text: str) -> Optional[Dict[str, Any]]:
        """Parse Server-Sent Events response format"""
        try:
            logger.info(f"SSE text to parse: {sse_text[:200]}...")
            
            lines = sse_text.strip().split('\n')
            data_line = None
            
            for line in lines:
                if line.startswith('data: '):
                    data_line = line[6:]  # Remove 'data: ' prefix
                    break
            
            if data_line:
                logger.info(f"Found data line: {data_line[:200]}...")
                return json.loads(data_line)
            else:
                logger.error("No data line found in SSE response")
                # Try to parse the entire response as JSON
                try:
                    return json.loads(sse_text)
                except:
                    return None
                
        except Exception as e:
            logger.error(f"Error parsing SSE response: {e}")
            return None
    
    async def execute_cypher_query(self, query: str) -> Dict[str, Any]:
        """Execute a Cypher query via MCP"""
        try:
            if not self.http_client:
                raise Exception("HTTP client not initialized")
            
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "read_neo4j_cypher",
                    "arguments": {
                        "query": query
                    }
                }
            }
            
            response = await self.http_client.post(
                self.server_url,
                json=mcp_request,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                },
                timeout=30.0  # 30 second timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Raw MCP response: {response.text[:500]}...")
                result = self._parse_sse_response(response.text)
                logger.info(f"Parsed SSE result: {result}")
                
                if result and "result" in result:
                    result_content = result["result"]["content"][0]
                    result_data = result_content["text"]
                    logger.info(f"Result data: {result_data[:200]}...")
                    
                    # Check if this is an error response
                    if result_content.get("isError", False) or "Error:" in result_data or "Neo4j Error:" in result_data:
                        logger.error(f"Cypher query error: {result_data}")
                        return {
                            "success": False,
                            "error": f"Cypher query failed: {result_data}",
                            "query": query
                        }
                    
                    try:
                        parsed_data = json.loads(result_data)
                        return {
                            "success": True,
                            "data": parsed_data,
                            "query": query
                        }
                    except json.JSONDecodeError:
                        # If it's not JSON, treat as raw text data
                        return {
                            "success": True,
                            "data": [{"value": result_data, "type": "text"}],
                            "query": query
                        }
                elif result and "error" in result:
                    return {
                        "success": False,
                        "error": result["error"],
                        "query": query
                    }
                else:
                    logger.error(f"No valid result in MCP response: {result}")
                    return {
                        "success": False,
                        "error": "No valid result in MCP response",
                        "query": query
                    }
            
            return {
                "success": False,
                "error": f"HTTP request failed: {response.text}",
                "query": query
            }
            
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower():
                logger.error(f"Cypher query timed out: {e}")
                error_msg = "Query execution timed out. Please try a simpler query."
            elif "connection" in error_msg.lower():
                logger.error(f"MCP server connection failed: {e}")
                error_msg = "MCP server connection failed. Please check if the server is running."
            else:
                logger.error(f"Failed to execute Cypher query: {e}")
            
            return {
                "success": False,
                "error": error_msg,
                "query": query
            }
    
    async def get_database_schema(self) -> Dict[str, Any]:
        """Get database schema information via MCP"""
        try:
            if not self.http_client:
                return {"success": False, "error": "HTTP client not initialized"}
            
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "get_neo4j_schema",
                    "arguments": {}
                }
            }
            
            response = await self.http_client.post(
                self.server_url,
                json=mcp_request,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                }
            )
            
            if response.status_code == 200:
                result = self._parse_sse_response(response.text)
                if result and "result" in result:
                    schema = result["result"]["content"][0]["text"]
                    return {
                        "success": True,
                        "schema": json.loads(schema)
                    }
            
            return {
                "success": False,
                "error": f"Failed to get schema: {response.text}"
            }
            
        except Exception as e:
            logger.error(f"Failed to get database schema: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _create_query_prompt(self, query: str, schema: Dict[str, Any], chart_type: str) -> str:
        """Create a prompt for OpenAI to generate Cypher queries using Jinja2 template"""
        schema_info = None
        if schema and schema.get("success"):
            schema_data = schema["schema"]
            schema_info = {
                'labels': list(schema_data.keys()) if isinstance(schema_data, dict) else [],
                'relationship_types': [],
                'property_keys': []
            }
        
        return create_cypher_query_prompt(query, schema_info)
    
    async def process_natural_language_query(self, query: str, chart_type: str, openai_api_key: str, model: str = "gpt-4") -> Dict[str, Any]:
        """Process natural language query and generate chart data"""
        try:
            if not self.http_client:
                raise Exception("HTTP client not initialized")
            
            # Initialize OpenAI client if not already done
            if not self.openai_client:
                self.openai_client = openai.OpenAI(api_key=openai_api_key)
            
            # Get database schema for context
            schema = await self.get_database_schema()
            
            # Create prompt for OpenAI
            prompt = self._create_query_prompt(query, schema, chart_type)
            
            # Call OpenAI to generate Cypher query
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Neo4j Cypher query expert. Generate accurate Cypher queries based on the database schema and user questions. Focus on creating queries that return data suitable for the specified chart type."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            # Extract Cypher query from response
            cypher_query = response.choices[0].message.content.strip()
            
            # Clean up the query (remove markdown formatting if present)
            if cypher_query.startswith("```cypher"):
                cypher_query = cypher_query[9:]
            if cypher_query.startswith("```"):
                cypher_query = cypher_query[3:]
            if cypher_query.endswith("```"):
                cypher_query = cypher_query[:-3]
            
            cypher_query = cypher_query.strip()
            
            logger.info(f"Generated Cypher query: {cypher_query}")
            
            # Execute the query via MCP
            query_result = await self.execute_cypher_query(cypher_query)
            
            if query_result["success"]:
                # Convert query results to chart data using LLM for color generation
                chart_data = await self._convert_to_chart_data_with_llm(query, query_result["data"], chart_type, openai_api_key, model)
                
                return {
                    "success": True,
                    "natural_language_query": query,
                    "cypher_query": cypher_query,
                    "chartType": chart_type,
                    "chartData": chart_data.get("chartData", []),
                    "chartConfig": chart_data.get("chartConfig", {}),
                    "raw_data": query_result["data"]
                }
            else:
                # Try a fallback simple query if the complex one failed
                logger.warning(f"Complex query failed: {query_result['error']}. Trying fallback query...")
                fallback_query = "MATCH (n) RETURN labels(n)[0] as name, count(*) as count LIMIT 10"
                fallback_result = await self.execute_cypher_query(fallback_query)
                
                if fallback_result["success"]:
                    chart_data = await self._convert_to_chart_data_with_llm(query, fallback_result["data"], chart_type, openai_api_key, model)
                    return {
                        "success": True,
                        "natural_language_query": query,
                        "cypher_query": f"{cypher_query} (fallback: {fallback_query})",
                        "chartType": chart_type,
                        "chartData": chart_data.get("chartData", []),
                        "chartConfig": chart_data.get("chartConfig", {}),
                        "raw_data": fallback_result["data"]
                    }
                else:
                    return {
                        "success": False,
                        "natural_language_query": query,
                        "cypher_query": cypher_query,
                        "error": f"Original query failed: {query_result['error']}. Fallback also failed: {fallback_result['error']}"
                    }
            
        except Exception as e:
            logger.error(f"Failed to process natural language query: {e}")
            return {
                "success": False,
                "natural_language_query": query,
                "error": str(e)
            }
    
    async def _convert_to_chart_data_with_llm(self, query: str, raw_data: List[Dict], chart_type: str, openai_api_key: str, model: str) -> Dict[str, Any]:
        """Convert raw query results to chart-specific data format using LLM for color generation"""
        try:
            if not raw_data:
                return {"error": "No data available"}
            
            # Create prompt for LLM to format the data with colors using Jinja2 template
            prompt = create_chart_formatting_prompt(query, chart_type, raw_data)
            
            # Initialize OpenAI client if not already done
            if not self.openai_client:
                self.openai_client = openai.OpenAI(api_key=openai_api_key)
            
            # Call OpenAI to generate formatted chart data with colors
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a data visualization expert. Format data for charts with bright, vibrant colors. Always return valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,  # Higher temperature for more creative colors
                max_tokens=1000
            )
            
            # Extract and parse the JSON response
            chart_data_text = response.choices[0].message.content.strip()
            
            logger.info(f"LLM Response: {chart_data_text[:500]}...")  # Log first 500 chars
            
            # Clean up the response (remove markdown formatting if present)
            if chart_data_text.startswith("```json"):
                chart_data_text = chart_data_text[7:]
            if chart_data_text.startswith("```"):
                chart_data_text = chart_data_text[3:]
            if chart_data_text.endswith("```"):
                chart_data_text = chart_data_text[:-3]
            
            chart_data_text = chart_data_text.strip()
            
            logger.info(f"Cleaned LLM Response: {chart_data_text[:500]}...")  # Log first 500 chars
            
            # Parse the JSON response
            formatted_data = json.loads(chart_data_text)
            
            logger.info(f"Parsed JSON: {formatted_data}")
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"Error converting to chart data with LLM: {e}")
            # Fallback to simple formatting
            return self._convert_to_chart_data(raw_data, chart_type)
    
    def _convert_to_chart_data(self, raw_data: List[Dict], chart_type: str) -> Dict[str, Any]:
        """Convert raw query results to chart-specific data format"""
        try:
            if not raw_data:
                return {"error": "No data available"}
            
            # Extract the first row to understand the data structure
            first_row = raw_data[0] if raw_data else {}
            
            if chart_type.lower() in ["bar", "column"]:
                return self._create_bar_chart_data(raw_data)
            elif chart_type.lower() == "pie":
                return self._create_pie_chart_data(raw_data)
            elif chart_type.lower() == "line":
                return self._create_line_chart_data(raw_data)
            elif chart_type.lower() == "area":
                return self._create_area_chart_data(raw_data)
            elif chart_type.lower() in ["scatter", "scatterplot"]:
                return self._create_scatter_chart_data(raw_data)
            else:
                # Default to bar chart
                return self._create_bar_chart_data(raw_data)
                
        except Exception as e:
            logger.error(f"Error converting to chart data: {e}")
            return {"error": f"Failed to convert data: {str(e)}"}
    
    def _create_bar_chart_data(self, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create bar chart data format"""
        try:
            # Process the data correctly - look for common patterns
            chart_data = []
            chart_config = {}
            
            for row in raw_data:
                # Look for common column patterns
                name_field = None
                value_field = None
                
                # Try to find name and value fields
                for key, value in row.items():
                    if key.lower() in ['name', 'label', 'node', 'type', 'category']:
                        name_field = str(value)
                    elif key.lower() in ['count', 'value', 'amount', 'total']:
                        value_field = value
                
                # If we found both, use them
                if name_field and value_field is not None:
                    chart_data.append({
                        "name": name_field,
                        "value": int(value_field) if isinstance(value_field, (int, float)) else 1
                    })
                    chart_config[name_field] = {
                        "label": name_field,
                        "color": generate_random_color()
                    }
                else:
                    # Fallback: use the first string field as name, first number as value
                    name = None
                    value = 1
                    for key, val in row.items():
                        if isinstance(val, str) and not name:
                            name = val
                        elif isinstance(val, (int, float)) and value == 1:
                            value = int(val)
                    
                    if name:
                        chart_data.append({
                            "name": name,
                            "value": value
                        })
                        chart_config[name] = {
                            "label": name,
                            "color": generate_random_color()
                        }
            
            if not chart_data:
                # Ultimate fallback
                chart_data = [{"name": "Data", "value": len(raw_data)}]
                chart_config = {"Data": {"label": "Data", "color": generate_random_color()}}
            
            return {
                "chartData": chart_data,
                "chartConfig": chart_config
            }
        except Exception as e:
            return {"error": f"Failed to create bar chart data: {str(e)}"}
    
    def _create_pie_chart_data(self, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create pie chart data format"""
        try:
            # Process the data correctly - look for common patterns
            chart_data = []
            chart_config = {}
            
            for row in raw_data:
                # Look for common column patterns
                name_field = None
                value_field = None
                
                # Try to find name and value fields
                for key, value in row.items():
                    if key.lower() in ['name', 'label', 'node', 'type', 'category']:
                        name_field = str(value)
                    elif key.lower() in ['count', 'value', 'amount', 'total']:
                        value_field = value
                
                # If we found both, use them
                if name_field and value_field is not None:
                    chart_data.append({
                        "name": name_field,
                        "value": int(value_field) if isinstance(value_field, (int, float)) else 1
                    })
                    chart_config[name_field] = {
                        "label": name_field,
                        "color": generate_random_color()
                    }
                else:
                    # Fallback: use the first string field as name, first number as value
                    name = None
                    value = 1
                    for key, val in row.items():
                        if isinstance(val, str) and not name:
                            name = val
                        elif isinstance(val, (int, float)) and value == 1:
                            value = int(val)
                    
                    if name:
                        chart_data.append({
                            "name": name,
                            "value": value
                        })
                        chart_config[name] = {
                            "label": name,
                            "color": generate_random_color()
                        }
            
            if not chart_data:
                # Ultimate fallback
                chart_data = [{"name": "Data", "value": len(raw_data)}]
                chart_config = {"Data": {"label": "Data", "color": generate_random_color()}}
            
            return {
                "chartData": chart_data,
                "chartConfig": chart_config
            }
        except Exception as e:
            return {"error": f"Failed to create pie chart data: {str(e)}"}
    
    def _create_line_chart_data(self, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create line chart data format"""
        try:
            labels = []
            values = []
            
            for row in raw_data:
                for key, value in row.items():
                    if isinstance(value, (int, float)):
                        values.append(value)
                        # Try to find a date or label field
                        label = None
                        for k, v in row.items():
                            if k != key and (isinstance(v, str) or isinstance(v, (int, float))):
                                label = str(v)
                                break
                        labels.append(label or f"Point {len(labels) + 1}")
                        break
            
            if not labels:
                labels = [f"Point {i+1}" for i in range(len(raw_data))]
                values = [i+1 for i in range(len(raw_data))]
            
            return {
                "type": "line",
                "data": {
                    "labels": labels,
                    "datasets": [{
                        "label": "Values",
                        "data": values,
                        "borderColor": "rgba(54, 162, 235, 1)",
                        "backgroundColor": "rgba(54, 162, 235, 0.1)",
                        "tension": 0.1
                    }]
                }
            }
        except Exception as e:
            return {"error": f"Failed to create line chart data: {str(e)}"}
    
    def _create_area_chart_data(self, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create area chart data format"""
        try:
            # Similar to line chart but with filled area
            line_data = self._create_line_chart_data(raw_data)
            if "error" in line_data:
                return line_data
            
            line_data["type"] = "area"
            line_data["data"]["datasets"][0]["fill"] = True
            
            return line_data
        except Exception as e:
            return {"error": f"Failed to create area chart data: {str(e)}"}
    
    def _create_scatter_chart_data(self, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create scatter chart data format"""
        try:
            points = []
            
            for row in raw_data:
                x_values = []
                y_values = []
                
                for key, value in row.items():
                    if isinstance(value, (int, float)):
                        if len(x_values) == 0:
                            x_values.append(value)
                        elif len(y_values) == 0:
                            y_values.append(value)
                
                if len(x_values) > 0 and len(y_values) > 0:
                    points.append({"x": x_values[0], "y": y_values[0]})
                elif len(x_values) > 0:
                    points.append({"x": x_values[0], "y": 0})
            
            if not points:
                # Fallback: create simple scatter plot
                points = [{"x": i, "y": i} for i in range(len(raw_data))]
            
            return {
                "type": "scatter",
                "data": {
                    "datasets": [{
                        "label": "Data Points",
                        "data": points,
                        "backgroundColor": "rgba(54, 162, 235, 0.6)",
                        "borderColor": "rgba(54, 162, 235, 1)"
                    }]
                }
            }
        except Exception as e:
            return {"error": f"Failed to create scatter chart data: {str(e)}"}

# Global MCP service instance
mcp_service = MCPNeo4jService()
