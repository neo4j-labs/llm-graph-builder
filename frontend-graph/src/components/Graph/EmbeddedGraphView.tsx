import {
  Banner,
  Flex,
  IconButtonArray,
  LoadingSpinner,
  useDebounceValue,
} from "@neo4j-ndl/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BasicNode,
  BasicRelationship,
  EntityType,
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  OptionType,
  Scheme,
} from "../../types";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import NVL from "@neo4j-nvl/base";
import type { Node, Relationship } from "@neo4j-nvl/base";
import {
  ArrowPathIconOutline,
  FitToScreenIcon,
  InformationCircleIconOutline,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
  ExploreIcon,
} from "@neo4j-ndl/react/icons";
import { IconButtonWithToolTip } from "../UI/IconButtonToolTip";
import {
  filterData,
  getCheckboxConditions,
  graphTypeFromNodes,
  processGraphData,
  extractGraphSchemaFromRawData,
} from "../../utils/Utils";
import { graphLabels, nvlOptions, queryMap } from "../../utils/Constants";
import CheckboxSelection from "./CheckboxSelection";
import ResultOverview from "./ResultOverview";
import { ResizePanelDetails } from "./ResizePanel";
import GraphPropertiesPanel from "./GraphPropertiesPanel";

interface EmbeddedGraphViewProps {
  nodeValues: ExtendedNode[];
  relationshipValues: ExtendedRelationship[];
  viewPoint?: string;
}

const EmbeddedGraphView: React.FC<EmbeddedGraphViewProps> = ({
  nodeValues,
  relationshipValues,
  viewPoint = "chatInfoView",
}) => {
  const nvlRef = useRef<NVL>(null);
  const [node, setNode] = useState<ExtendedNode[]>([]);
  const [relationship, setRelationship] = useState<ExtendedRelationship[]>([]);
  const [allNodes, setAllNodes] = useState<ExtendedNode[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"unknown" | "success" | "danger">(
    "unknown"
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [scheme, setScheme] = useState<Scheme>({});
  const [newScheme, setNewScheme] = useState<Scheme>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(searchQuery, 300);
  const [graphType, setGraphType] = useState<GraphType[]>([]);
  const [disableRefresh, setDisableRefresh] = useState<boolean>(false);
  const [selected, setSelected] = useState<
    { type: EntityType; id: string } | undefined
  >(undefined);
  const [mode, setMode] = useState<boolean>(false);
  const graphQueryAbortControllerRef = useRef<AbortController>();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [schemaNodes, setSchemaNodes] = useState<OptionType[]>([]);
  const [schemaRels, setSchemaRels] = useState<OptionType[]>([]);
  const [viewCheck, setViewcheck] = useState<string>("enhancement");
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [showOnlyConnected, setShowOnlyConnected] = useState<boolean>(false);
  const [minDegree, setMinDegree] = useState<number>(0);
  const [showSchemaView, setShowSchemaView] = useState<boolean>(false);
  const [schemaData, setSchemaData] = useState<{
    nodeLabels: string[];
    relationshipTypes: string[];
  }>({ nodeLabels: [], relationshipTypes: [] });

  const graphQuery: string =
    graphType.includes("DocumentChunk") && graphType.includes("Entities")
      ? queryMap.DocChunkEntities
      : graphType.includes("DocumentChunk")
        ? queryMap.DocChunks
        : graphType.includes("Entities")
          ? queryMap.Entities
          : "";

  // fit graph to original position
  const handleZoomToFit = () => {
    if (nvlRef.current && allNodes.length > 0) {
      nvlRef.current?.fit(
        allNodes.map((node) => node.id),
        {}
      );
    }
  };

  // Initialize graph when component mounts or data changes
  useEffect(() => {
    if (nodeValues.length > 0 || relationshipValues.length > 0) {
      setLoading(true);

      try {
        const graphTypes = graphTypeFromNodes(nodeValues);
        setGraphType(graphTypes);

        const processedData = processGraphData(nodeValues, relationshipValues);
        setAllNodes(processedData.finalNodes);
        setAllRelationships(processedData.finalRels);

        // Initialize with all data
        setNode(processedData.finalNodes);
        setRelationship(processedData.finalRels);

        // Set schema from processed data
        setScheme(processedData.schemeVal);
        setNewScheme(processedData.schemeVal);

        setStatus("success");
        setStatusMessage("Graph loaded successfully");

        // Fit to screen after a short delay to ensure the graph is rendered
        setTimeout(() => {
          handleZoomToFit();
        }, 100);
      } catch (error) {
        console.error("Error processing graph data:", error);
        setStatus("danger");
        setStatusMessage("Error processing graph data");
      } finally {
        setLoading(false);
      }
    } else {
      // Reset state when no data
      setNode([]);
      setRelationship([]);
      setAllNodes([]);
      setAllRelationships([]);
      setGraphType([]);
      setScheme({});
      setNewScheme({});
      setStatus("unknown");
      setStatusMessage("");
    }
  }, [nodeValues, relationshipValues]);

  // Filter data based on search query
  useEffect(() => {
    if (debouncedQuery && allNodes.length > 0) {
      const filteredData = filterData(
        graphType,
        allNodes,
        allRelationships,
        scheme
      );
      setNode(filteredData.filteredNodes);
      setRelationship(filteredData.filteredRelations);
    } else if (allNodes.length > 0) {
      setNode(allNodes);
      setRelationship(allRelationships);
    }
  }, [debouncedQuery, allNodes, allRelationships, graphType, scheme]);

  // Apply filtering when graphType changes
  useEffect(() => {
    if (allNodes.length > 0 && graphType.length > 0) {
      let filteredData = filterData(
        graphType,
        allNodes,
        allRelationships,
        scheme
      );

      // Apply degree filtering
      const degreeFiltered = filterByDegree(
        filteredData.filteredNodes,
        filteredData.filteredRelations,
        minDegree
      );

      // Apply neighborhood focus if enabled
      let finalData = degreeFiltered;
      if (focusedNodeId && showOnlyConnected) {
        finalData = focusOnNeighborhood(
          focusedNodeId,
          degreeFiltered.nodes,
          degreeFiltered.relationships
        );
      }

      setNode(finalData.nodes);
      setRelationship(finalData.relationships);
    } else if (allNodes.length > 0 && graphType.length === 0) {
      // If no graph types selected, show all nodes but apply other filters
      let filteredData = { nodes: allNodes, relationships: allRelationships };

      // Apply degree filtering
      filteredData = filterByDegree(
        filteredData.nodes,
        filteredData.relationships,
        minDegree
      );

      // Apply neighborhood focus if enabled
      if (focusedNodeId && showOnlyConnected) {
        filteredData = focusOnNeighborhood(
          focusedNodeId,
          filteredData.nodes,
          filteredData.relationships
        );
      }

      setNode(filteredData.nodes);
      setRelationship(filteredData.relationships);
    }
  }, [
    graphType,
    allNodes,
    allRelationships,
    scheme,
    minDegree,
    focusedNodeId,
    showOnlyConnected,
  ]);

  const mouseEventCallbacks = useMemo(
    () => ({
      onNodeClick: (node: Node) => {
        setSelected({ type: "node", id: node.id });
        setFocusedNodeId(node.id);
      },
      onRelationshipClick: (relationship: Relationship) => {
        setSelected({ type: "relationship", id: relationship.id });
      },
      onCanvasClick: () => {
        setSelected(undefined);
        setFocusedNodeId(null);
      },
      onPan: true,
      onZoom: true,
      onDrag: true,
    }),
    []
  );

  const nvlCallbacks = useMemo(
    () => ({
      onLayoutComputing(isComputing: boolean) {
        setDisableRefresh(isComputing);
      },
    }),
    []
  );

  const handleZoomIn = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
  };

  const handleZoomOut = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
  };

  const handleRefresh = () => {
    if (allNodes.length > 0) {
      setNode([...allNodes]);
      setRelationship([...allRelationships]);
    }
  };

  const handleCheckboxChange = (graph: GraphType) => {
    const updatedGraphType = graphType.includes(graph)
      ? graphType.filter((type) => type !== graph)
      : [...graphType, graph];
    setGraphType(updatedGraphType);
  };

  // Filter nodes by degree (number of connections)
  const filterByDegree = (
    nodes: ExtendedNode[],
    relationships: ExtendedRelationship[],
    minDegree: number
  ) => {
    if (minDegree === 0) return { nodes, relationships };

    // Calculate degree for each node
    const nodeDegree: { [key: string]: number } = {};
    relationships.forEach((rel) => {
      nodeDegree[rel.from] = (nodeDegree[rel.from] || 0) + 1;
      nodeDegree[rel.to] = (nodeDegree[rel.to] || 0) + 1;
    });

    // Filter nodes with degree >= minDegree
    const filteredNodes = nodes.filter(
      (node) => (nodeDegree[node.id] || 0) >= minDegree
    );
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter relationships between filtered nodes
    const filteredRelationships = relationships.filter(
      (rel) => filteredNodeIds.has(rel.from) && filteredNodeIds.has(rel.to)
    );

    return { nodes: filteredNodes, relationships: filteredRelationships };
  };

  // Focus on neighborhood of a specific node
  const focusOnNeighborhood = (
    nodeId: string,
    nodes: ExtendedNode[],
    relationships: ExtendedRelationship[]
  ) => {
    if (!showOnlyConnected) return { nodes, relationships };

    // Find all nodes directly connected to the focused node
    const connectedNodeIds = new Set([nodeId]);
    relationships.forEach((rel) => {
      if (rel.from === nodeId) connectedNodeIds.add(rel.to);
      if (rel.to === nodeId) connectedNodeIds.add(rel.from);
    });

    // Filter nodes to only show connected ones
    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));

    // Filter relationships between connected nodes
    const filteredRelationships = relationships.filter(
      (rel) => connectedNodeIds.has(rel.from) && connectedNodeIds.has(rel.to)
    );

    return { nodes: filteredNodes, relationships: filteredRelationships };
  };

  const handleSchemaView = async (rawNodes: any[], rawRelationships: any[]) => {
    // Extract unique node labels and relationship types
    const nodeLabels = new Set<string>();
    const relationshipTypes = new Set<string>();

    rawNodes.forEach((node) => {
      if (node.labels) {
        node.labels.forEach((label: string) => nodeLabels.add(label));
      }
    });

    rawRelationships.forEach((rel) => {
      if (rel.type) {
        relationshipTypes.add(rel.type);
      }
    });

    setSchemaData({
      nodeLabels: Array.from(nodeLabels).sort(),
      relationshipTypes: Array.from(relationshipTypes).sort(),
    });
    setShowSchemaView(true);
  };

  const selectedItem = useMemo(() => {
    if (!selected) return undefined;

    if (selected.type === "node") {
      return allNodes.find((n) => n.id === selected.id);
    } else {
      return allRelationships.find((r) => r.id === selected.id);
    }
  }, [selected, allNodes, allRelationships]);

  // Always show checkboxes in embedded view for filtering
  const checkBoxView = true;

  const headerTitle = "Graph Visualization";

  if (nodeValues.length === 0 && relationshipValues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Visualization</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No graph data available. Please load sample data or connect to your
            backend first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <Flex
            className="w-full"
            alignItems="center"
            flexDirection="row"
            justifyContent="space-between"
          >
            <div className="flex items-center">
              <h2 className="text-xl font-semibold">{headerTitle}</h2>
              {viewPoint !== graphLabels.chatInfoView && (
                <div className="flex items-center ml-4">
                  <span>
                    <InformationCircleIconOutline className="n-size-token-6" />
                  </span>
                  <span className="n-body-small ml-1">
                    {graphLabels.chunksInfo}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Focus Controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Focus Mode:
                </label>
                <input
                  type="checkbox"
                  checked={showOnlyConnected}
                  onChange={(e) => setShowOnlyConnected(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  Show only connected
                </span>
              </div>

              {/* Degree Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Min Degree:
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={minDegree}
                  onChange={(e) => setMinDegree(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              {checkBoxView && (
                <CheckboxSelection
                  graphType={graphType}
                  loading={loading}
                  handleChange={handleCheckboxChange}
                  {...getCheckboxConditions(allNodes)}
                />
              )}
            </div>
          </Flex>
        </div>

        <div className="flex" style={{ height: "600px" }}>
          <div
            className="bg-palette-neutral-bg-default relative"
            style={{ width: "100%", flex: "1" }}
          >
            {loading ? (
              <div className="my-40 flex items-center justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : status === "danger" ? (
              <div className="my-40 flex items-center justify-center">
                <Banner
                  name="graph banner"
                  description={statusMessage}
                  type={status}
                  usage="inline"
                />
              </div>
            ) : node.length === 0 &&
              relationship.length === 0 &&
              graphType.length !== 0 ? (
              <div className="my-40 flex items-center justify-center">
                <Banner
                  name="graph banner"
                  description={graphLabels.noNodesRels}
                  type="danger"
                  usage="inline"
                />
              </div>
            ) : graphType.length === 0 && checkBoxView ? (
              <div className="my-40 flex items-center justify-center">
                <Banner
                  name="graph banner"
                  description={graphLabels.selectCheckbox}
                  type="danger"
                  usage="inline"
                />
              </div>
            ) : (
              <>
                <div className="flex" style={{ height: "100%" }}>
                  <div
                    className="bg-palette-neutral-bg-default relative"
                    style={{ width: "100%", flex: "1" }}
                  >
                    <InteractiveNvlWrapper
                      nodes={node}
                      rels={relationship}
                      nvlOptions={nvlOptions}
                      ref={nvlRef}
                      mouseEventCallbacks={{ ...mouseEventCallbacks }}
                      interactionOptions={{
                        selectOnClick: true,
                      }}
                      nvlCallbacks={nvlCallbacks}
                    />
                    <IconButtonArray
                      orientation="vertical"
                      isFloating={true}
                      className="absolute top-4 right-4"
                    >
                      <IconButtonWithToolTip
                        label="Schema View"
                        text="Schema View"
                        onClick={() => handleSchemaView(node, relationship)}
                        placement="left"
                      >
                        <ExploreIcon className="n-size-token-7" />
                      </IconButtonWithToolTip>
                    </IconButtonArray>
                    <IconButtonArray
                      orientation="vertical"
                      isFloating={true}
                      className="absolute bottom-4 right-4"
                    >
                      {viewPoint !== "chatInfoView" && (
                        <IconButtonWithToolTip
                          label="Refresh"
                          text="Refresh graph"
                          onClick={handleRefresh}
                          placement="left"
                          disabled={disableRefresh}
                        >
                          <ArrowPathIconOutline className="n-size-token-7" />
                        </IconButtonWithToolTip>
                      )}
                      <IconButtonWithToolTip
                        label="Zoomin"
                        text="Zoom in"
                        onClick={handleZoomIn}
                        placement="left"
                      >
                        <MagnifyingGlassPlusIconOutline className="n-size-token-7" />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip
                        label="Zoom out"
                        text="Zoom out"
                        onClick={handleZoomOut}
                        placement="left"
                      >
                        <MagnifyingGlassMinusIconOutline className="n-size-token-7" />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip
                        label="Zoom to fit"
                        text="Zoom to fit"
                        onClick={handleZoomToFit}
                        placement="left"
                      >
                        <FitToScreenIcon className="n-size-token-7" />
                      </IconButtonWithToolTip>
                    </IconButtonArray>
                  </div>
                </div>
              </>
            )}
          </div>
          <ResizePanelDetails open={true}>
            {selectedItem !== undefined ? (
              <GraphPropertiesPanel
                inspectedItem={selectedItem as BasicNode | BasicRelationship}
                newScheme={newScheme}
              />
            ) : (
              <ResultOverview
                nodes={node}
                relationships={relationship}
                newScheme={newScheme}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setNodes={setNode}
                setRelationships={setRelationship}
              />
            )}
          </ResizePanelDetails>
        </div>
      </div>

      {/* Schema View Modal */}
      {showSchemaView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Graph Schema
                </h3>
                <button
                  onClick={() => setShowSchemaView(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
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
              <p className="text-sm text-gray-600 mt-1">
                Schema extracted from current graph data
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Node Labels */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415zM9 12a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Node Labels ({schemaData.nodeLabels.length})
                  </h4>
                  {schemaData.nodeLabels.length > 0 ? (
                    <div className="space-y-2">
                      {schemaData.nodeLabels.map((label, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="font-medium text-gray-900">
                            {label}
                          </span>
                          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded border">
                            Node Type
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
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
                      <p>No node labels found</p>
                    </div>
                  )}
                </div>

                {/* Relationship Types */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Relationship Types ({schemaData.relationshipTypes.length})
                  </h4>
                  {schemaData.relationshipTypes.length > 0 ? (
                    <div className="space-y-2">
                      {schemaData.relationshipTypes.map((type, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="font-medium text-gray-900">
                            {type}
                          </span>
                          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded border">
                            Relationship
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <p>No relationship types found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="text-sm font-medium text-blue-900 mb-2">
                  Schema Summary
                </h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Node Types:</span>
                    <span className="ml-2 font-medium text-blue-900">
                      {schemaData.nodeLabels.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">
                      Total Relationship Types:
                    </span>
                    <span className="ml-2 font-medium text-blue-900">
                      {schemaData.relationshipTypes.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSchemaView(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmbeddedGraphView;
