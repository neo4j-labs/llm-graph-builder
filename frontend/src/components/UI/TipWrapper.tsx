import { Tooltip } from '@neo4j-ndl/react';
import { Side } from '../../types';

function TooltipWrapper({
  placement = 'right',
  children,
  tooltip,
  hasButtonWrapper = false,
}: {
  placement: Side;
  children: React.ReactNode;
  tooltip: string;
  hasButtonWrapper?: boolean;
}) {
  return (
    <Tooltip type='simple' placement={placement}>
      <Tooltip.Trigger hasButtonWrapper={hasButtonWrapper}>{children}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  );
}
export default TooltipWrapper;
