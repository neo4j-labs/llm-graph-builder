import React, { useMemo } from 'react';
import { LegendChipProps } from '../../types';
export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title, nodes }) => {
  const chunkcount = useMemo(() => {
    if (!nodes) return 0;
    return [...new Set(nodes.filter((n) => n.labels?.includes(title)).map((i) => i.id))].length;
  }, [nodes, title]);
  return (
    <div className='legend' key={scheme.key} style={{ backgroundColor: `${scheme[title]}` }}>
      {title}
      {chunkcount ? `(${chunkcount})` : ''}
    </div>
  );
};
