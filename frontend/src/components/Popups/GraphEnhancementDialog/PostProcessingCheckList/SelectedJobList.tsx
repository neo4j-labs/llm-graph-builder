import { Checkbox, Flex, Typography } from '@neo4j-ndl/react';
import { capitalize } from '../../../../utils/Utils';
import { useMemo } from 'react';

export default function SelectedJobList({
  postProcessingTasks,
  isGdsActive,
  isSchema,
}: {
  postProcessingTasks: string[];
  isGdsActive: boolean;
  isSchema: boolean;
}) {
  const ongoingPostProcessingTasks = useMemo(
    () =>
      (isGdsActive
        ? isSchema
          ? postProcessingTasks.filter((task) => task !== 'graph_checkup')
          : postProcessingTasks
        : isSchema
        ? postProcessingTasks.filter((task) => task !== 'graph_checkup' && task !== 'enable_communities')
        : postProcessingTasks.filter((task) => task !== 'enable_communities')),
    [isGdsActive, isSchema, postProcessingTasks]
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
            isChecked={true}
            isDisabled={true}
            ariaLabel='Selected-postprocessing-jobs'
          />
        );
      })}
    </Flex>
  );
}
