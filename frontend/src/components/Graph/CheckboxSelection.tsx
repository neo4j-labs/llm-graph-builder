import { Checkbox } from '@neo4j-ndl/react';
import React from 'react';
import { CheckboxSectionProps } from '../../types';

const CheckboxSelection: React.FC<CheckboxSectionProps> = ({ graphType, loading, handleChange }) => (
  <div className='flex gap-5 mt-2 justify-between'>
    <div className='flex gap-5'>
      <Checkbox
        checked={graphType.includes('__Document__')}
        label='__Document__'
        disabled={(graphType.includes('__Document__') && graphType.length === 1) || loading}
        onChange={() => handleChange('__Document__')}
      />
      <Checkbox
        checked={graphType.includes('Entities')}
        label='Entities'
        disabled={(graphType.includes('Entities') && graphType.length === 1) || loading}
        onChange={() => handleChange('Entities')}
      />
      <Checkbox
        checked={graphType.includes('__Chunk__')}
        label='Chunks'
        disabled={(graphType.includes('__Chunk__') && graphType.length === 1) || loading}
        onChange={() => handleChange('__Chunk__')}
      />
    </div>
  </div>
);
export default CheckboxSelection;
