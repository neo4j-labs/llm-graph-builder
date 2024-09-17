import {
  Box,
  Typography,
  Flex,
  Tabs,
  LoadingSpinner,
  CypherCodeBlock,
  CypherCodeBlockProps,
  useCopyToClipboard,
  Banner,
  useMediaQuery,
} from '@neo4j-ndl/react';
import { DocumentDuplicateIconOutline, ClipboardDocumentCheckIconOutline } from '@neo4j-ndl/react/icons';
import '../../styling/info.css';
import Neo4jRetrievalLogo from '../../assets/images/Neo4jRetrievalLogo.png';
import {
  Chunk,
  Community,
  Entity,
  ExtendedNode,
  ExtendedRelationship,
  UserCredentials,
  chatInfoMessage,
} from '../../types';
import { useContext, useEffect, useMemo, useState } from 'react';
import GraphViewButton from '../Graph/GraphViewButton';
import { chunkEntitiesAPI } from '../../services/ChunkEntitiesInfo';
import { useCredentials } from '../../context/UserCredentials';
import ReactMarkdown from 'react-markdown';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { tokens } from '@neo4j-ndl/base';
import ChunkInfo from './ChunkInfo';
import EntitiesInfo from './EntitiesInfo';
import SourcesInfo from './SourcesInfo';

const ChatInfoModal: React.FC<chatInfoMessage> = ({
  sources,
  model,
  total_tokens,
  response_time,
  chunk_ids,
  mode,
  cypher_query,
  graphonly_entities,
  error,
}) => {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const [activeTab, setActiveTab] = useState<number>(error?.length ? 10 : mode === 'graph' ? 4 : 3);
  const [infoEntities, setInfoEntities] = useState<Entity[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const themeUtils = useContext(ThemeWrapperContext);
  const [, copy] = useCopyToClipboard();
  const [copiedText, setcopiedText] = useState<boolean>(false);

  const actions: CypherCodeBlockProps['actions'] = useMemo(
    () => [
      {
        title: 'copy',
        'aria-label': 'copy',
        children: (
          <>
            {copiedText ? (
              <ClipboardDocumentCheckIconOutline className='n-size-token-7' />
            ) : (
              <DocumentDuplicateIconOutline className='text-palette-neutral-text-icon' />
            )}
          </>
        ),
        onClick: () => {
          void copy(cypher_query as string);
          setcopiedText(true);
        },
      },
    ],
    [copiedText, cypher_query]
  );

  useEffect(() => {
    if (mode != 'graph' || error?.trim() !== '') {
      (async () => {
        setLoading(true);
        try {
          const response = await chunkEntitiesAPI(
            userCredentials as UserCredentials,
            chunk_ids.map((c) => c.id).join(','),
            userCredentials?.database,
            mode === 'entity search+vector'
          );
          if (response.data.status === 'Failure') {
            throw new Error(response.data.error);
          }
          setInfoEntities(
            response.data.data.nodes.map((n: Entity) => {
              if (!n.labels.length && mode === 'entity search+vector') {
                return {
                  ...n,
                  labels: ['Entity'],
                };
              }
              return n;
            })
          );
          setNodes(
            response.data.data.nodes.map((n: ExtendedNode) => {
              if (!n.labels.length && mode === 'entity search+vector') {
                return {
                  ...n,
                  labels: ['Entity'],
                };
              }
              return n;
            })
          );
          setRelationships(response.data.data.relationships);
          setCommunities(response.data.data.community_data);
          const chunks = response.data.data.chunk_data.map((chunk: any) => {
            const chunkScore = chunk_ids.find((chunkdetail) => chunkdetail.id === chunk.id);
            return {
              ...chunk,
              score: chunkScore?.score,
            };
          });
          const sortedchunks = chunks.sort((a: any, b: any) => b.score - a.score);
          setChunks(sortedchunks);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching infomration:', error);
          setLoading(false);
        }
      })();
    }
    () => {
      setcopiedText(false);
    };
  }, [chunk_ids, mode, error]);

  const onChangeTabs = (tabId: number) => {
    setActiveTab(tabId);
  };

  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img
          src={Neo4jRetrievalLogo}
          style={{ width: isTablet ? 80 : 95, height: isTablet ? 80 : 95, marginRight: 10 }}
          loading='lazy'
        />
        <Box className='flex flex-col'>
          <Typography variant='h2'>Retrieval information</Typography>
          <Typography variant='body-medium' className='mb-2'>
            To generate this response, the process took <span className='font-bold'>{response_time} seconds,</span>{' '}
            utilizing <span className='font-bold'>{total_tokens}</span> tokens with the model{' '}
            <span className='font-bold'>{model}</span> in{' '}
            <span className='font-bold'>{mode !== 'vector' ? mode.replace(/\+/g, ' & ') : mode}</span> mode.
          </Typography>
        </Box>
      </Box>
      {error?.length > 0 ? (
        <Banner type='danger'>{error}</Banner>
      ) : (
        <Tabs size='large' fill='underline' onChange={onChangeTabs} value={activeTab}>
          {mode != 'graph' ? <Tabs.Tab tabId={3}>Sources used</Tabs.Tab> : <></>}
          {mode != 'graph' ? <Tabs.Tab tabId={5}>Chunks</Tabs.Tab> : <></>}
          {mode === 'graph+vector' ||
          mode === 'graph' ||
          mode === 'graph+vector+fulltext' ||
          mode === 'entity search+vector' ? (
            <Tabs.Tab tabId={4}>Top Entities used</Tabs.Tab>
          ) : (
            <></>
          )}
          {mode === 'graph' && cypher_query?.trim()?.length ? (
            <Tabs.Tab tabId={6}>Generated Cypher Query</Tabs.Tab>
          ) : (
            <></>
          )}
          {mode === 'entity search+vector' ? <Tabs.Tab tabId={7}>Communities</Tabs.Tab> : <></>}
        </Tabs>
      )}
      <Flex className='p-4'>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={3}>
          <SourcesInfo loading={loading} sources={sources} mode={mode} chunks={chunks} />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={4}>
          <EntitiesInfo
            loading={loading}
            mode={mode}
            graphonly_entities={graphonly_entities}
            infoEntities={infoEntities}
          />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={5}>
          <ChunkInfo chunks={chunks} loading={loading} />
        </Tabs.TabPanel>
        <Tabs.TabPanel value={activeTab} tabId={6}>
          <CypherCodeBlock
            code={cypher_query as string}
            actions={actions}
            headerTitle=''
            theme={themeUtils.colorMode}
            className='min-h-40'
          />
        </Tabs.TabPanel>
        {mode === 'entity search+vector' ? (
          <Tabs.TabPanel value={activeTab} tabId={7}>
            {loading ? (
              <Box className='flex justify-center items-center'>
                <LoadingSpinner size='small' />
              </Box>
            ) : (
              <div className='p-4 h-80 overflow-auto'>
                <ul className='list-disc list-inside'>
                  {communities.map((community, index) => (
                    <li key={`${community.id}${index}`} className='mb-2'>
                      <div>
                        <Flex flexDirection='row' gap='2'>
                          <Typography variant='subheading-medium'>ID : </Typography>
                          <Typography variant='subheading-medium'>{community.id}</Typography>
                        </Flex>
                        <ReactMarkdown>{community.summary}</ReactMarkdown>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tabs.TabPanel>
        ) : (
          <></>
        )}
      </Flex>
      {activeTab == 4 && nodes?.length && relationships?.length ? (
        <Box className='button-container flex mt-2 justify-center'>
          <GraphViewButton nodeValues={nodes} relationshipValues={relationships} />
        </Box>
      ) : (
        <></>
      )}
    </Box>
  );
};
export default ChatInfoModal;
