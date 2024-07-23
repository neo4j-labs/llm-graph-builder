import { Box, Flex } from '@neo4j-ndl/react';
import Markdown from 'react-markdown';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';

export default function VectorIndexMisMatchAlert({
  vectorIndexLoading,
  recreateVectorIndex,
}: {
  vectorIndexLoading: boolean;
  recreateVectorIndex: () => Promise<void>;
}) {
  return (
    <Flex>
      <Box>
        <Markdown className='whitespace-pre-wrap'>
          {`**Vector Index Incompatibility** 
The existing Neo4j vector index dimension is incompatible with the supported dimension for this application. 
To proceed, please choose one of the following options: 
**Recreate Vector Index:** Click "Re-Create Vector Index" to generate a compatible vector index. 
**Use a Different Instance:** Connect to a Neo4j instance with a compatible vector index configuration  `}
        </Markdown>
      </Box>
      <Box className='n-size-full n-flex n-flex-col n-items-center n-justify-center'>
        <ButtonWithToolTip
          text='creates the supported vector index'
          label='creates the supported vector index'
          placement='top'
          loading={vectorIndexLoading}
          onClick={() => recreateVectorIndex()}
          className='!w-full'
          color='danger'
        >
          Re-Create Vector Index
        </ButtonWithToolTip>
      </Box>
    </Flex>
  );
}
