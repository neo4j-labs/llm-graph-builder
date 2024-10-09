import {
  Box,
  Typography,
  Flex,
  Tabs,
  CypherCodeBlock,
  CypherCodeBlockProps,
  useCopyToClipboard,
  Banner,
  useMediaQuery,
} from '@neo4j-ndl/react';
import { DocumentDuplicateIconOutline, ClipboardDocumentCheckIconOutline } from '@neo4j-ndl/react/icons';
import '../../styling/info.css';
import Neo4jRetrievalLogo from '../../assets/images/Neo4jRetrievalLogo.png';
import { Entity, ExtendedNode, UserCredentials, chatInfoMessage } from '../../types';
import { useContext, useEffect, useMemo, useState } from 'react';
import GraphViewButton from '../Graph/GraphViewButton';
import { chunkEntitiesAPI } from '../../services/ChunkEntitiesInfo';
import { useCredentials } from '../../context/UserCredentials';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { tokens } from '@neo4j-ndl/base';
import ChunkInfo from './ChunkInfo';
import EntitiesInfo from './EntitiesInfo';
import SourcesInfo from './SourcesInfo';
import CommunitiesInfo from './Communities';
import { chatModeLables } from '../../utils/Constants';
import { Relationship } from '@neo4j-nvl/base';
import { getChatMetrics } from '../../services/GetRagasMetric';
import MetricsTab from './MetricsTab';

const ChatInfoModal: React.FC<chatInfoMessage> = ({
  sources,
  model,
  total_tokens,
  response_time,
  nodeDetails,
  mode,
  cypher_query,
  graphonly_entities,
  error,
  entities_ids,
  metricanswer,
  metriccontexts,
  metricquestion,
  metricmodel,
  saveNodes,
  saveChunks,
  saveChatRelationships,
  saveCommunities,
  saveInfoEntitites,
  saveMetrics,
  toggleInfoLoading,
  toggleMetricsLoading,
  nodes,
  chunks,
  infoEntities,
  communities,
  metricDetails,
  relationships,
  infoLoading,
  metricsLoading,
}) => {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const [activeTab, setActiveTab] = useState<number>(
    error?.length ? 10 : mode === chatModeLables.global_vector ? 7 : mode === chatModeLables.graph ? 4 : 3
  );
  const { userCredentials } = useCredentials();
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
    if (mode != chatModeLables.graph || error?.trim() !== '') {
      (async () => {
        toggleInfoLoading();
        try {
          const response = await chunkEntitiesAPI(
            userCredentials as UserCredentials,
            userCredentials?.database,
            nodeDetails,
            entities_ids,
            mode
          );
          if (response.data.status === 'Failure') {
            throw new Error(response.data.error);
          }
          const nodesData = response?.data?.data?.nodes
            .map((f: Node) => f)
            .filter((node: ExtendedNode) => node.labels.length === 1);
          const nodeIds = new Set(nodesData.map((node: any) => node.element_id));
          const relationshipsData = response?.data?.data?.relationships
            .map((f: Relationship) => f)
            .filter((rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id));
          const communitiesData = response?.data?.data?.community_data;
          const chunksData = response?.data?.data?.chunk_data;

          saveInfoEntitites(
            nodesData.map((n: Entity) => {
              if (!n.labels.length && mode === chatModeLables.entity_vector) {
                return {
                  ...n,
                  labels: ['Entity'],
                };
              }
              return n;
            })
          );
          saveNodes(
            nodesData.map((n: ExtendedNode) => {
              if (!n.labels.length && mode === chatModeLables.entity_vector) {
                return {
                  ...n,
                  labels: ['Entity'],
                };
              }
              return n ?? [];
            })
          );
          saveChatRelationships(relationshipsData ?? []);
          saveCommunities(
            (communitiesData || [])
              .map((community: { element_id: string }) => {
                const communityScore = nodeDetails?.communitydetails?.find(
                  (c: { id: string }) => c.id === community.element_id
                );
                return {
                  ...community,
                  score: communityScore?.score ?? 1,
                };
              })
              .sort((a: any, b: any) => b.score - a.score)
          );

          saveChunks(
            chunksData
              .map((chunk: any) => {
                const chunkScore = nodeDetails?.chunkdetails?.find((c: any) => c.id === chunk.id);
                return {
                  ...chunk,
                  score: chunkScore?.score,
                };
              })
              .sort((a: any, b: any) => b.score - a.score)
          );
          toggleInfoLoading();
        } catch (error) {
          console.error('Error fetching information:', error);
          toggleInfoLoading();
        }
      })();
    }
    (async () => {
      try {
        toggleMetricsLoading();
        const response = await getChatMetrics(metricquestion, metriccontexts, metricanswer, metricmodel);
        toggleMetricsLoading();
        if (response.data.status === 'Success') {
          saveMetrics({ ...response.data.data, error: '' });
        } else {
          throw new Error(response.data.error);
        }
      } catch (error) {
        if (error instanceof Error) {
          toggleMetricsLoading();
          console.log('Error in getting chat metrics', error);
          saveMetrics({ error: error.message, faithfulness: 0, answer_relevancy: 0, context_utilization: 0 });
        }
      }
    })();
    () => {
      setcopiedText(false);
    };
  }, [nodeDetails, mode, error]);

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
            To generate this response, the process took <span className='font-bold'>{response_time} seconds,</span>
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
          {mode === chatModeLables.global_vector ? (
            <Tabs.Tab tabId={7}>Communities</Tabs.Tab>
          ) : (
            <>
              {mode != chatModeLables.graph ? <Tabs.Tab tabId={3}>Sources used</Tabs.Tab> : <></>}
              {mode != chatModeLables.graph ? <Tabs.Tab tabId={5}>Chunks</Tabs.Tab> : <></>}
              {mode === chatModeLables.graph_vector ||
              mode === chatModeLables.graph ||
              mode === chatModeLables.graph_vector_fulltext ||
              mode === chatModeLables.entity_vector ? (
                <Tabs.Tab tabId={4}>Top Entities used</Tabs.Tab>
              ) : (
                <></>
              )}
              {mode === chatModeLables.graph && cypher_query?.trim()?.length ? (
                <Tabs.Tab tabId={6}>Generated Cypher Query</Tabs.Tab>
              ) : (
                <></>
              )}
              {mode === chatModeLables.entity_vector ? <Tabs.Tab tabId={7}>Communities</Tabs.Tab> : <></>}
              <Tabs.Tab tabId={8}>Evaluation Metrics</Tabs.Tab>
            </>
          )}
        </Tabs>
      )}
      <Flex className='p-4'>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={3}>
          <SourcesInfo loading={infoLoading} sources={sources} mode={mode} chunks={chunks} />
        </Tabs.TabPanel>
        <Tabs.TabPanel tabId={8} value={activeTab}>
          <MetricsTab metricsLoading={metricsLoading} metricDetails={metricDetails} />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={4}>
          <EntitiesInfo
            loading={infoLoading}
            mode={mode}
            graphonly_entities={graphonly_entities}
            infoEntities={infoEntities}
          />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={5}>
          <ChunkInfo chunks={chunks} loading={infoLoading} />
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
        {mode === chatModeLables.entity_vector || mode === chatModeLables.global_vector ? (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={7}>
            <CommunitiesInfo loading={infoLoading} communities={communities} />
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
