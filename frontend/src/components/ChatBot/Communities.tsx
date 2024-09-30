import { Box, LoadingSpinner, Flex, Typography } from '@neo4j-ndl/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { CommunitiesProps } from '../../types';

const CommunitiesInfo: FC<CommunitiesProps> = ({ loading, communities }) => {
  console.log('communities', communities);
  return (
    <>
      {loading ? (
        <Box className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </Box>
      ) : communities?.length > 0 ? (
        <div className='p-4 h-80 overflow-auto'>
          <ul className='list-disc list-inside'>
            {communities.map((community, index) => (
              <li key={`${community.id}${index}`} className='mb-2'>
                <div>
                  <Flex flexDirection='row' gap='2'>
                    <Typography variant='subheading-medium'>ID : </Typography>
                    <Typography variant='subheading-medium'>{community.id}</Typography>
                  </Flex>
                  <Flex flexDirection='row' gap='2'>
                    <Typography variant='subheading-medium'>Score : </Typography>
                    <Typography variant='subheading-medium'>{community.score}</Typography>
                  </Flex>
                  <ReactMarkdown>{community.summary}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span className='h6 text-center'> No Communities Found</span>
      )}
    </>
  );
};

export default CommunitiesInfo;
