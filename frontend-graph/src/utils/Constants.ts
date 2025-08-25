import { NvlOptions } from "@neo4j-nvl/base";
import { GraphType, OptionType } from "../types";

export const GRAPH_COLORS = {
  node: "#4CAF50",
  relationship: "#2196F3",
  default: "#9E9E9E",
};

export const GRAPH_TYPES = {
  ENTITIES: "Entities",
  DOCUMENT_CHUNK: "DocumentChunk",
  COMMUNITIES: "Communities",
} as const;

export const DEFAULT_GRAPH_OPTIONS = {
  nodeColor: GRAPH_COLORS.node,
  relationshipColor: GRAPH_COLORS.relationship,
  backgroundColor: "#ffffff",
  nodeSize: 20,
  relationshipWidth: 2,
};

export const nvlOptions: NvlOptions = {
  allowDynamicMinZoom: true,
  disableWebGL: true,
  maxZoom: 3,
  minZoom: 0.05,
  relationshipThreshold: 0.55,
  useWebGL: false,
  instanceId: "graph-preview",
  initialZoom: 1,
};

export const queryMap: {
  Document: string;
  Chunks: string;
  Entities: string;
  DocEntities: string;
  DocChunks: string;
  ChunksEntities: string;
  DocChunkEntities: string;
} = {
  Document: "document",
  Chunks: "chunks",
  Entities: "entities",
  DocEntities: "docEntities",
  DocChunks: "docChunks",
  ChunksEntities: "chunksEntities",
  DocChunkEntities: "docChunkEntities",
};

export const graphView: OptionType[] = [
  { label: "Lexical Graph", value: queryMap.DocChunks },
  { label: "Entity Graph", value: queryMap.Entities },
  { label: "Knowledge Graph", value: queryMap.DocChunkEntities },
];

export const intitalGraphType = (isGDSActive: boolean): GraphType[] => {
  return isGDSActive
    ? ["DocumentChunk", "Entities", "Communities"] // GDS is active, include communities
    : ["DocumentChunk", "Entities"]; // GDS is inactive, exclude communities
};

export const graphLabels = {
  showGraphView: "showGraphView",
  chatInfoView: "chatInfoView",
  generateGraph: "Generated Graph",
  inspectGeneratedGraphFrom: "Inspect Generated Graph from",
  document: "Document",
  chunk: "Chunk",
  documentChunk: "DocumentChunk",
  entities: "Entities",
  resultOverview: "Result Overview",
  totalNodes: "Total Nodes",
  noEntities: "No Entities Found",
  selectCheckbox: "Select atleast one checkbox for graph view",
  totalRelationships: "Total Relationships",
  nodeSize: 30,
  docChunk: "Document & Chunk",
  community: "Communities",
  noNodesRels: "No Nodes and No relationships",
  neighborView: "neighborView",
  chunksInfo: "We are visualizing 50 chunks at a time",
  showSchemaView: "showSchemaView",
  renderSchemaGraph: "Graph from Database Schema",
  generatedGraphFromUserSchema: "Generated Graph from User Defined Schema",
};

export const RESULT_STEP_SIZE = 25;
