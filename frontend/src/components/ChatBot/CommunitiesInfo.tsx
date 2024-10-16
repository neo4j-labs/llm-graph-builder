import { Box, LoadingSpinner, Flex, Typography, TextLink } from '@neo4j-ndl/react';
import { FC, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CommunitiesProps, UserCredentials } from '../../types';
import { chatModeLables } from '../../utils/Constants';
import { getNeighbors } from '../../services/GraphQuery';
import { useCredentials } from '../../context/UserCredentials';
import GraphViewModal from '../Graph/GraphViewModal';

const CommunitiesInfo: FC<CommunitiesProps> = ({ loading, communities, mode }) => {
  const { userCredentials } = useCredentials();
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
  const [loadingGraphView, setLoadingGraphView] = useState(false);

  const handleCommunityClick = async (elementId: string) => {
    setLoadingGraphView(true);
    try {
      const result = await getNeighbors(userCredentials as UserCredentials, elementId);
      if (result && result.data.data.nodes.length > 0) {
        const nodes = result.data.data.nodes.filter((node: any) => node.labels.length === 1);
        const nodeIds = new Set(nodes.map((node: any) => node.element_id));
        const relationships = result.data.data.relationships.filter(
          (rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id)
        );
        setNeoNodes(nodes);
        setNeoRels(relationships);
        setOpenGraphView(true);
        setViewPoint('chatInfoView');
      }
    } catch (error: any) {
      console.log('error', error);
    }
    finally {
      setLoadingGraphView(false);
    }
  };
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
                    <TextLink className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`} label={`ID : ${community.id}`} onClick={() => handleCommunityClick(community.element_id)} >{`ID : ${community.id}`}</TextLink>
                  </Flex>
                  {mode === chatModeLables.global_vector && community.score && (
                    <Flex flexDirection='row' gap='2'>
                      <Typography variant='subheading-medium'>Score : </Typography>
                      <Typography variant='subheading-medium'>{community.score}</Typography>
                    </Flex>
                  )}
                  <ReactMarkdown>{community.summary}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span className='h6 text-center'> No Communities Found</span>
      )}
      {openGraphView && (
        <GraphViewModal
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={neoNodes}
          relationshipValues={neoRels}
        />
      )}
    </>
  );
};

export default CommunitiesInfo;
