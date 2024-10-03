import { Flex, Typography } from '@neo4j-ndl/react';
import SelectedJobList from './SelectedJobList';

export default function PostProcessingToast({
  postProcessingTasks,
  isGdsActive,
}: {
  postProcessingTasks: string[];
  isGdsActive: boolean;
}) {
  return (
    <Flex flexDirection='column'>
      <Typography variant='subheading-medium'>Some Q&A functionality will only be available afterwards</Typography>
      <Typography variant='subheading-small'>Ongoing Post Processing Jobs</Typography>
      <SelectedJobList postProcessingTasks={postProcessingTasks} isGdsActive={isGdsActive} />
    </Flex>
  );
}
