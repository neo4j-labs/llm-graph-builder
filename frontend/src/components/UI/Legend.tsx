import { GraphLabel } from '@neo4j-ndl/react';

export default function Legend({
  bgColor,
  title,
  chunkCount,
  className,
}: {
  bgColor: string;
  title: string;
  chunkCount?: number;
  className?: string;
}) {
  return (
    <GraphLabel type='node' className={`legend ${className}`} style={{ backgroundColor: `${bgColor}` }}>
      {title}
      {chunkCount && `(${chunkCount})`}
    </GraphLabel>
  );
}
