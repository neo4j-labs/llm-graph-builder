import { useMemo } from 'react';
import { LegendChipProps } from '../../types';
import Legend from '../UI/Legend';
import { titleCheck } from '../../utils/Utils';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title, nodes }) => {
  const titleVal = titleCheck(title);
  const chunkcount = useMemo(
    () => [...new Set(nodes?.filter((n) => n?.labels?.includes(title)).map((i) => i.id))].length,
    [nodes]
  );
  return (
    <Legend
      title={titleVal ? title.replace(/__/g, '').toUpperCase() : title}
      className={titleVal ? 'italic font-bold' : ''}
      chunkCount={chunkcount}
      bgColor={scheme[title]}
    ></Legend>
  );
};
