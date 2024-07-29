import { GraphLabel } from '@neo4j-ndl/react';

export default function Legend({
  bgColor,
  title,
  chunkCount,
}: {
  bgColor: string;
  title: string;
  chunkCount?: number;
}) {
  return (
    <GraphLabel type='node' className='legend' style={{ backgroundColor: `${bgColor}` }}>
      {title}
      {chunkCount && `(${chunkCount})`}
    </GraphLabel>
  );
}
