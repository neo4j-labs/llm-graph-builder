import { Checkbox, Flex, Typography } from '@neo4j-ndl/react';
import { capitalize } from '../../../../utils/Utils';
import { useMemo } from 'react';

export default function SelectedJobList({
  postProcessingTasks,
  isGdsActive,
}: {
  postProcessingTasks: string[];
  isGdsActive: boolean;
}) {
  const ongoingPostProcessingTasks = useMemo(
    () =>
      (isGdsActive
        ? postProcessingTasks.includes('enable_communities')
          ? postProcessingTasks
          : postProcessingTasks.filter((s) => s != 'enable_communities')
        : postProcessingTasks.filter((s) => s != 'enable_communities')),
    [isGdsActive, postProcessingTasks]
  );
  return (
    <Flex justifyContent='space-between' flexDirection='column' gap='4'>
      {ongoingPostProcessingTasks.map((task, idx) => {
        return (
          <Checkbox
            key={idx}
            label={
              <Typography variant='label'>
                {task
                  .split('_')
                  .map((s) => capitalize(s))
                  .join(' ')}
              </Typography>
            }
            checked={true}
            disabled={true}
            aria-label='Selected-postprocessing-jobs'
          />
        );
      })}
    </Flex>
  );
}
