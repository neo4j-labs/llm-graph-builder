import { useMemo } from 'react';
import { LegendChipProps } from '../types';
import { colors } from '../utils/Constants';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title, nodes }) => {
  const showCount = useMemo(() => Object.keys(scheme).length <= colors.length, []);
  const chunkcount = useMemo(
    // @ts-ignore
    () => [...new Set(nodes?.filter((n) => n?.labels?.includes(title)).map((i) => i.caption))].length,
    []
  );
  return (
    <div className='legend' key={scheme.key} style={{ backgroundColor: `${scheme[title]}` }}>
      {title}
      {showCount && chunkcount && `(${chunkcount})`}
    </div>
  );
};
