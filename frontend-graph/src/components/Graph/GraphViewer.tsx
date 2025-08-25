import React, { useState } from "react";
import EmbeddedGraphView from "./EmbeddedGraphView";
import SampleData from "./SampleData";
import SearchPanel, { SearchParams } from "./SearchPanel";
import SearchResults from "./SearchResults";
import { ExtendedNode, ExtendedRelationship } from "../../types";
import { graphQueryAPIWithTransform, searchAndGetSubgraphAPI } from "../../services/GraphQuery";

const GraphViewer: React.FC = () => {
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    uri: "neo4j+ssc://224c5da6.databases.neo4j.io",
    userName: "neo4j",
    password: "",
    database: "neo4j",
    documentNames: ["Apple stock during pandemic.pdf"],
  });

  const handleLoadSampleData = (
    sampleNodes: ExtendedNode[],
    sampleRelationships: ExtendedRelationship[]
  ) => {
    setNodes(sampleNodes);
    setRelationships(sampleRelationships);
    setError(null);
    setShowGraph(false); // Reset graph view when new data is loaded
    setSearchResult(null); // Clear search results
  };

  const handleLoadBackendData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Starting backend data load...");

      // Create an AbortController for the API call
      const abortController = new AbortController();

      // Set a timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        console.log("Request timeout - aborting");
        abortController.abort();
      }, 60000); // 60 second timeout

      // Fetch graph data from backend with connection parameters
      const response = await graphQueryAPIWithTransform(
        "entities", // query_type
        connectionForm.documentNames, // document_names
        abortController.signal,
        connectionForm // connection parameters
      );

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // Extract the transformed data
      const { nodes: backendNodes, relationships: backendRelationships } =
        response.data.data;

      setNodes(backendNodes);
      setRelationships(backendRelationships);
      setShowGraph(false); // Reset graph view when new data is loaded
      setSearchResult(null); // Clear search results

      console.log(
        `Loaded ${backendNodes.length} nodes and ${backendRelationships.length} relationships from backend`
      );
    } catch (err: any) {
      console.error("Error loading backend data:", err);
      if (err.name === "AbortError") {
        setError(
          "Request was cancelled due to timeout. The backend is taking too long to respond."
        );
      } else {
        setError(
          err.message ||
            "Failed to load data from backend. Check your connection details."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchParams: SearchParams) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Starting search...", searchParams);

      // Create an AbortController for the API call
      const abortController = new AbortController();

      // Set a timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        console.log("Search request timeout - aborting");
        abortController.abort();
      }, 120000); // 2 minute timeout for search operations

      // Perform search and subgraph extraction
      const response = await searchAndGetSubgraphAPI(
        searchParams.search_term,
        searchParams.node_type,
        searchParams.depth,
        searchParams.max_results,
        abortController.signal,
        connectionForm
      );

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // Extract the search results
      const searchData = response.data.data;
      setSearchResult(searchData);

      console.log(
        `Search completed: ${searchData.total_results} total results, ${searchData.subgraphs.length} subgraphs`
      );
    } catch (err: any) {
      console.error("Error during search:", err);
      if (err.name === "AbortError") {
        setError(
          "Search was cancelled due to timeout. The backend is taking too long to respond."
        );
      } else {
        setError(
          err.message ||
            "Failed to perform search. Check your connection details and search parameters."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubgraph = (subgraph: any) => {
    // Transform the subgraph data to match the expected format
    const transformedNodes: ExtendedNode[] = subgraph.nodes.map((node: any) => ({
      id: node.element_id,
      labels: node.labels,
      properties: node.properties,
      caption: node.properties?.name || node.properties?.title || node.properties?.id || "Unnamed Node",
      size: 20,
      color: "#4CAF50",
    }));

    const transformedRelationships: ExtendedRelationship[] = subgraph.relationships.map((rel: any) => ({
      id: rel.element_id,
      type: rel.type,
      from: rel.start_node_id,
      to: rel.end_node_id,
      properties: rel.properties,
      caption: rel.type,
      color: "#2196F3",
      width: 2,
    }));

    setNodes(transformedNodes);
    setRelationships(transformedRelationships);
    setShowGraph(true);
    setError(null);

    console.log(
      `Loaded subgraph with ${transformedNodes.length} nodes and ${transformedRelationships.length} relationships`
    );
  };

  const handleClearSearch = () => {
    setSearchResult(null);
    setError(null);
  };

  const handleConnectionChange = (field: string, value: string | string[]) => {
    setConnectionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleShowGraph = () => {
    setShowGraph(true);
  };

  const handleAddFile = () => {
    if (
      newFileName.trim() &&
      !connectionForm.documentNames.includes(newFileName.trim())
    ) {
      setConnectionForm((prev) => ({
        ...prev,
        documentNames: [...prev.documentNames, newFileName.trim()],
      }));
      setNewFileName("");
    }
  };

  const handleRemoveFile = (index: number) => {
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: prev.documentNames.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFile();
    }
  };

  const handleClearAllFiles = () => {
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: [],
    }));
  };

  const handleAddSampleFiles = () => {
    const sampleFiles = [
      "Apple stock during pandemic.pdf",
      "Market analysis report.pdf",
      "Financial statements Q4.pdf",
      "Investment portfolio.pdf",
    ];
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: [...new Set([...prev.documentNames, ...sampleFiles])],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Graph Visualization
        </h1>

        <SampleData onLoadSampleData={handleLoadSampleData} />

        {/* Search Panel */}
        <SearchPanel
          onSearch={handleSearch}
          onClear={handleClearSearch}
          loading={loading}
          connectionForm={connectionForm}
        />

        {/* Search Results */}
        <SearchResults
          searchResult={searchResult}
          onViewSubgraph={handleViewSubgraph}
          onClear={handleClearSearch}
        />

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Backend Connection</h3>
          <p className="text-gray-600 mb-4">
            Configure your Neo4j connection and load real graph data from your
            backend.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neo4j URI
              </label>
              <input
                type="text"
                value={connectionForm.uri}
                onChange={(e) => handleConnectionChange("uri", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j+ssc://your-database.neo4j.io"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database
              </label>
              <input
                type="text"
                value={connectionForm.database}
                onChange={(e) =>
                  handleConnectionChange("database", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={connectionForm.userName}
                onChange={(e) =>
                  handleConnectionChange("userName", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={connectionForm.password}
                onChange={(e) =>
                  handleConnectionChange("password", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Files
            </label>

            {/* File List */}
            <div className="mb-3">
              {connectionForm.documentNames.length > 0 ? (
                <div className="space-y-2">
                  {connectionForm.documentNames.map((fileName, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove file"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No files added yet</p>
                  <p className="text-sm">
                    Add files below to include them in the graph
                  </p>
                </div>
              )}
            </div>

            {/* Add File Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter file name (e.g., document1.pdf)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddFile}
                disabled={
                  !newFileName.trim() ||
                  connectionForm.documentNames.includes(newFileName.trim())
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
              >
                Add
              </button>
            </div>

            {/* File Count */}
            <div className="mt-2 text-sm text-gray-600">
              {connectionForm.documentNames.length} file
              {connectionForm.documentNames.length !== 1 ? "s" : ""} selected
            </div>

            {/* Bulk Operations */}
            {connectionForm.documentNames.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleClearAllFiles}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleAddSampleFiles}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                >
                  Add Sample Files
                </button>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleLoadBackendData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Load Backend Data"}
            </button>
            <button
              onClick={handleShowGraph}
              disabled={nodes.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Show Graph
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Graph Visualization */}
        {showGraph && nodes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium mb-4">Graph Visualization</h3>
            <EmbeddedGraphView
              nodeValues={nodes}
              relationshipValues={relationships}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphViewer;
