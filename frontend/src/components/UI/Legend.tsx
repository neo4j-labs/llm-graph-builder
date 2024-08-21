import { GraphLabel } from '@neo4j-ndl/react';

export default function Legend({
  bgColor,
  title,
  count,
  type,
  onClick,
}: {
  bgColor: string;
  title: string;
  count?: number;
  type: 'node' | 'relationship' | 'propertyKey';
  tabIndex?: number;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <GraphLabel type={type} className='legend' color={bgColor} onClick={onClick}>
      {title} {count !== undefined && `(${count})`}
    </GraphLabel>
  );
}
