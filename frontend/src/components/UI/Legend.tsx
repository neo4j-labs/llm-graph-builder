import { GraphLabel } from '@neo4j-ndl/react';

export default function Legend({
  bgColor,
  title,
  count,
  type,
  onClick,
  className,
}: {
  bgColor: string;
  title: string;
  count?: number;
  type: 'node' | 'relationship' | 'propertyKey';
  className?: string;
  tabIndex?: number;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <GraphLabel type={type} className={`${className} legend`} color={bgColor} onClick={onClick}>
      {title} {count !== undefined && `(${count})`}
    </GraphLabel>
  );
}
