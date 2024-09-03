import { LegendChipProps } from '../../types';
import { graphLabels } from '../../utils/Constants';
import Legend from '../UI/Legend';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, label, type, count, onClick }) => {
  return <Legend title={label} count={count} bgColor={scheme[label]} type={type} onClick={onClick} />;
};
