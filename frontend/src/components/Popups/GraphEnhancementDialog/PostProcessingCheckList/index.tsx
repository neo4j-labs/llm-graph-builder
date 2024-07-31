import { Box, Checkbox, Flex, Typography } from '@neo4j-ndl/react';
import { taskParam } from '../../../../utils/Constants';
import { capitalize } from '../../../../utils/Utils';

export default function PostProcessingCheckList() {
  return (
    <Flex gap='8'>
      <div>
        <Flex flexDirection='column'>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant='subheading-large'>These options allow you to fine-tune your knowledge graph for improved performance and deeper analysis</Typography>
          </Flex>
          <Flex justifyContent='space-between' flexDirection='column'>
            <Flex>
              <Typography variant='subheading-medium'>Update Similarity Graph :</Typography>
              <Typography variant='body-medium'>
                This option refines the connections between different pieces of information (chunks) within your
                knowledge graph. By leveraging a k-nearest neighbor algorithm with a similarity threshold (KNN_MIN_SCORE
                of 0.8), this process identifies and links chunks with high semantic similarity. This results in a more
                interconnected and insightful knowledge representation, enabling more accurate and relevant search
                results.
              </Typography>
            </Flex>
            <Flex>
              <Typography variant='subheading-medium'>Create Fulltext Index :</Typography>
              <Typography variant='body-medium'>
                This option optimizes search capabilities within your knowledge graph. It rebuilds the full-text index
                on database labels, ensuring faster and more efficient retrieval of information. This is particularly
                beneficial for large knowledge graphs, as it significantly speeds up keyword-based searches and improves
                overall query performance..
              </Typography>
            </Flex>
            <Flex>
              <Typography variant='subheading-medium'>Create Entity Embeddings :</Typography>
              <Typography variant='body-medium'>
                Enhances entity analysis by generating numerical representations (embeddings) that capture their
                semantic meaning. This facilitates tasks like clustering similar entities, identifying duplicates, and
                performing similarity-based searches.
              </Typography>
            </Flex>
          </Flex>
        </Flex>
      </div>
      <Flex>
      {taskParam.map((task, index) => (
        <Box key={index}>
          <Checkbox
            label={<Typography variant='subheading-large'>{task
              .split('_')
              .map((s) => capitalize(s))
              .join(' ')}</Typography>
              }
          ></Checkbox>
        </Box>
      ))}
      </Flex>
     
    </Flex>
  );
}
