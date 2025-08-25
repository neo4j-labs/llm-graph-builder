import React from "react";
import { ExtendedNode, ExtendedRelationship } from "../../types";

export const getSampleGraphData = () => {
  const sampleNodes: ExtendedNode[] = [
    {
      id: "1",
      labels: ["Person"],
      properties: {
        name: "Alice",
        age: 30,
        occupation: "Engineer",
      },
    },
    {
      id: "2",
      labels: ["Person"],
      properties: {
        name: "Bob",
        age: 25,
        occupation: "Designer",
      },
    },
    {
      id: "3",
      labels: ["Company"],
      properties: {
        name: "TechCorp",
        industry: "Technology",
        founded: 2020,
      },
    },
    {
      id: "4",
      labels: ["Project"],
      properties: {
        name: "GraphBuilder",
        status: "Active",
        description: "LLM Graph Builder Project",
      },
    },
  ];

  const sampleRelationships: ExtendedRelationship[] = [
    {
      id: "1",
      from: "1",
      to: "3",
      type: "WORKS_FOR",
      properties: {
        since: 2022,
        role: "Senior Engineer",
      },
    },
    {
      id: "2",
      from: "2",
      to: "3",
      type: "WORKS_FOR",
      properties: {
        since: 2023,
        role: "UI Designer",
      },
    },
    {
      id: "3",
      from: "1",
      to: "4",
      type: "LEADS",
      properties: {
        since: 2024,
      },
    },
    {
      id: "4",
      from: "2",
      to: "4",
      type: "CONTRIBUTES_TO",
      properties: {
        role: "Design Lead",
      },
    },
    {
      id: "5",
      from: "1",
      to: "2",
      type: "COLLABORATES_WITH",
      properties: {
        projects: ["GraphBuilder"],
      },
    },
  ];

  return { nodes: sampleNodes, relationships: sampleRelationships };
};

interface SampleDataProps {
  onLoadSampleData: (
    nodes: ExtendedNode[],
    relationships: ExtendedRelationship[]
  ) => void;
}

const SampleData: React.FC<SampleDataProps> = ({ onLoadSampleData }) => {
  const handleLoadSample = () => {
    const { nodes, relationships } = getSampleGraphData();
    onLoadSampleData(nodes, relationships);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">Sample Data</h3>
      <p className="text-gray-600 mb-4">
        Load sample graph data to test the visualization. This creates a simple
        graph with people, companies, and projects.
      </p>
      <button
        onClick={handleLoadSample}
        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Load Sample Data
      </button>
    </div>
  );
};

export default SampleData;
