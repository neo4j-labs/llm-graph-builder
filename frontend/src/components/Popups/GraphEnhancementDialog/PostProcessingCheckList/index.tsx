import { Checkbox, Flex, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { POST_PROCESSING_JOBS } from '../../../../utils/Constants';
import { capitalize } from '../../../../utils/Utils';
import { useFileContext } from '../../../../context/UsersFiles';
import { tokens } from '@neo4j-ndl/base';
import { useCredentials } from '../../../../context/UserCredentials';
export default function PostProcessingCheckList() {
  const { breakpoints } = tokens;
  const tablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const { postProcessingTasks, setPostProcessingTasks } = useFileContext();
  const { isGdsActive } = useCredentials();
  return (
    <Flex gap={tablet ? '6' : '8'}>
      <div>
        <Flex flexDirection='column'>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant={tablet ? 'subheading-medium' : 'subheading-large'}>
              These options allow you to fine-tune your knowledge graph for improved performance and deeper analysis
            </Typography>
          </Flex>
          <Flex justifyContent='space-between' flexDirection='column' gap='6'>
            {POST_PROCESSING_JOBS.map((job, idx) => {
              const isCreateCommunities = job.title === 'enable_communities';
              return (
                <Flex key={`${job.title}${idx}`}>
                  <Checkbox
                    label={
                      <Typography variant='label'>
                        {job.title
                          .split('_')
                          .map((s) => capitalize(s))
                          .join(' ')}
                      </Typography>
                    }
                    checked={
                      isCreateCommunities
                        ? isGdsActive && postProcessingTasks.includes(job.title)
                        : postProcessingTasks.includes(job.title)
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPostProcessingTasks((prev) => [...prev, job.title]);
                      } else {
                        setPostProcessingTasks((prev) => prev.filter((s) => s !== job.title));
                      }
                    }}
                    disabled={isCreateCommunities && !isGdsActive}
                    aria-label='checkbox-postProcessing'
                  />
                  <Typography variant={tablet ? 'body-small' : 'body-medium'}>{job.description}</Typography>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </div>
    </Flex>
  );
}
