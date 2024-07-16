import { Tag } from "@neo4j-ndl/react";

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
    <Tag  className='legend' style={{ backgroundColor: `${bgColor}` }}>
      {title}
      {chunkCount && `(${chunkCount})`}
    </Tag>
  );
}
