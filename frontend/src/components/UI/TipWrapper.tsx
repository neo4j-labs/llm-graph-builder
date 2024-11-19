import { Tooltip } from '@neo4j-ndl/react';
import { Side } from '../../types';

function TooltipWrapper({
  placement = 'right',
  children,
  tooltip,
}: {
  placement: Side;
  children: React.ReactNode;
  tooltip: string;
}) {
  return (
    <Tooltip type='simple' placement={placement}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  );
}
export default TooltipWrapper;
