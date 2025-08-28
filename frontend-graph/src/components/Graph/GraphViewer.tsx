import React, { useState } from "react";
import EmbeddedGraphView from "./EmbeddedGraphView";
import SampleData from "./SampleData";
import SearchPanel, { SearchParams } from "./SearchPanel";
import { ExtendedNode, ExtendedRelationship } from "../../types";
import {
  graphQueryAPIWithTransform,
  searchAndGetSubgraphAPI,
  analyzeRiskAPI,
} from "../../services/GraphQuery";

// Tab types
type TabType = "graph" | "search" | "risk";

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

  // Risk assessment state
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // Search loading state
  const [searchLoading, setSearchLoading] = useState(false);

  // Tab management state
  const [activeTab, setActiveTab] = useState<TabType>("graph");

  // Connection form state
  const [connectionForm, setConnectionForm] = useState<{
    uri: string;
    userName: string;
    password: string;
    database: string;
    documentNames: string[];
  }>({
    uri: "neo4j+ssc://224c5da6.databases.neo4j.io",
    userName: "neo4j",
    password: "",
    database: "neo4j",
    documentNames: [], // Disabled default document names
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
    setSearchLoading(true);
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
      setSearchLoading(false);
    }
  };

  const handleViewSubgraph = (subgraph: any) => {
    // Transform the subgraph data to match the expected format
    const transformedNodes: ExtendedNode[] = subgraph.nodes.map(
      (node: any) => ({
        id: node.element_id,
        labels: node.labels,
        properties: node.properties,
        caption:
          node.properties?.name ||
          node.properties?.title ||
          node.properties?.id ||
          "Unnamed Node",
        size: 20,
        color: "#4CAF50",
      })
    );

    const transformedRelationships: ExtendedRelationship[] =
      subgraph.relationships.map((rel: any) => ({
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
    setActiveTab("graph"); // Switch to graph tab
    setError(null);

    console.log(
      `Loaded subgraph with ${transformedNodes.length} nodes and ${transformedRelationships.length} relationships`
    );
  };

  const handleClearSearch = () => {
    setSearchResult(null);
    setError(null);
  };

  const handleAnalyzeRisk = async (entityName: string, entityType: string) => {
    setRiskLoading(true);
    setError(null);

    try {
      console.log("Starting risk analysis...", { entityName, entityType });

      // Create an AbortController for the API call
      const abortController = new AbortController();

      // Set a timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        console.log("Risk analysis request timeout - aborting");
        abortController.abort();
      }, 120000); // 2 minute timeout for risk analysis

      // Default risk indicators for Canadian research security
      const riskIndicators = {
        "Foreign State Influence": 80,
        "Dual-Use Technology Exposure": 70,
        "Compliance with Canadian Research Security Policies": 60,
        "International Collaboration Patterns": 50,
        "Funding Sources Transparency": 40,
        "Export Control Compliance": 45,
        "Intellectual Property Protection": 35,
        "Research Data Security": 30,
      };

      // Perform risk analysis
      const response = await analyzeRiskAPI(
        entityName,
        entityType,
        riskIndicators,
        4, // depth
        10, // max_results
        abortController.signal,
        connectionForm
      );

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // Extract the risk assessment results
      const riskData = response.data.data;
      setRiskAssessment(riskData);
      setActiveTab("risk"); // Switch to risk assessment tab

      console.log("Risk analysis completed:", riskData);
    } catch (err: any) {
      console.error("Error during risk analysis:", err);
      if (err.name === "AbortError") {
        setError(
          "Risk analysis was cancelled due to timeout. The backend is taking too long to respond."
        );
      } else {
        setError(
          err.message ||
            "Failed to perform risk analysis. Check your connection details and entity information."
        );
      }
    } finally {
      setRiskLoading(false);
    }
  };

  const handleConnectionChange = (field: string, value: string | string[]) => {
    setConnectionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCredentials = () => {
    // Save connection credentials to session storage
    sessionStorage.setItem("neo4j_uri", connectionForm.uri);
    sessionStorage.setItem("neo4j_username", connectionForm.userName);
    sessionStorage.setItem("neo4j_password", connectionForm.password);
    sessionStorage.setItem("neo4j_database", connectionForm.database);

    // Show success feedback
    alert("Credentials saved to session storage successfully!");
  };

  // Helper function to render clickable links
  const renderClickableSource = (source: string) => {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      return (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {source}
        </a>
      );
    }
    return <span className="text-gray-600 break-all">{source}</span>;
  };

  // Load credentials from session storage on component mount
  React.useEffect(() => {
    const savedUri = sessionStorage.getItem("neo4j_uri");
    const savedUsername = sessionStorage.getItem("neo4j_username");
    const savedPassword = sessionStorage.getItem("neo4j_password");
    const savedDatabase = sessionStorage.getItem("neo4j_database");

    if (savedUri || savedUsername || savedPassword || savedDatabase) {
      setConnectionForm((prev) => ({
        ...prev,
        uri: savedUri || prev.uri,
        userName: savedUsername || prev.userName,
        password: savedPassword || prev.password,
        database: savedDatabase || prev.database,
      }));
    }
  }, []);

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

        {/* Backend Connection Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Backend Connection
            </h2>
            <p className="text-gray-600">
              Configure your Neo4j connection and load real graph data from your
              backend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neo4j URI
              </label>
              <input
                type="text"
                value={connectionForm.uri}
                onChange={(e) => handleConnectionChange("uri", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="neo4j://localhost:7687"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="•••••••••••••••••••••••••••••••••••••••••••"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveCredentials}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Credentials
            </button>
          </div>
        </div>

        <SampleData onLoadSampleData={handleLoadSampleData} />

        {/* Search Panel */}
        <SearchPanel
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onAnalyzeRisk={handleAnalyzeRisk}
          loading={searchLoading}
          connectionForm={connectionForm}
        />

        {/* Tabbed Content Area */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("graph")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "graph"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Graph Visualization
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "search"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Search Results
                {searchResult && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {searchResult.total_results || 0}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("risk")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "risk"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Risk Assessment
                {riskAssessment && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Active
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Graph Tab */}
            {activeTab === "graph" && (
              <div>
                {showGraph && nodes.length > 0 ? (
                  <EmbeddedGraphView
                    nodeValues={nodes}
                    relationshipValues={relationships}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
                      />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Graph Data</h3>
                    <p className="mb-4">
                      Load sample data or search for entities to visualize the
                      graph.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleShowGraph}
                        disabled={nodes.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Show Graph
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Results Tab */}
            {activeTab === "search" && (
              <div>
                {searchLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150 cursor-not-allowed">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Extracting Subgraph...
                    </div>
                  </div>
                ) : searchResult ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Search Results</h3>
                      <button
                        onClick={handleClearSearch}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
                      >
                        Clear Results
                      </button>
                    </div>
                    <div className="space-y-4">
                      {searchResult.subgraphs.map(
                        (subgraph: any, index: number) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">
                                Subgraph {index + 1}
                              </h4>
                              <button
                                onClick={() => handleViewSubgraph(subgraph)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                View Graph
                              </button>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Nodes: {subgraph.nodes.length}</p>
                              <p>
                                Relationships: {subgraph.relationships.length}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">
                      No Search Results
                    </h3>
                    <p>
                      Use the search panel above to find entities and extract
                      subgraphs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Risk Assessment Tab */}
            {activeTab === "risk" && (
              <div>
                {riskLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150 cursor-not-allowed">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analyzing Risk...
                    </div>
                  </div>
                ) : riskAssessment ? (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-medium">
                        Risk Assessment Results
                      </h3>
                      <button
                        onClick={() => setRiskAssessment(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
                      >
                        Clear Results
                      </button>
                    </div>

                    {/* Entity Information */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Entity Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-medium">
                            {riskAssessment.entityName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-medium capitalize">
                            {riskAssessment.entityType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Assessment */}
                    <div className="bg-white border rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Overall Assessment
                      </h4>
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            Score:
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {riskAssessment.calculation?.overallScore || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            Status:
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              riskAssessment.finalAssessment?.trafficLight ===
                              "Red"
                                ? "bg-red-100 text-red-800"
                                : riskAssessment.finalAssessment
                                      ?.trafficLight === "Yellow"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {riskAssessment.finalAssessment?.trafficLight ||
                              "N/A"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {riskAssessment.finalAssessment?.overallExplanation ||
                          "No explanation available."}
                      </p>
                    </div>

                    {/* Risk Indicators */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">
                        Risk Indicators
                      </h4>
                      {riskAssessment.riskAssessments?.map(
                        (assessment: any, index: number) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-gray-900">
                                {assessment.indicator}
                              </h5>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">
                                  Score:
                                </span>
                                <span className="font-medium">
                                  {assessment.score}/5
                                </span>
                                <span className="text-sm text-gray-600">
                                  Weight:
                                </span>
                                <span className="font-medium">
                                  {assessment.weight}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {assessment.explanation}
                            </p>
                            {assessment.sources &&
                              assessment.sources.length > 0 && (
                                <div>
                                  <span className="text-xs text-gray-600">
                                    Sources:
                                  </span>
                                  <div className="mt-1 space-y-1">
                                    {assessment.sources.map(
                                      (source: string, sourceIndex: number) => (
                                        <div
                                          key={sourceIndex}
                                          className="text-xs"
                                        >
                                          {renderClickableSource(source)}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )
                      )}
                    </div>

                    {/* Analysis Metadata */}
                    {riskAssessment.analysis_metadata && (
                      <div className="mt-6 bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Analysis Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">
                              Chunks Analyzed:
                            </span>
                            <span className="ml-2 font-medium">
                              {riskAssessment.analysis_metadata.chunks_analyzed}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Subgraph Nodes:
                            </span>
                            <span className="ml-2 font-medium">
                              {riskAssessment.analysis_metadata.subgraph_nodes}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Search Method:
                            </span>
                            <span className="ml-2 font-medium">
                              {riskAssessment.analysis_metadata.search_method}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Best Match Score:
                            </span>
                            <span className="ml-2 font-medium">
                              {
                                riskAssessment.analysis_metadata
                                  .best_match_score
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">
                      No Risk Assessment
                    </h3>
                    <p>
                      Use the "Analyze Risk" button in the search panel to
                      assess entity risk.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphViewer;
