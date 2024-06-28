import React, { useState } from 'react';
import { Button } from '@neo4j-ndl/react';
import GraphViewModal from './GraphViewModal';
import { Node, Relationship } from '@neo4j-nvl/base';

interface GraphViewButtonProps {
  nodeValues?: Node[];
  relationshipValues?: Relationship[];
}
const GraphViewButton: React.FC<GraphViewButtonProps> = ({ nodeValues, relationshipValues }) => {
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');

  const handleGraphViewClick = () => {
    setOpenGraphView(true);
    setViewPoint('chatInfoView');
  };
  return (
    <>
      <Button onClick={handleGraphViewClick}>Graph Entities used for Answer Generation</Button>
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
