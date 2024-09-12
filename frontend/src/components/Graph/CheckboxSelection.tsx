import { Checkbox } from '@neo4j-ndl/react';
import React from 'react';
import { CheckboxSectionProps } from '../../types';
import { graphLabels } from '../../utils/Constants';

const CheckboxSelection: React.FC<CheckboxSectionProps> = ({ graphType, loading, handleChange, isgds }) => (
  <div className='flex gap-5 mt-2 justify-between'>
    <div className='flex gap-5'>
      <Checkbox
        checked={graphType.includes('DocumentChunk')}
        label={graphLabels.docChunk}
        disabled={loading}
        onChange={() => handleChange('DocumentChunk')}
      />
      <Checkbox
        checked={graphType.includes('Entities')}
        label={graphLabels.entities}
        disabled={loading}
        onChange={() => handleChange('Entities')}
      />
      {isgds && (<Checkbox
        checked={graphType.includes('Communities')}
        label={graphLabels.community}
        disabled={loading}
        onChange={() => handleChange('Communities')}
      />)}
    </div>
  </div>
);
export default CheckboxSelection;
