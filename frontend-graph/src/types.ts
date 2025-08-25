import React from "react";
import type { Node, Relationship } from "@neo4j-nvl/base";

export interface OptionType {
  readonly value: string;
  readonly label: string;
}

export type GraphType = "Entities" | "DocumentChunk" | "Communities";

export type EntityType = "node" | "relationship";

export type Scheme = Record<string, string>;

export interface ExtendedNode extends Node {
  labels: string[];
  properties: {
    fileName?: string;
    [key: string]: any;
  };
}

export interface ExtendedRelationship extends Relationship {
  count?: number;
  startNodeId?: string;
  endNodeId?: string;
  properties?: Record<string, any>;
}

export interface BasicNode {
  id: string;
  type: string;
  labels: string[];
  properties: Record<string, string>;
  propertyTypes: Record<string, string>;
}

export interface BasicRelationship {
  id: string;
  to: string;
  from: string;
  type: string;
  caption: string;
}

export interface GraphViewModalProps {
  open: boolean;
  inspectedName?: string;
  setGraphViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewPoint: string;
  nodeValues?: ExtendedNode[];
  relationshipValues?: ExtendedRelationship[];
  selectedRows?: any[] | undefined;
}

export interface SchemaViewModalProps {
  open: boolean;
  inspectedName?: string;
  setGraphViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewPoint: string;
  nodeValues?: ExtendedNode[] | OptionType[];
  relationshipValues?: ExtendedRelationship[] | string[] | OptionType[];
  selectedRows?: any[] | undefined;
  schemaLoading?: boolean;
  view?: string;
}

export interface CheckboxSectionProps {
  graphType: GraphType[];
  loading: boolean;
  handleChange: (graph: GraphType) => void;
  isCommunity: boolean;
  isDocChunk: boolean;
  isEntity: boolean;
}

export interface LegendChipProps {
  scheme: Scheme;
  label: string;
  type: "node" | "relationship" | "propertyKey";
  count?: number;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export interface GraphPropertiesPanelProps {
  inspectedItem: BasicNode | BasicRelationship;
  newScheme: Scheme;
}

export interface GraphPropertiesTableProps {
  propertiesWithTypes: {
    key: string;
    value: string | number | boolean | [];
  }[];
}

export interface OverViewProps {
  nodes: ExtendedNode[];
  relationships: ExtendedRelationship[];
  newScheme: Scheme;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setNodes: React.Dispatch<React.SetStateAction<ExtendedNode[]>>;
  setRelationships: React.Dispatch<
    React.SetStateAction<ExtendedRelationship[]>
  >;
}

export interface ResizePanelDetailsProps {
  open: boolean;
  children: React.ReactNode;
}

export interface IconButtonWithToolTipProps {
  label: string;
  text: string;
  onClick: () => void;
  placement?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
  children: React.ReactNode;
}

export interface ShowAllProps {
  initiallyShown: number;
  children: React.ReactNode;
}
