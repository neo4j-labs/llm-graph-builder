import React from "react";
import { Button } from "@neo4j-ndl/react";
import {
  EyeIconOutline,
  InformationCircleIconOutline,
} from "@neo4j-ndl/react/icons";

interface SearchResult {
  search_term: string;
  node_type: string;
  total_results: number;
  subgraphs: SubgraphResult[];
}

interface SubgraphResult {
  start_node_id: string;
  depth: number;
  nodes: any[];
  relationships: any[];
  matching_node: {
    element_id: string;
    labels: string[];
    properties: Record<string, any>;
  };
}

interface SearchResultsProps {
  searchResult: SearchResult | null;
  onViewSubgraph: (subgraph: SubgraphResult) => void;
  onClear: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResult,
  onViewSubgraph,
  onClear,
}) => {
  if (!searchResult) {
    return null;
  }

  const getNodeName = (node: any) => {
    return (
      node.properties?.name ||
      node.properties?.title ||
      node.properties?.id ||
      node.properties?.description ||
      "Unnamed Node"
    );
  };

  const getNodeType = (node: any) => {
    const labels = node.labels || [];
    return labels.find((label: string) => label !== "__Entity__") || "Entity";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Search Results</h3>
        <Button onClick={onClear} fill="text" size="small">
          Clear Results
        </Button>
      </div>

      {/* Search Summary */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center space-x-2 mb-2">
          <InformationCircleIconOutline className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Search Summary
          </span>
        </div>
        <div className="text-sm text-blue-700">
          <p>
            <strong>Search Term:</strong> "{searchResult.search_term}"
          </p>
          <p>
            <strong>Node Type:</strong> {searchResult.node_type}
          </p>
          <p>
            <strong>Total Results:</strong> {searchResult.total_results}
          </p>
          <p>
            <strong>Subgraphs Found:</strong> {searchResult.subgraphs.length}
          </p>
        </div>
      </div>

      {/* Results */}
      {searchResult.subgraphs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No subgraphs found for the search criteria.</p>
          <p className="text-sm mt-2">
            Try adjusting your search term or node type.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResult.subgraphs.map((subgraph, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {getNodeName(subgraph.matching_node)}
                  </h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getNodeType(subgraph.matching_node)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Depth: {subgraph.depth}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Nodes:</strong> {subgraph.nodes.length}
                    </p>
                    <p>
                      <strong>Relationships:</strong>{" "}
                      {subgraph.relationships.length}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => onViewSubgraph(subgraph)}
                  size="small"
                  className="ml-4"
                >
                  <EyeIconOutline className="w-4 h-4 mr-1" />
                  View Subgraph
                </Button>
              </div>

              {/* Node Properties Preview */}
              {subgraph.matching_node.properties && (
                <div className="mt-3 p-2 bg-white rounded text-xs border">
                  <p className="font-medium text-gray-700 mb-1">Properties:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(subgraph.matching_node.properties)
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-600 mr-1">
                            {key}:
                          </span>
                          <span className="text-gray-800 truncate">
                            {String(value).slice(0, 30)}
                            {String(value).length > 30 ? "..." : ""}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
