import { Checkbox } from '@neo4j-ndl/react';
import React from 'react';
import { CheckboxSectionProps } from '../../types';
const CheckboxSelection: React.FC<CheckboxSectionProps> = ({ graphType, loading, handleChange }) => (
  <div className='flex gap-5 mt-2 justify-between'>
    <div className='flex gap-5'>
      <Checkbox
        checked={graphType.includes('DocumentChunk')}
        label='Document & Chunk'
        disabled={(graphType.includes('DocumentChunk') && graphType.length === 1) || loading}
        onChange={() => handleChange('DocumentChunk')}
      />
      <Checkbox
        checked={graphType.includes('Entities')}
        label='Entities'
        disabled={(graphType.includes('Entities') && graphType.length === 1) || loading}
        onChange={() => handleChange('Entities')}
      />
    </div>
  </div>
);
export default CheckboxSelection;
