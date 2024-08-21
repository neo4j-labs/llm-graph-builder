import { Box, Flex } from '@neo4j-ndl/react';
import Markdown from 'react-markdown';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
import { useCredentials } from '../../../context/UserCredentials';

export default function VectorIndexMisMatchAlert({
  vectorIndexLoading,
  recreateVectorIndex,
  isVectorIndexAlreadyExists,
  userVectorIndexDimension,
  chunksExists,
}: {
  vectorIndexLoading: boolean;
  recreateVectorIndex: () => Promise<void>;
  isVectorIndexAlreadyExists: boolean;
  userVectorIndexDimension?: number;
  chunksExists: boolean;
}) {
  const { userCredentials } = useCredentials();
  return (
    <Flex>
      <Box>
        <Markdown className='whitespace-pre-wrap'>
          {isVectorIndexAlreadyExists
            ? `**Vector Index Incompatibility** 
The existing Neo4j vector index dimension (${userVectorIndexDimension}) is incompatible with the supported dimension (384) for this application. 
To proceed, please choose one of the following options: 
1.**Recreate Vector Index:** Click "Re-Create Vector Index" to generate a compatible vector index. 
2.**Use a Different Instance:** Connect to a Neo4j instance with a compatible vector index configuration  `
            : chunksExists
            ? `A vector index is essential for performing efficient similarity searches within your data. Without it, some chunks of data will be invisible to queries based on meaning and context. Creating a vector index unlocks the full potential of your data by allowing you to find related information quickly and accurately.`
            : ''}
        </Markdown>
      </Box>
      <Box className='n-size-full n-flex n-flex-col n-items-center n-justify-center'>
        <ButtonWithToolTip
          text={
            userCredentials === null
              ? 'please establish the connection before creating the index'
              : 'creates the supported vector index'
          }
          label='creates the supported vector index'
          placement='top'
          loading={vectorIndexLoading}
          onClick={() => recreateVectorIndex()}
          className='!w-full'
          color='danger'
          disabled={userCredentials === null}
        >
          {isVectorIndexAlreadyExists ? 'Re-Create Vector Index' : 'Create Vector Index'}
        </ButtonWithToolTip>
      </Box>
    </Flex>
  );
}
