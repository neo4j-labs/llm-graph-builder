import { calcWordColor } from "@neo4j-devtools/word-color";
import type { Relationship } from "@neo4j-nvl/base";
import {
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  Scheme,
  OptionType,
} from "../types";

// Graph Functions
export const getSize = (node: any) => {
  const size = node.properties?.size || node.properties?.weight || 1;
  return Math.max(10, Math.min(50, size * 20));
};

export const getNodeCaption = (node: any) => {
  const caption =
    node.properties?.name ||
    node.properties?.title ||
    node.properties?.id ||
    node.id;
  return caption?.length > 20 ? caption.substring(0, 20) + "..." : caption;
};

export const getIcon = (node: any) => {
  // Return undefined to prevent broken image errors since we don't have the SVG assets
  return undefined;
};

export const processGraphData = (
  neoNodes: ExtendedNode[],
  neoRels: ExtendedRelationship[]
) => {
  const finalNodes: ExtendedNode[] = neoNodes.map((node) => {
    const labels = node.labels || [];
    const color = calcWordColor(labels[0] || "default");

    return {
      ...node,
      id: node.id,
      labels: labels,
      properties: node.properties || {},
      caption: getNodeCaption(node),
      size: getSize(node),
      color: color,
      icon: getIcon(node),
    };
  });

  const finalRels: ExtendedRelationship[] = neoRels.map((rel) => {
    const color = calcWordColor(rel.type || "default");

    return {
      ...rel,
      id: rel.id,
      type: rel.type,
      from: rel.startNodeId || rel.from,
      to: rel.endNodeId || rel.to,
      caption: rel.type,
      color: color,
      width: 2,
    };
  });

  const scheme: Scheme = {};
  finalNodes.forEach((node) => {
    node.labels.forEach((label) => {
      if (!scheme[label]) {
        scheme[label] = calcWordColor(label);
      }
    });
  });

  finalRels.forEach((rel) => {
    if (!scheme[rel.type]) {
      scheme[rel.type] = calcWordColor(rel.type);
    }
  });

  return { finalNodes, finalRels, schemeVal: scheme };
};

export const filterData = (
  graphType: GraphType[],
  allNodes: ExtendedNode[],
  allRelationships: Relationship[],
  scheme: Scheme
) => {
  const filteredNodes: ExtendedNode[] = [];
  const filteredRelations: ExtendedRelationship[] = [];
  const filteredScheme: Scheme = {};

  if (graphType.includes("Entities")) {
    const entityNodes = allNodes.filter((node) =>
      node.labels.some(
        (label) => !label.includes("Chunk") && !label.includes("Community")
      )
    );
    filteredNodes.push(...entityNodes);
  }

  if (graphType.includes("DocumentChunk")) {
    const chunkNodes = allNodes.filter((node) =>
      node.labels.some((label) => label.includes("Chunk"))
    );
    filteredNodes.push(...chunkNodes);
  }

  if (graphType.includes("Communities")) {
    const communityNodes = allNodes.filter((node) =>
      node.labels.some((label) => label.includes("Community"))
    );
    filteredNodes.push(...communityNodes);
  }

  // Get relationships between filtered nodes
  const nodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredRels = allRelationships.filter(
    (rel) => nodeIds.has(rel.from) && nodeIds.has(rel.to)
  );

  filteredRelations.push(...filteredRels);

  // Build filtered scheme
  filteredNodes.forEach((node) => {
    node.labels.forEach((label) => {
      if (scheme[label] && !filteredScheme[label]) {
        filteredScheme[label] = scheme[label];
      }
    });
  });

  filteredRelations.forEach((rel) => {
    if (scheme[rel.type] && !filteredScheme[rel.type]) {
      filteredScheme[rel.type] = scheme[rel.type];
    }
  });

  return { filteredNodes, filteredRelations, filteredScheme };
};

export const getCheckboxConditions = (allNodes: ExtendedNode[]) => {
  const hasEntities = allNodes.some((node) =>
    node.labels.some(
      (label) => !label.includes("Chunk") && !label.includes("Community")
    )
  );
  const hasDocChunk = allNodes.some((node) =>
    node.labels.some((label) => label.includes("Chunk"))
  );
  const hasCommunity = allNodes.some((node) =>
    node.labels.some((label) => label.includes("Community"))
  );

  return {
    isEntity: hasEntities,
    isDocChunk: hasDocChunk,
    isCommunity: hasCommunity,
  };
};

export const graphTypeFromNodes = (allNodes: ExtendedNode[]): GraphType[] => {
  const graphTypes: GraphType[] = [];

  const hasEntities = allNodes.some((node) =>
    node.labels.some(
      (label) => !label.includes("Chunk") && !label.includes("Community")
    )
  );
  const hasDocChunk = allNodes.some((node) =>
    node.labels.some((label) => label.includes("Chunk"))
  );
  const hasCommunity = allNodes.some((node) =>
    node.labels.some((label) => label.includes("Community"))
  );

  if (hasEntities) graphTypes.push("Entities");
  if (hasDocChunk) graphTypes.push("DocumentChunk");
  if (hasCommunity) graphTypes.push("Communities");

  return graphTypes;
};

export const extractGraphSchemaFromRawData = (
  nodes: any[],
  relationships: any[]
): {
  nodes: OptionType[];
  relationships: OptionType[];
} => {
  const nodeLabels = new Set<string>();
  const relTypes = new Set<string>();

  nodes.forEach((node) => {
    if (node.labels) {
      node.labels.forEach((label: string) => nodeLabels.add(label));
    }
  });

  relationships.forEach((rel) => {
    if (rel.type) {
      relTypes.add(rel.type);
    }
  });

  const nodeOptions: OptionType[] = Array.from(nodeLabels).map((label) => ({
    value: label,
    label: label,
  }));

  const relOptions: OptionType[] = Array.from(relTypes).map((type) => ({
    value: type,
    label: type,
  }));

  return { nodes: nodeOptions, relationships: relOptions };
};
