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
from src.mcp_config import get_mcp_config, get_server_url, should_start_local_process, get_timeout

logger = logging.getLogger(__name__)

class MCPNeo4jService:
    """Service for MCP Neo4j integration"""
    
    def __init__(self):
        """Initialize the MCP service"""
        self.mcp_process = None
        self.http_client = None
        self.config = get_mcp_config()
        self.server_url = get_server_url()
        self.openai_client = None
        logger.info(f"MCP Service initialized: {self.config.get_description()}")
    
    async def _init_http_client(self):
        """Initialize HTTP client"""
        if not self.http_client:
            self.http_client = httpx.AsyncClient(timeout=get_timeout())
            logger.info("HTTP client initialized")
    
    async def start_mcp_server(self, neo4j_config: Dict[str, str]) -> bool:
        """Start the MCP Neo4j server as a subprocess (only for local mode)"""
        if not should_start_local_process():
            logger.info("Using remote MCP server, skipping local process start")
            # Initialize HTTP client for remote server
            self.http_client = httpx.AsyncClient(timeout=get_timeout())
            logger.info("HTTP client initialized for remote MCP server")
            return True
            
        try:
            # Get command line arguments from config
            cmd = self.config.get_local_server_args(neo4j_config)
            
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
            self.http_client = httpx.AsyncClient(timeout=get_timeout())
            
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
            
            # Use different tool names for local vs remote servers
            tool_name = "read_neo4j_cypher" if self.config.use_local_process else "neo4j-mcp-read_neo4j_cypher"
            
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
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
                timeout=get_timeout()
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
            
            # Use different tool names for local vs remote servers
            tool_name = "get_neo4j_schema" if self.config.use_local_process else "neo4j-mcp-get_neo4j_schema"
            
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
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
    
    def _create_query_prompt(self, query: str, schema: Dict[str, Any]) -> str:
        """Create a prompt for OpenAI to generate Cypher queries"""
        schema_info = None
        if schema and schema.get("success"):
            schema_data = schema["schema"]
            schema_info = {
                'labels': list(schema_data.keys()) if isinstance(schema_data, dict) else [],
                'relationship_types': [],
                'property_keys': []
            }
        
        return create_cypher_query_prompt(query, schema_info)
    
    async def process_natural_language_query(self, query: str, openai_api_key: str = None, model: str = "gpt-4") -> Dict[str, Any]:
        """Process natural language query and generate SVG chart"""
        try:
            if not self.http_client:
                raise Exception("HTTP client not initialized")
            
            # Initialize OpenAI client if not already done
            if not self.openai_client:
                self.openai_client = openai.OpenAI(api_key=openai_api_key)
            
            # Get database schema for context
            schema = await self.get_database_schema()
            
            # Create prompt for OpenAI
            prompt = self._create_query_prompt(query, schema)
            
            # Call OpenAI to generate Cypher query
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Neo4j Cypher query expert. Generate accurate Cypher queries based on the database schema and user questions."
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
                # Check if we got actual data or an error message
                data = query_result["data"]
                if isinstance(data, list) and len(data) > 0 and not any("Error" in str(item) for item in data):
                    # Generate complete React component using LLM
                    logger.info(f"Query successful, generating React component for {len(data)} data points")
                    chart_artifact = self._generate_react_component(query, data, openai_api_key, model)
                    logger.info(f"Chart artifact result: {chart_artifact}")
                    
                    # Check if LLM generation was successful
                    if chart_artifact and not chart_artifact.get("error"):
                        return {
                            "success": True,
                            "natural_language_query": query,
                            "cypher_query": cypher_query,
                            "chartData": chart_artifact.get("chartData"),
                            "chartConfig": chart_artifact.get("chartConfig"),
                            "chartType": chart_artifact.get("chartType"),
                            "raw_data": data
                        }
                    else:
                        # LLM failed, try fallback chart generation
                        logger.warning(f"LLM chart generation failed: {chart_artifact.get('error', 'Unknown error')}. Using fallback chart generation...")
                        fallback_chart = self._create_fallback_chart_data(query, data)
                        return {
                            "success": True,
                            "natural_language_query": query,
                            "cypher_query": cypher_query,
                            "chartData": fallback_chart.get("chartData"),
                            "chartConfig": fallback_chart.get("chartConfig"),
                            "chartType": fallback_chart.get("chartType"),
                            "raw_data": data
                        }
                else:
                    # Query returned errors, try simpler fallback query
                    logger.warning(f"Query returned error data: {data}. Trying simpler fallback query...")
                    fallback_query = "MATCH (n) RETURN labels(n)[0] as name, count(*) as count LIMIT 10"
                    fallback_result = await self.execute_cypher_query(fallback_query)
                    
                    if fallback_result["success"]:
                        # Try LLM generation first with fallback data
                        chart_artifact = self._generate_react_component(query, fallback_result["data"], openai_api_key, model)
                        if chart_artifact and not chart_artifact.get("error"):
                            return {
                                "success": True,
                                "natural_language_query": query,
                                "cypher_query": f"{cypher_query} (fallback: {fallback_query})",
                                "chartData": chart_artifact.get("chartData"),
                                "chartConfig": chart_artifact.get("chartConfig"),
                                "chartType": chart_artifact.get("chartType"),
                                "raw_data": fallback_result["data"]
                            }
                        else:
                            # Use fallback chart generation
                            fallback_chart = self._create_fallback_chart_data(query, fallback_result["data"])
                            return {
                                "success": True,
                                "natural_language_query": query,
                                "cypher_query": f"{cypher_query} (fallback: {fallback_query})",
                                "chartData": fallback_chart.get("chartData"),
                                "chartConfig": fallback_chart.get("chartConfig"),
                                "chartType": fallback_chart.get("chartType"),
                                "raw_data": fallback_result["data"]
                            }
                    else:
                        return {
                            "success": False,
                            "natural_language_query": query,
                            "cypher_query": cypher_query,
                            "error": f"Query failed: {query_result.get('error', 'Unknown error')}"
                        }
            else:
                # Try a fallback simple query if the complex one failed
                logger.warning(f"Complex query failed: {query_result['error']}. Trying fallback query...")
                fallback_query = "MATCH (n) RETURN labels(n)[0] as name, count(*) as count LIMIT 10"
                fallback_result = await self.execute_cypher_query(fallback_query)
                
                if fallback_result["success"]:
                    chart_artifact = self._generate_react_component(query, fallback_result["data"], openai_api_key, model)
                    return {
                        "success": True,
                        "natural_language_query": query,
                        "cypher_query": f"{cypher_query} (fallback: {fallback_query})",
                        "chartData": chart_artifact.get("chartData"),
                        "chartConfig": chart_artifact.get("chartConfig"),
                        "chartType": chart_artifact.get("chartType"),
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
    
    def _generate_react_component(self, query: str, raw_data: List[Dict], openai_api_key: str, model: str) -> Dict[str, Any]:
        """Generate structured chart data and config using LLM"""
        try:
            if not raw_data:
                return {"error": "No data available"}
            
            # Use all the data - don't limit it
            logger.info(f"Using all data: {len(raw_data)} items")
            
            # Create prompt for LLM to generate structured data
            prompt = create_chart_formatting_prompt(query, raw_data)
            
            # Initialize OpenAI client if not already done
            if not self.openai_client:
                self.openai_client = openai.OpenAI(api_key=openai_api_key)
            
            # Call OpenAI to generate structured chart data with retry logic
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    response = self.openai_client.chat.completions.create(
                        model=model,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a data visualization expert. Generate structured chart data and configuration in JSON format."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        temperature=0.1,
                        max_tokens=1500
                    )
                    break  # Success, exit retry loop
                except Exception as e:
                    if attempt == max_retries - 1:
                        logger.error(f"OpenAI API call failed after {max_retries} attempts: {e}")
                        return {"error": f"OpenAI API call failed: {str(e)}"}
                    else:
                        logger.warning(f"OpenAI API call attempt {attempt + 1} failed: {e}. Retrying...")
                        continue
            
            # Extract the JSON response
            json_content = response.choices[0].message.content.strip()
            
            logger.info(f"Raw LLM response length: {len(json_content)}")
            logger.info(f"Raw LLM response first 200 chars: {json_content[:200]}")
            
            # Clean up the response (remove any markdown formatting)
            if json_content.startswith("```json"):
                json_content = json_content[7:]
            elif json_content.startswith("```"):
                json_content = json_content[3:]
            if json_content.endswith("```"):
                json_content = json_content[:-3]
            
            json_content = json_content.strip()
            
            logger.info(f"Cleaned LLM response length: {len(json_content)}")
            logger.info(f"Cleaned LLM response first 200 chars: {json_content[:200]}")
            
            # Parse the JSON response
            try:
                chart_data = json.loads(json_content)
                logger.info("✅ Successfully parsed JSON response")
                
                # Validate the structure
                if "chartData" not in chart_data or "chartConfig" not in chart_data:
                    raise ValueError("Missing required fields: chartData or chartConfig")
                
                # Debug: Check for list values in chartData
                for i, item in enumerate(chart_data["chartData"]):
                    if not isinstance(item, dict):
                        logger.warning(f"chartData item {i} is not a dict: {item}")
                        continue
                    for key, value in item.items():
                        if isinstance(value, list):
                            logger.warning(f"chartData item {i} has list value for key '{key}': {value}")
                
                # Validate and ensure data format matches frontend expectations
                validated_data = self._validate_chart_data(chart_data["chartData"], chart_data.get("type", "bar"))
                
                return {
                    "chartData": validated_data,
                    "chartConfig": chart_data["chartConfig"],
                    "chartType": chart_data.get("type", "bar")
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Response content: {json_content}")
                
                # Fallback: create simple structured data
                return self._create_fallback_chart_data(query, raw_data)
            
        except Exception as e:
            logger.error(f"Error generating chart data: {e}")
            return {"error": f"Failed to generate chart: {str(e)}"}
    
    def _create_fallback_chart_data(self, query: str, raw_data: List[Dict]) -> Dict[str, Any]:
        """Create simple fallback chart data when LLM fails"""
        try:
            logger.info(f"Creating fallback chart data for query: {query}")
            
            # Determine chart type from query
            chart_type = self._infer_chart_type_from_query(query)
            
            if not raw_data:
                return {
                    "chartData": [{"name": "No Data", "value": 0}],
                    "chartConfig": {"No Data": {"label": "No Data", "color": "#94a3b8"}},
                    "chartType": chart_type
                }
            
            # Process raw data into simple format
            chart_data = []
            chart_config = {}
            colors = ["#2563eb", "#60a5fa", "#93c5fd", "#dbeafe", "#1e40af", "#1d4ed8"]
            
            for i, item in enumerate(raw_data[:20]):  # Increased limit for more data
                # Try multiple possible name fields
                name = (item.get("name") or item.get("NodeType") or item.get("RelationshipType") or 
                       item.get("Category") or item.get("SourceType") or item.get("TargetType") or 
                       item.get("Date") or item.get("Type") or f"Item {i+1}")
                
                # Try multiple possible value fields
                value = (item.get("count") or item.get("Count") or item.get("value") or 
                        item.get("Value") or item.get("Total") or item.get("Amount") or 0)
                
                # Ensure name is a string, not a list
                if isinstance(name, list):
                    name = str(name[0]) if name else f"Item {i+1}"
                elif not isinstance(name, str):
                    name = str(name) if name else f"Item {i+1}"
                
                # Ensure value is a number
                if not isinstance(value, (int, float)):
                    try:
                        value = float(value) if value else 0
                    except (ValueError, TypeError):
                        value = 0
                
                # Ensure data format matches frontend expectations
                chart_data.append({"name": name, "value": value})
                chart_config[name] = {
                    "label": name,
                    "color": colors[i % len(colors)]
                }
            
            # Validate the generated data
            validated_data = self._validate_chart_data(chart_data, chart_type)
            
            return {
                "chartData": validated_data,
                "chartConfig": chart_config,
                "chartType": chart_type
            }
            
        except Exception as e:
            logger.error(f"Error creating fallback chart data: {e}")
            logger.error(f"Raw data that caused error: {raw_data}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "chartData": [{"name": "Error", "value": 0}],
                "chartConfig": {"Error": {"label": "Error", "color": "#ef4444"}},
                "chartType": self._infer_chart_type_from_query(query)
            }
    
    def _validate_chart_data(self, data: List[Dict], chart_type: str) -> List[Dict]:
        """Validate and ensure chart data matches frontend expectations"""
        if not data or not isinstance(data, list):
            return []
        
        validated_data = []
        for item in data:
            if not isinstance(item, dict):
                continue
                
            # Ensure each item has the required structure for frontend
            validated_item = {}
            
            # For pie charts, ensure name and value
            if chart_type == "pie":
                validated_item["name"] = str(item.get("name", item.get("NodeType", "Unknown")))
                validated_item["value"] = float(item.get("value", item.get("Count", item.get("count", 0))))
            
            # For bar/line charts, preserve the structure but ensure proper types
            else:
                for key, value in item.items():
                    if isinstance(value, (int, float)):
                        validated_item[key] = float(value)
                    elif isinstance(value, str):
                        validated_item[key] = value
                    elif isinstance(value, list):
                        # Convert lists to strings for display
                        validated_item[key] = str(value[0]) if value else ""
                    else:
                        validated_item[key] = str(value) if value is not None else ""
            
            validated_data.append(validated_item)
        
        return validated_data
    
    def _infer_chart_type_from_query(self, query: str) -> str:
        """Infer chart type from user query"""
        query_lower = query.lower()
        
        # Check for pie chart keywords
        pie_keywords = ["pie", "proportion", "percentage", "part", "whole", "distribution", "share"]
        if any(keyword in query_lower for keyword in pie_keywords):
            return "pie"
        
        # Check for line chart keywords
        line_keywords = ["line", "trend", "time", "series", "change", "over time", "progression", "growth", "decline"]
        if any(keyword in query_lower for keyword in line_keywords):
            return "line"
        
        # Default to bar chart for comparisons, categories, rankings, counts
        return "bar"
    
    def _create_fallback_react_component(self, query: str, raw_data: List[Dict]) -> str:
        """Create a simple fallback React component when LLM fails"""
        try:
            logger.info(f"Creating fallback React component for query: {query}")
            logger.info(f"Raw data length: {len(raw_data) if raw_data else 0}")
            
            if not raw_data:
                logger.error("No raw data available for fallback component")
                return None
            
            # Process the data
            chart_data = []
            for i, row in enumerate(raw_data[:20]):  # Limit to first 20 items
                logger.info(f"Processing row {i}: {row}")
                # Handle different field names
                name = row.get('name') or row.get('NodeType') or 'Unknown'
                if isinstance(name, list):
                    name = ' '.join(name) if name else 'Unknown'
                else:
                    name = str(name)
                
                count = row.get('count') or row.get('Count') or row.get('value') or 0
                chart_data.append({'name': name, 'value': count})
                logger.info(f"Processed: name='{name}', value={count}")
            
            logger.info(f"Final chart_data: {chart_data}")
            
            if not chart_data:
                logger.error("No chart data generated from raw data")
                return None
            
            # Generate colors
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
            
            # Create React component using React.createElement
            react_component = f'''// Note: React and Recharts are already imported in the iframe
const ChartComponent = () => {{
  const data = {chart_data};
  
  return React.createElement('div', {{ className: 'w-full h-full p-4 bg-white rounded-lg shadow-lg' }},
    React.createElement('h3', {{ className: 'text-xl font-bold text-gray-800 mb-4 text-center' }}, '{query}'),
    React.createElement(ResponsiveContainer, {{ width: '100%', height: 400 }},
      React.createElement(BarChart, {{ data: data, margin: {{ top: 5, right: 30, left: 20, bottom: 5 }} }},
        React.createElement(CartesianGrid, {{ strokeDasharray: '3 3' }}),
        React.createElement(XAxis, {{ 
          dataKey: 'name',
          angle: -45,
          textAnchor: 'end',
          height: 80,
          interval: 0
        }}),
        React.createElement(YAxis),
        React.createElement(Tooltip),
        React.createElement(Legend),
        React.createElement(Bar, {{ 
          dataKey: 'value',
          fill: '#8884d8',
          radius: [4, 4, 0, 0]
        }})
      )
    )
  );
}};'''
            
            return react_component
            
        except Exception as e:
            logger.error(f"Error creating fallback React component: {e}")
            return None
    
    def _fix_jsx_syntax(self, react_content: str) -> str:
        """Fix common JSX syntax issues in React components"""
        try:
            # Fix missing quotes around JSX attributes
            import re
            
            # Fix height={400} -> height={{400}}
            react_content = re.sub(r'height=(\d+)', r'height={{\1}}', react_content)
            react_content = re.sub(r'width=(\d+)', r'width={{\1}}', react_content)
            react_content = re.sub(r'angle=(-?\d+)', r'angle={{\1}}', react_content)
            react_content = re.sub(r'interval=(\d+)', r'interval={{\1}}', react_content)
            
            # Fix radius=[4, 4, 0, 0] -> radius={{[4, 4, 0, 0]}}
            react_content = re.sub(r'radius=\[([^\]]+)\]', r'radius={{\[\1\]}}', react_content)
            
            # Fix data={data} -> data={{data}}
            react_content = re.sub(r'data=\{data\}', r'data={{{data}}}', react_content)
            
            # Fix margin={{ top: 5, right: 30, left: 20, bottom: 5 }} -> margin={{{ top: 5, right: 30, left: 20, bottom: 5 }}}
            react_content = re.sub(r'margin=\{\{([^}]+)\}\}', r'margin={{{{\1}}}}', react_content)
            
            return react_content
            
        except Exception as e:
            logger.error(f"Error fixing JSX syntax: {e}")
            return react_content
    
    def _remove_import_statements(self, react_content: str) -> str:
        """Remove any import statements from the React component"""
        try:
            import re
            
            # Remove import statements
            react_content = re.sub(r'^import\s+.*?from\s+[\'"][^\'"]+[\'"];?\s*$', '', react_content, flags=re.MULTILINE)
            react_content = re.sub(r'^import\s+[\'"][^\'"]+[\'"];?\s*$', '', react_content, flags=re.MULTILINE)
            
            # Remove export statements
            react_content = re.sub(r'^export\s+.*?;?\s*$', '', react_content, flags=re.MULTILINE)
            
            # Clean up extra whitespace
            react_content = re.sub(r'\n\s*\n\s*\n', '\n\n', react_content)
            react_content = react_content.strip()
            
            logger.info(f"Removed import/export statements. New length: {len(react_content)}")
            
            return react_content
            
        except Exception as e:
            logger.error(f"Error removing import statements: {e}")
            return react_content
    
    def _convert_jsx_to_react_create_element(self, react_content: str) -> str:
        """Convert JSX syntax to React.createElement calls"""
        try:
            import re
            
            # Check if the content contains JSX syntax
            if '<' in react_content and '>' in react_content:
                logger.warning("JSX syntax detected, attempting to convert to React.createElement")
                
                # This is a basic conversion - for complex JSX, we might need a more sophisticated approach
                # For now, we'll just log a warning and return the content as-is
                # The iframe should handle JSX with Babel transpilation
                
                logger.info("JSX detected but keeping as-is for Babel transpilation")
                return react_content
            
            return react_content
            
        except Exception as e:
            logger.error(f"Error converting JSX to React.createElement: {e}")
            return react_content

# Global MCP service instance
mcp_service = MCPNeo4jService()
