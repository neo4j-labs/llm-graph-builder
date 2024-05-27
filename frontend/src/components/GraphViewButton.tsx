import React, { useState } from 'react';
import { Button } from '@neo4j-ndl/react';
import GraphViewModal from './GraphViewModal';

interface GraphViewButtonProps {
  chunk_ids: string;
}
const GraphViewButton: React.FC<GraphViewButtonProps> = ({ chunk_ids }) => {
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');

  const handleGraphViewClick = () => {
    setOpenGraphView(true);
    setViewPoint('chatInfoView');
  };
  return (
    <>
      <Button onClick={handleGraphViewClick} className='w-[48%]'>
        Graph View
      </Button>
      <GraphViewModal
        open={openGraphView}
        setGraphViewOpen={setOpenGraphView}
        viewPoint={viewPoint}
        chunk_ids={chunk_ids}
      />
    </>
  );
};
export default GraphViewButton;
