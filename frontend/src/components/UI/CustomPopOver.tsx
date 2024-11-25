import { Popover } from '@neo4j-ndl/react';
import { FunctionComponent, ReactNode } from 'react';
type Props = {
  children: ReactNode;
  Trigger: ReactNode;
};
const CustomPopOver: FunctionComponent<Props> = ({ children, Trigger }) => {
  return (
    <Popover>
      <Popover.Trigger>{Trigger}</Popover.Trigger>
      <Popover.Content>{children}</Popover.Content>
    </Popover>
  );
};
export default CustomPopOver;
