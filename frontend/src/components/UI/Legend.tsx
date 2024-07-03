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
    <div className='legend' style={{ backgroundColor: `${bgColor}` }}>
      {title}
      {chunkCount && `(${chunkCount})`}
    </div>
  );
}
