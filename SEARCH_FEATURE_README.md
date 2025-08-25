# Graph Search Feature - Implementation Guide

## Overview

This document describes the implementation of a robust graph search functionality that allows users to search for nodes across all documents in the Neo4j database and extract subgraphs with configurable depth.

## Features Implemented

### 1. Backend Search API
- **Node Search**: Search for nodes across all documents by name, description, title, or ID
- **Subgraph Extraction**: Extract subgraphs from specific nodes with configurable depth
- **Combined Search**: Search and extract subgraphs in one operation
- **Configurable Parameters**: Node type, depth, max results, max nodes

### 2. Frontend Search Interface
- **Search Panel**: User-friendly interface for configuring search parameters
- **Search Results**: Display search results with node information and subgraph statistics
- **Graph Visualization**: Interactive visualization of extracted subgraphs
- **Real-time Feedback**: Loading states, error handling, and progress indicators

## API Endpoints

### 1. `/search_nodes`
Search for nodes across all documents.

**Parameters:**
- `search_term` (required): The search term to look for
- `node_type` (optional, default: "Person"): Type of node to search for
- `max_results` (optional, default: 50): Maximum number of results to return
- Connection parameters: `uri`, `userName`, `password`, `database`

**Response:**
```json
{
  "search_term": "john",
  "node_type": "Person",
  "total_results": 5,
  "nodes": [
    {
      "element_id": "4:1234:5678",
      "labels": ["Person", "__Entity__"],
      "properties": {
        "name": "John Smith",
        "description": "Software Engineer"
      }
    }
  ]
}
```

### 2. `/get_subgraph`
Extract a subgraph from a specific node.

**Parameters:**
- `node_id` (required): The element ID of the starting node
- `depth` (optional, default: 4): Maximum depth of the subgraph
- `max_nodes` (optional, default: 1000): Maximum number of nodes to include
- Connection parameters: `uri`, `userName`, `password`, `database`

**Response:**
```json
{
  "start_node_id": "4:1234:5678",
  "depth": 4,
  "nodes": [...],
  "relationships": [...]
}
```

### 3. `/search_and_get_subgraph`
Combined search and subgraph extraction.

**Parameters:**
- `search_term` (required): The search term to look for
- `node_type` (optional, default: "Person"): Type of node to search for
- `depth` (optional, default: 4): Maximum depth of the subgraph
- `max_results` (optional, default: 10): Maximum number of search results to process
- Connection parameters: `uri`, `userName`, `password`, `database`

**Response:**
```json
{
  "search_term": "john",
  "node_type": "Person",
  "total_results": 5,
  "subgraphs": [
    {
      "start_node_id": "4:1234:5678",
      "depth": 4,
      "nodes": [...],
      "relationships": [...],
      "matching_node": {...}
    }
  ]
}
```

## Implementation Details

### Backend Implementation

#### 1. Graph Query Functions (`backend/src/graph_query.py`)

**`search_nodes()`**: Searches for nodes using Cypher queries
```python
def search_nodes(uri, username, password, database, search_term, node_type="Person", max_results=50):
    # Searches across multiple properties: name, description, title, id
    # Returns processed nodes with element_id, labels, and properties
```

**`get_subgraph_from_node()`**: Extracts subgraphs with configurable depth
```python
def get_subgraph_from_node(uri, username, password, database, node_id, depth=4, max_nodes=1000):
    # Uses variable-length path queries to extract subgraphs
    # Processes nodes and relationships for frontend consumption
```

**`search_and_get_subgraph()`**: Combines search and subgraph extraction
```python
def search_and_get_subgraph(uri, username, password, database, search_term, node_type="Person", depth=4, max_results=10):
    # First searches for nodes, then extracts subgraphs for each match
    # Returns comprehensive results with metadata
```

#### 2. API Endpoints (`backend/score.py`)

Three new FastAPI endpoints with comprehensive error handling, logging, and performance monitoring.

#### 3. Main Functions (`backend/src/main.py`)

API wrapper functions that integrate with the existing codebase patterns.

### Frontend Implementation

#### 1. Search Services (`frontend-graph/src/services/GraphQuery.ts`)

Three new API service functions with proper error handling and timeout management.

#### 2. Search Components

**`SearchPanel.tsx`**: User interface for configuring search parameters
- Search term input
- Node type selection
- Depth configuration
- Max results selection
- Connection status display

**`SearchResults.tsx`**: Display search results and subgraph information
- Search summary
- Result cards with node information
- Subgraph statistics
- View subgraph buttons

#### 3. Integration (`GraphViewer.tsx`)

Updated main component to integrate search functionality with existing graph visualization.

## Usage Examples

### 1. Search for People
```typescript
// Search for people named "John"
const searchParams = {
  search_term: "John",
  node_type: "Person",
  depth: 4,
  max_results: 10
};

const response = await searchAndGetSubgraphAPI(
  searchParams.search_term,
  searchParams.node_type,
  searchParams.depth,
  searchParams.max_results,
  abortController.signal,
  connectionParams
);
```

### 2. Extract Subgraph from Node
```typescript
// Extract subgraph from a specific node
const response = await getSubgraphAPI(
  "4:1234:5678", // node_id
  3, // depth
  500, // max_nodes
  abortController.signal,
  connectionParams
);
```

### 3. Search Organizations
```typescript
// Search for organizations
const searchParams = {
  search_term: "Microsoft",
  node_type: "Organization",
  depth: 3,
  max_results: 5
};
```

## Performance Considerations

### 1. Query Optimization
- Uses indexed properties for search (name, description, title, id)
- Configurable result limits to prevent large result sets
- Efficient subgraph extraction with depth limits

### 2. Frontend Performance
- Debounced search inputs
- AbortController for request cancellation
- Progressive loading for large subgraphs
- Memory management for graph visualization

### 3. Backend Performance
- Connection pooling and reuse
- Batch processing for multiple subgraphs
- Comprehensive logging and monitoring
- Error handling and recovery

## Security Features

### 1. Input Validation
- Search term sanitization
- Parameter validation and limits
- SQL injection prevention through parameterized queries

### 2. Access Control
- Connection parameter validation
- Database access controls
- Error message sanitization

## Testing

### 1. Backend Testing
Run the test script to verify functionality:
```bash
cd backend
python test_search.py
```

### 2. Frontend Testing
- Test search functionality with various parameters
- Verify subgraph visualization
- Test error handling and edge cases

## Configuration

### 1. Environment Variables
```bash
NEO4J_URI=neo4j+ssc://your-database.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

### 2. Search Parameters
- **Default Node Type**: Person
- **Default Depth**: 4 levels
- **Default Max Results**: 10 for combined search, 50 for node search
- **Default Max Nodes**: 1000 for subgraph extraction

## Error Handling

### 1. Backend Errors
- Connection failures
- Query timeouts
- Invalid parameters
- Database errors

### 2. Frontend Errors
- Network timeouts
- API errors
- Invalid search parameters
- Graph rendering errors

## Future Enhancements

### 1. Advanced Search
- Fuzzy search capabilities
- Semantic search using embeddings
- Multi-property search with weights
- Search across multiple node types

### 2. Performance Improvements
- Search result caching
- Incremental subgraph loading
- Background search processing
- Search result pagination

### 3. User Experience
- Search history
- Saved searches
- Search suggestions
- Advanced filtering options

## Troubleshooting

### Common Issues

1. **No search results**
   - Verify node types exist in the database
   - Check search term spelling
   - Ensure proper connection parameters

2. **Large subgraphs**
   - Reduce depth parameter
   - Lower max_nodes limit
   - Use more specific search terms

3. **Performance issues**
   - Check database indexes
   - Monitor query execution time
   - Adjust result limits

### Debug Information

Enable debug logging to troubleshoot issues:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Conclusion

The graph search feature provides a robust, scalable solution for searching and visualizing knowledge graphs. The implementation follows best practices for performance, security, and user experience, making it suitable for production use.

The modular design allows for easy extension and customization, while the comprehensive error handling ensures reliable operation in various environments.
