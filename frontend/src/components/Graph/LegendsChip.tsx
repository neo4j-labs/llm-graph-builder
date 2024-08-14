import { LegendChipProps } from '../../types';
import Legend from '../UI/Legend';

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({scheme, label,type , count}) => {

  return <Legend title={label} count={count} bgColor={scheme[label]} type ={type} ></Legend>;
};
