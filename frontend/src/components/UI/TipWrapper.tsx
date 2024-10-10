import { Tip } from '@neo4j-ndl/react';
import { Side } from '../../types';

function TipWrapper({
  placement = 'right',
  children,
  tooltip,
}: {
  placement: Side;
  children: React.ReactNode;
  tooltip: string;
}) {
  return (
    <Tip allowedPlacements={[placement]}>
      <Tip.Trigger>{children}</Tip.Trigger>
      <Tip.Content>{tooltip}</Tip.Content>
    </Tip>
  );
}
export default TipWrapper;
