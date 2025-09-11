#!/usr/bin/env python3
"""
Standalone MCP Neo4j Integration Test Script

This script tests the MCP Neo4j integration by:
1. Starting the MCP Neo4j server as a subprocess
2. Connecting to it via HTTP transport
3. Executing natural language queries
4. Displaying results in a structured format

Usage:
    python test_mcp_neo4j.py
"""

import asyncio
import json
import logging
import sys
import subprocess
import time
import httpx
from typing import Dict, Any, List
import openai
from config import NEO4J_CONFIG, OPENAI_CONFIG, MCP_CONFIG, validate_config
# Import templates from the backend constants
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))

from constants.chart_prompts import create_cypher_query_prompt, create_chart_formatting_prompt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPNeo4jTester:
    """Test class for MCP Neo4j integration"""
    
    def __init__(self):
        """Initialize the MCP Neo4j tester"""
        self.neo4j_config = NEO4J_CONFIG
        self.openai_config = OPENAI_CONFIG
        self.mcp_config = MCP_CONFIG
        
        # Initialize OpenAI client
        self.openai_client = openai.OpenAI(
            api_key=self.openai_config["api_key"]
        )
        
        # MCP server process and HTTP client
        self.mcp_process = None
        self.http_client = None
        self.server_url = "http://localhost:8001/api/mcp/"
    
    async def start_mcp_server(self):
        """Start the MCP Neo4j server as a subprocess"""
        try:
            # Set environment variables for the MCP server
            env = {
                "NEO4J_URI": self.neo4j_config["uri"],
                "NEO4J_USERNAME": self.neo4j_config["username"],
                "NEO4J_PASSWORD": self.neo4j_config["password"],
                "NEO4J_DATABASE": self.neo4j_config["database"],
                "NEO4J_TRANSPORT": "http",
                "NEO4J_MCP_SERVER_HOST": "127.0.0.1",
                "NEO4J_MCP_SERVER_PORT": "8001",
                "NEO4J_MCP_SERVER_PATH": "/api/mcp/"
            }
            
            # Start the MCP server process with command line arguments
            cmd = [
                "mcp-neo4j-cypher",
                "--transport", "http",
                "--server-host", "127.0.0.1",
                "--server-port", "8001",
                "--server-path", "/api/mcp/",
                "--db-url", self.neo4j_config["uri"],
                "--username", self.neo4j_config["username"],
                "--password", self.neo4j_config["password"],
                "--database", self.neo4j_config["database"]
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
                logger.error(f"❌ MCP server process exited early. stdout: {stdout.decode()}, stderr: {stderr.decode()}")
                return False
            
            # Initialize HTTP client
            self.http_client = httpx.AsyncClient(timeout=30.0)
            
            logger.info("✅ MCP Neo4j server started successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start MCP server: {e}")
            return False
    
    async def stop_mcp_server(self):
        """Stop the MCP server process"""
        if self.mcp_process:
            self.mcp_process.terminate()
            self.mcp_process.wait()
            logger.info("✅ MCP Neo4j server stopped")
        
        if self.http_client:
            await self.http_client.aclose()
    
    def _parse_sse_response(self, sse_text: str) -> Dict[str, Any]:
        """Parse Server-Sent Events response format"""
        try:
            lines = sse_text.strip().split('\n')
            data_line = None
            
            for line in lines:
                if line.startswith('data: '):
                    data_line = line[6:]  # Remove 'data: ' prefix
                    break
            
            if data_line:
                return json.loads(data_line)
            else:
                logger.error("No data line found in SSE response")
                return None
                
        except Exception as e:
            logger.error(f"Error parsing SSE response: {e}")
            return None
    
    async def test_database_connection(self):
        """Test basic database connection via MCP server"""
        try:
            if not self.http_client:
                logger.error("HTTP client not initialized")
                return False
            
            # Test connection with a simple query using MCP
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "read_neo4j_cypher",
                    "arguments": {
                        "query": "RETURN 1 as test"
                    }
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
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response text: {response.text}")
            
            if response.status_code == 200:
                try:
                    # Parse SSE format response
                    result = self._parse_sse_response(response.text)
                    logger.info(f"Parsed result: {result}")
                    if result and "result" in result:
                        logger.info("✅ Database connection successful")
                        return True
                    elif result and "error" in result:
                        logger.error(f"❌ MCP error: {result['error']}")
                        return False
                except Exception as e:
                    logger.error(f"❌ Parse error: {e}")
                    logger.error(f"Raw response: {response.text}")
                    return False
            
            logger.error(f"❌ Database connection failed: {response.text}")
            return False
                
        except Exception as e:
            logger.error(f"❌ Database connection error: {e}")
            return False
    
    async def get_database_schema(self):
        """Get database schema information via MCP"""
        try:
            if not self.http_client:
                return None
            
            # Get schema using MCP tool
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
                    logger.info("✅ Database schema retrieved")
                    return json.loads(schema)
            
            logger.error(f"❌ Failed to get database schema: {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get database schema: {e}")
            return None
    
    async def execute_natural_language_query(self, query: str) -> Dict[str, Any]:
        """Execute a natural language query using MCP and OpenAI"""
        try:
            if not self.http_client:
                raise Exception("HTTP client not initialized")
            
            # Get database schema for context
            schema = await self.get_database_schema()
            
            # Create prompt for OpenAI
            prompt = create_cypher_query_prompt(query, schema)
            
            # Call OpenAI to generate Cypher query
            response = self.openai_client.chat.completions.create(
                model=self.openai_config["model"],
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
                temperature=self.openai_config["temperature"],
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
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "read_neo4j_cypher",
                    "arguments": {
                        "query": cypher_query
                    }
                }
            }
            
            mcp_response = await self.http_client.post(
                self.server_url,
                json=mcp_request,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                }
            )
            
            if mcp_response.status_code == 200:
                mcp_result = self._parse_sse_response(mcp_response.text)
                if mcp_result and "result" in mcp_result:
                    try:
                        result_data = mcp_result["result"]["content"][0]["text"]
                        logger.info(f"Result data to parse: {result_data}")
                        
                        if result_data and result_data.strip():
                            result = json.loads(result_data)
                            return {
                                "natural_language_query": query,
                                "cypher_query": cypher_query,
                                "result": result,
                                "success": True
                            }
                        else:
                            logger.error("Empty result data from MCP")
                            return {
                                "natural_language_query": query,
                                "cypher_query": cypher_query,
                                "result": None,
                                "error": "Empty result data from MCP server",
                                "success": False
                            }
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {e}")
                        logger.error(f"Raw result data: {result_data}")
                        return {
                            "natural_language_query": query,
                            "cypher_query": cypher_query,
                            "result": None,
                            "error": f"JSON decode error: {e}",
                            "success": False
                        }
                else:
                    logger.error(f"No result in MCP response: {mcp_result}")
                    return {
                        "natural_language_query": query,
                        "cypher_query": cypher_query,
                        "result": None,
                        "error": f"No result in MCP response: {mcp_result}",
                        "success": False
                    }
            
            return {
                "natural_language_query": query,
                "cypher_query": cypher_query,
                "result": None,
                "error": f"MCP request failed: {mcp_response.text}",
                "success": False
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to execute natural language query: {e}")
            return {
                "natural_language_query": query,
                "cypher_query": None,
                "result": None,
                "error": str(e),
                "success": False
            }
    
    
    async def display_results(self, results: Dict[str, Any]):
        """Display query results in a formatted way"""
        print("\n" + "="*80)
        print("QUERY RESULTS")
        print("="*80)
        
        print(f"Natural Language Query: {results['natural_language_query']}")
        print(f"Cypher Query: {results['cypher_query']}")
        print(f"Success: {results['success']}")
        
        if results['success'] and results['result']:
            print("\nRaw Neo4j Results:")
            print(json.dumps(results['result'], indent=2))
            
            # Try to format the results for chart visualization using LLM
            try:
                formatted_data = await self._format_chart_data_with_llm(results['natural_language_query'], results['result'])
                print("\nLLM-Generated Chart Data:")
                print(json.dumps(formatted_data, indent=2))
            except Exception as e:
                print(f"\nNote: Could not format as chart data: {e}")
                # Fallback to simple formatting
                try:
                    formatted_data = self._format_chart_data_simple(results['result'])
                    print("\nSimple Formatted Chart Data:")
                    print(json.dumps(formatted_data, indent=2))
                except Exception as e2:
                    print(f"Fallback formatting also failed: {e2}")
                
        elif not results['success']:
            print(f"\nError: {results.get('error', 'Unknown error')}")
        
        print("="*80)
    
    async def _format_chart_data_with_llm(self, query: str, raw_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format raw Neo4j data into chart-compatible format using LLM for color generation"""
        try:
            if not raw_data:
                return {"chartData": [], "chartConfig": {}}
            
            # Create prompt for LLM to format the data with colors
            prompt = create_chart_formatting_prompt(query, "bar", raw_data)
            
            # Call OpenAI to generate formatted chart data with colors
            response = self.openai_client.chat.completions.create(
                model=self.openai_config["model"],
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
            
            # Clean up the response (remove markdown formatting if present)
            if chart_data_text.startswith("```json"):
                chart_data_text = chart_data_text[7:]
            if chart_data_text.startswith("```"):
                chart_data_text = chart_data_text[3:]
            if chart_data_text.endswith("```"):
                chart_data_text = chart_data_text[:-3]
            
            chart_data_text = chart_data_text.strip()
            
            # Parse the JSON response
            formatted_data = json.loads(chart_data_text)
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"Error formatting chart data with LLM: {e}")
            # Fallback to simple formatting
            return self._format_chart_data_simple(raw_data)
    
    def _format_chart_data_simple(self, raw_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format raw Neo4j data into chart-compatible format with random colors"""
        if not raw_data:
            return {"chartData": [], "chartConfig": {}}
        
        import random
        
        def generate_random_color():
            """Generate a random bright color"""
            # Generate random RGB values with higher saturation for bright colors
            r = random.randint(100, 255)
            g = random.randint(100, 255)
            b = random.randint(100, 255)
            return f"#{r:02x}{g:02x}{b:02x}"
        
        chart_data = []
        chart_config = {}
        
        # For pie charts and categorical data, assign colors to unique values
        # Find the categorical column (usually the first string column)
        categorical_column = None
        value_column = None
        
        if raw_data:
            first_record = raw_data[0]
            for key, value in first_record.items():
                if isinstance(value, str) and categorical_column is None:
                    categorical_column = key
                elif isinstance(value, (int, float)) and value_column is None:
                    value_column = key
        
        # Get unique categories from the categorical column
        categories = set()
        if categorical_column:
            for record in raw_data:
                if categorical_column in record:
                    categories.add(record[categorical_column])
        
        # Assign random colors to categories
        category_colors = {}
        for category in categories:
            category_colors[category] = generate_random_color()
        
        # Create chart data
        for record in raw_data:
            formatted_record = {}
            for key, value in record.items():
                formatted_record[key] = value
            chart_data.append(formatted_record)
        
        # Create chart config with proper color assignment
        if categorical_column and categories:
            # For categorical data, assign colors to each category value
            for category in categories:
                chart_config[str(category)] = {
                    "label": str(category).replace("_", " ").title(),
                    "color": category_colors[category]
                }
        else:
            # Fallback: assign random colors to columns
            for i, key in enumerate(first_record.keys()):
                chart_config[key] = {
                    "label": key.replace("_", " ").title(),
                    "color": generate_random_color()
                }
        
        return {
            "chartData": chart_data,
            "chartConfig": chart_config
        }

async def main():
    """Main function to run the MCP Neo4j test"""
    print("🚀 Starting MCP Neo4j Integration Test")
    #print("="*50)
    
    try:
        # Validate configuration
        validate_config()
        logger.info("✅ Configuration validated")
        
        # Initialize tester
        tester = MCPNeo4jTester()
        
        # Start MCP server
        if not await tester.start_mcp_server():
            sys.exit(1)
        
        try:
            # Test database connection
            if not await tester.test_database_connection():
                sys.exit(1)
            
            # Get database schema
            schema = await tester.get_database_schema()
            if schema:
                print("\n📊 Database Schema:")
                # print(f"Schema: {json.dumps(schema, indent=2)}")
            
            # Test queries
            test_queries = [
                "show me the number of nodes vs number of relationships in the database in a pie chart"
            ]
            
            # print(f"\n🧪 Running {len(test_queries)} test queries...")
            
            for i, query in enumerate(test_queries, 1):
                print(f"\n[{i}/{len(test_queries)}] Testing: {query}")
                results = await tester.execute_natural_language_query(query)
                await tester.display_results(results)
                
                # Add a small delay between queries
                await asyncio.sleep(1)
            
            print("\n✅ MCP Neo4j integration test completed!")
            
        finally:
            # Always stop the MCP server
            await tester.stop_mcp_server()
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
