import { useMemo } from 'react';
import { LegendChipProps } from '../../types';
import Legend from '../UI/Legend';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title, nodes }) => {
  const chunkcount = useMemo(
    // @ts-ignore
    () => [...new Set(nodes?.filter((n) => n?.labels?.includes(title)).map((i) => i.id))].length,
    []
  );
  return <Legend title={title} chunkCount={chunkcount} bgColor={scheme[title]}></Legend>;
};
