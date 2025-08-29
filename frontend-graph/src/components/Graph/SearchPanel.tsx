import React, { useState } from "react";
import { Button, TextInput } from "@neo4j-ndl/react";
import { MagnifyingGlassIconOutline } from "@neo4j-ndl/react/icons";

interface SearchPanelProps {
  onSearch: (searchParams: SearchParams) => void;
  onClear: () => void;
  onAnalyzeRisk: (entityName: string, entityType: string, depth: number, maxResults: number) => void;
  loading: boolean;
  connectionForm: {
    uri: string;
    userName: string;
    password: string;
    database: string;
  };
}

export interface SearchParams {
  search_term: string;
  node_type: string;
  depth: number;
  max_results: number;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  onSearch,
  onClear,
  onAnalyzeRisk,
  loading,
  connectionForm,
}) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    search_term: "",
    node_type: "Person",
    depth: 4,
    max_results: 10,
  });

  const nodeTypes = [
    { label: "Person", value: "Person" },
    { label: "Organization", value: "Organization" },
    { label: "Location", value: "Location" },
    { label: "Event", value: "Event" },
    { label: "Concept", value: "Concept" },
    { label: "Product", value: "Product" },
    { label: "Technology", value: "Technology" },
  ];

  const depthOptions = [
    { label: "1 level", value: 1 },
    { label: "2 levels", value: 2 },
    { label: "3 levels", value: 3 },
    { label: "4 levels", value: 4 },
    { label: "5 levels", value: 5 },
  ];

  const maxResultsOptions = [
    { label: "5 results", value: 5 },
    { label: "10 results", value: 10 },
    { label: "20 results", value: 20 },
    { label: "50 results", value: 50 },
  ];

  const handleSearch = () => {
    if (searchParams.search_term.trim()) {
      onSearch(searchParams);
    }
  };



  const handleAnalyzeRisk = () => {
    if (searchParams.search_term.trim()) {
      onAnalyzeRisk(searchParams.search_term, searchParams.node_type, searchParams.depth, searchParams.max_results);
    }
  };

  const isSearchDisabled = !searchParams.search_term.trim() || loading;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">Graph Search</h3>
      <p className="text-gray-600 mb-4">
        Search for nodes across all documents and extract their subgraphs.
      </p>

      <div className="space-y-4">
        {/* Search Term Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Term
          </label>
          <TextInput
            value={searchParams.search_term}
            onChange={(e) =>
              setSearchParams({ ...searchParams, search_term: e.target.value })
            }
            placeholder="Enter search term (e.g., person name, organization)"
            className="w-full"
            isDisabled={loading}
          />
        </div>

        {/* Node Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node Type
          </label>
          <select
            value={searchParams.node_type}
            onChange={(e) =>
              setSearchParams({ ...searchParams, node_type: e.target.value })
            }
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {nodeTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Depth Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subgraph Depth
          </label>
          <select
            value={searchParams.depth.toString()}
            onChange={(e) =>
              setSearchParams({
                ...searchParams,
                depth: parseInt(e.target.value),
              })
            }
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {depthOptions.map((option) => (
              <option key={option.value} value={option.value.toString()}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max Results Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Results
          </label>
          <select
            value={searchParams.max_results.toString()}
            onChange={(e) =>
              setSearchParams({
                ...searchParams,
                max_results: parseInt(e.target.value),
              })
            }
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {maxResultsOptions.map((option) => (
              <option key={option.value} value={option.value.toString()}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={handleSearch}
            isDisabled={isSearchDisabled}
            isLoading={loading}
            className="flex-1"
          >
            <MagnifyingGlassIconOutline className="w-4 h-4 mr-2" />
            Search & Extract Subgraph
          </Button>
          <Button
            onClick={handleAnalyzeRisk}
            isDisabled={isSearchDisabled}
            isLoading={loading}
            className="flex-1"
          >
            🔍 Analyze Risk
          </Button>
          <Button
            onClick={onClear}
            isDisabled={loading}
            className="flex-1"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          Connection Status
        </h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>URI: {connectionForm.uri || "Not configured"}</div>
          <div>Database: {connectionForm.database || "Not configured"}</div>
          <div>Username: {connectionForm.userName || "Not configured"}</div>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
