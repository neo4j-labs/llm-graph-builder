# MCP Neo4j Integration Test Script

This folder contains a standalone script to test the Model Context Protocol (MCP) integration with Neo4j.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mcp-script
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp env_example.txt .env
```

Edit `.env` and add your actual values:

- `NEO4J_PASSWORD`: Your Neo4j database password
- `OPENAI_API_KEY`: Your OpenAI API key

### 3. Run the Test

```bash
python test_mcp_neo4j.py
```

## 📁 Files

- `test_mcp_neo4j.py` - Main test script
- `config.py` - Configuration management
- `requirements.txt` - Python dependencies
- `env_example.txt` - Environment variables template
- `README.md` - This file

## 🧪 What the Test Does

The script will:

1. **Validate Configuration** - Check that all required credentials are provided
2. **Initialize MCP Server** - Connect to Neo4j via MCP protocol
3. **Test Database Connection** - Verify the connection works
4. **Get Database Schema** - Retrieve node labels, relationship types, and properties
5. **Run Test Queries** - Execute several natural language queries:
   - Count nodes in database
   - List entity types
   - Show all documents
   - Find Bill Gates connections
   - List all relationships

## 🔧 Configuration

The script uses these environment variables:

### Neo4j Configuration

- `NEO4J_URI` - Neo4j connection URI
- `NEO4J_USERNAME` - Database username
- `NEO4J_PASSWORD` - Database password
- `NEO4J_DATABASE` - Database name

### OpenAI Configuration

- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - Model to use (default: gpt-4)
- `OPENAI_TEMPERATURE` - Response randomness (default: 0.1)

## 📊 Expected Output

The script will display:

- Configuration validation status
- Database connection status
- Database schema information
- Results for each test query
- Success/failure status for each operation

## 🐛 Troubleshooting

### Common Issues

1. **Import Error**: Make sure you've installed `mcp-neo4j-cypher`

   ```bash
   pip install mcp-neo4j-cypher
   ```

2. **Configuration Error**: Ensure your `.env` file has all required values

3. **Connection Error**: Verify your Neo4j credentials and network access

4. **OpenAI Error**: Check your API key and billing status

### Debug Mode

For more detailed logging, modify the logging level in `test_mcp_neo4j.py`:

```python
logging.basicConfig(level=logging.DEBUG)
```

## 🔗 Related Links

- [MCP Neo4j Cypher Server](https://github.com/neo4j-contrib/mcp-neo4j/tree/main/servers/mcp-neo4j-cypher)
- [Neo4j MCP Documentation](https://neo4j.com/developer/genai-ecosystem/model-context-protocol-mcp/)
- [Claude + Neo4j via MCP](https://neo4j.com/blog/developer/claude-converses-neo4j-via-mcp/)
