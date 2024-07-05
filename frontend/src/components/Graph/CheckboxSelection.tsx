import { Checkbox } from '@neo4j-ndl/react';
import React from 'react';
import { CheckboxSectionProps } from '../../types';

const CheckboxSelection: React.FC<CheckboxSectionProps> = ({ graphType, loading, handleChange }) => (
  <div className='flex gap-5 mt-2 justify-between'>
    <div className='flex gap-5'>
      <Checkbox
        checked={graphType.includes('Document')}
        label='Document'
        disabled={(graphType.includes('Document') && graphType.length === 1) || loading}
        onChange={() => handleChange('Document')}
      />
      <Checkbox
        checked={graphType.includes('Entities')}
        label='Entities'
        disabled={(graphType.includes('Entities') && graphType.length === 1) || loading}
        onChange={() => handleChange('Entities')}
      />
      <Checkbox
        checked={graphType.includes('Chunk')}
        label='Chunks'
        disabled={(graphType.includes('Chunk') && graphType.length === 1) || loading}
        onChange={() => handleChange('Chunk')}
      />
    </div>
  </div>
);
export default CheckboxSelection;
