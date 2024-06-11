import { useMemo } from 'react';
import { LegendChipProps } from '../types';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title, nodes }) => {
  const chunkcount = useMemo(
    // @ts-ignore
    () => [...new Set(nodes?.filter((n) => n?.labels?.includes(title)).map((i) => i.id))].length,
    []
  );
  return (
    <div className='legend' key={scheme.key} style={{ backgroundColor: `${scheme[title]}` }}>
      {title}
      {chunkcount && `(${chunkcount})`}
    </div>
  );
};
