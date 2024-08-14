import { GraphLabel } from '@neo4j-ndl/react';

export default function Legend({
  bgColor,
  title,
  count,
  type
}: {
  bgColor: string;
  title: string;
  count?: number;
  type: 'node' | 'relationship' | 'propertyKey';
  className?: string;
  tabIndex?: number;
}) {
  return (
    <GraphLabel type={type} className='legend' color={bgColor}>
      {title} {count !== undefined && `(${count})`}
    </GraphLabel>)
}
