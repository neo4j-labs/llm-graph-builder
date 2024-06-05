import { ProgressBar } from '@neo4j-ndl/react';

export default function CustomProgressBar({ value }: { value: number }) {
  return <ProgressBar heading={value < 100 ? 'Uploading ' : 'Uploaded'} size='small' value={value}></ProgressBar>;
}
