import React, { useState } from 'react';
import { Button } from '@neo4j-ndl/react';
import GraphViewModal from './GraphViewModal';
import { GraphViewButtonProps, ExtendedNode, ExtendedRelationship, UserCredentials } from '../../types';
import { getNeighbors } from '../../services/GraphQuery';
import { useCredentials } from '../../context/UserCredentials';

const GraphViewButton: React.FC<GraphViewButtonProps> = ({ fill, label, viewType }) => {
  const { userCredentials } = useCredentials();
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
  const [nodeValues, setNodeValues] = useState<ExtendedNode[]>([]);
  const [relationshipValues, setRelationshipValues] = useState<ExtendedRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  // List of views that allow the graph API call
  const allowedViews = ['Community', 'Chunk', 'Entity'];
  const handleGraphViewClick = async () => {
    if (!allowedViews.includes(viewType)) {
      // If the viewType isn't one of the allowed views, just open the graph view without fetching
      setOpenGraphView(true);
      setViewPoint('defaultView');
      return;
    }
    setLoading(true);
    try {
      const result = await getNeighbors(userCredentials as UserCredentials, label); // Assuming 'label' is the element ID
      if (result && result.data.data.nodes.length > 0) {
        const nodes = result.data.data.nodes
          .map((f: any) => f)
          .filter((node: ExtendedNode) => node.labels.length === 1);
        const nodeIds = new Set(nodes.map((node: any) => node.element_id));
        const relationships = result.data.data.relationships
          .map((f: any) => f)
          .filter((rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id));
        // Set nodes and relationships
        setNodeValues(nodes);
        setRelationshipValues(relationships);
      }
    } catch (error: any) {
      console.log('Error fetching neighbors:', error);
    } finally {
      setLoading(false);
      setOpenGraphView(true); // Open the modal after fetching data
      setViewPoint('chatInfoView');
    }
  };
  return (
    <>
      <Button fill={fill} onClick={handleGraphViewClick} disabled={loading}>
        {label}
      </Button>
      <GraphViewModal
        open={openGraphView}
        setGraphViewOpen={setOpenGraphView}
        viewPoint={viewPoint}
        nodeValues={nodeValues}
        relationshipValues={relationshipValues}
      />
    </>
  );
};
export default GraphViewButton;