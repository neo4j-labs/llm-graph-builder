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
  Button,
} from '@neo4j-ndl/react';
import { DocumentDuplicateIconOutline, ClipboardDocumentCheckIconOutline } from '@neo4j-ndl/react/icons';
import '../../styling/info.css';
import Neo4jRetrievalLogo from '../../assets/images/Neo4jRetrievalLogo.png';
import { ExtendedNode, UserCredentials, chatInfoMessage } from '../../types';
import { useContext, useEffect, useMemo, useState } from 'react';
import GraphViewButton from '../Graph/GraphViewButton';
import { chunkEntitiesAPI } from '../../services/ChunkEntitiesInfo';
import { useCredentials } from '../../context/UserCredentials';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { tokens } from '@neo4j-ndl/base';
import ChunkInfo from './ChunkInfo';
import EntitiesInfo from './EntitiesInfo';
import SourcesInfo from './SourcesInfo';
import CommunitiesInfo from './CommunitiesInfo';
import { chatModeLables, chatModeReadableLables, supportedLLmsForRagas } from '../../utils/Constants';
import { Relationship } from '@neo4j-nvl/base';
import { getChatMetrics } from '../../services/GetRagasMetric';
import MetricsTab from './MetricsTab';
import { Stack } from '@mui/material';
import { capitalizeWithUnderscore, getNodes } from '../../utils/Utils';
import MultiModeMetrics from './MultiModeMetrics';

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
  nodes,
  chunks,
  infoEntities,
  communities,
  metricDetails,
  relationships,
  infoLoading,
  metricsLoading,
  activeChatmodes,
  metricError,
  multiModelMetrics,
  saveNodes,
  saveChunks,
  saveChatRelationships,
  saveCommunities,
  saveInfoEntitites,
  saveMetrics,
  toggleInfoLoading,
  toggleMetricsLoading,
  saveMultimodemetrics,
}) => {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const [activeTab, setActiveTab] = useState<number>(
    error?.length
      ? 10
      : mode === chatModeLables['global search+vector+fulltext']
      ? 7
      : mode === chatModeLables.graph
      ? 4
      : 3
  );
  const { userCredentials } = useCredentials();
  const themeUtils = useContext(ThemeWrapperContext);
  const [, copy] = useCopyToClipboard();
  const [copiedText, setcopiedText] = useState<boolean>(false);
  const [showMetricsTable, setShowMetricsTable] = useState<boolean>(Boolean(metricDetails));
  const [showMultiModeMetrics, setShowMultiModeMetrics] = useState<boolean>(Boolean(multiModelMetrics.length));
  const [multiModeError, setMultiModeError] = useState<string>('');

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
    if (
      (mode != chatModeLables.graph || error?.trim() !== '') &&
      (!nodes.length || !infoEntities.length || !chunks.length)
    ) {
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
          saveInfoEntitites(getNodes(nodesData, mode));
          saveNodes(getNodes(nodesData, mode));
          saveChatRelationships(relationshipsData ?? []);
          saveCommunities(
            (communitiesData ?? [])
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
    () => {
      setcopiedText(false);
      if (metricsLoading) {
        toggleMetricsLoading();
      }
    };
  }, [nodeDetails, mode, error, metricsLoading]);

  const onChangeTabs = (tabId: number) => {
    setActiveTab(tabId);
  };
  const loadMetrics = async () => {
    if (activeChatmodes) {
      if (Object.keys(activeChatmodes).length <= 1) {
        setShowMetricsTable(true);
        const [defaultMode] = Object.keys(activeChatmodes);
        try {
          toggleMetricsLoading();
          const response = await getChatMetrics(metricquestion, [metriccontexts], [metricanswer], metricmodel, [
            defaultMode,
          ]);
          toggleMetricsLoading();
          if (response.data.status === 'Success') {
            const data = response;
            saveMetrics(data.data.data[defaultMode]);
          } else {
            throw new Error(response.data.error);
          }
        } catch (error) {
          if (error instanceof Error) {
            toggleMetricsLoading();
            console.log('Error in getting chat metrics', error);
            saveMetrics({ faithfulness: 0, answer_relevancy: 0, error: error.message });
          }
        }
      } else {
        setShowMultiModeMetrics(true);
        toggleMetricsLoading();
        const contextarray = Object.values(activeChatmodes).map((r) => {
          return r.metric_contexts;
        });
        const answerarray = Object.values(activeChatmodes).map((r) => {
          return r.metric_answer;
        });
        const modesarray = Object.keys(activeChatmodes).map((mode) => {
          return mode;
        });
        try {
          const responses = await getChatMetrics(
            metricquestion,
            contextarray as string[],
            answerarray as string[],
            metricmodel,
            modesarray
          );
          toggleMetricsLoading();
          if (responses.data.status === 'Success') {
            const modewisedata = responses.data.data;
            const metricsdata = Object.entries(modewisedata).map(([mode, scores]) => {
              return { mode, answer_relevancy: scores.answer_relevancy, faithfulness: scores.faithfulness };
            });
            saveMultimodemetrics(metricsdata);
          } else {
            throw new Error(responses.data.error);
          }
        } catch (error) {
          toggleMetricsLoading();
          console.log('Error in getting chat metrics', error);
          if (error instanceof Error) {
            setMultiModeError(error.message);
          }
        }
      }
    }
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
            <span className='font-bold'>
              {chatModeReadableLables[mode] !== 'vector'
                ? chatModeReadableLables[mode].replace(/\+/g, ' & ')
                : chatModeReadableLables[mode]}
            </span>{' '}
            mode.
          </Typography>
        </Box>
      </Box>
      {error?.length > 0 ? (
        <Banner type='danger'>{error}</Banner>
      ) : (
        <Tabs size='large' fill='underline' onChange={onChangeTabs} value={activeTab}>
          {mode === chatModeLables['global search+vector+fulltext'] ? (
            <Tabs.Tab tabId={7}>Communities</Tabs.Tab>
          ) : (
            <>
              {mode != chatModeLables.graph ? <Tabs.Tab tabId={3}>Sources used</Tabs.Tab> : <></>}
              {mode != chatModeLables.graph ? <Tabs.Tab tabId={5}>Chunks</Tabs.Tab> : <></>}
              {mode === chatModeLables['graph+vector'] ||
              mode === chatModeLables.graph ||
              mode === chatModeLables['graph+vector+fulltext'] ||
              mode === chatModeLables['entity search+vector'] ? (
                <Tabs.Tab tabId={4}>Top Entities used</Tabs.Tab>
              ) : (
                <></>
              )}
              {mode === chatModeLables.graph && cypher_query?.trim()?.length ? (
                <Tabs.Tab tabId={6}>Generated Cypher Query</Tabs.Tab>
              ) : (
                <></>
              )}
              {mode === chatModeLables['entity search+vector'] && communities.length ? (
                <Tabs.Tab tabId={7}>Communities</Tabs.Tab>
              ) : (
                <></>
              )}
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
          <Stack spacing={2}>
            <Stack spacing={2}>
              {!supportedLLmsForRagas.includes(metricmodel) && (
                <Banner
                  type='warning'
                  title='LLM Model Not Supported ,Please Choose Different Model'
                  description={
                    <Typography variant='body-medium'>
                      Currently ragas evaluation works on{' '}
                      {supportedLLmsForRagas.map((s, idx) => (
                        <span className='font-bold'>
                          {capitalizeWithUnderscore(s) + (idx != supportedLLmsForRagas.length - 1 ? ',' : '')}
                        </span>
                      ))}
                      .
                    </Typography>
                  }
                ></Banner>
              )}
              <Box>
                <Typography variant='body-large'>
                  We use several key metrics to assess the quality of our chat responses. Click the button below to view
                  detailed scores for this interaction using <span className='font-bold'>ragas framework</span>. These
                  scores help us continuously improve the accuracy and helpfulness of our chatbots.This usually takes
                  about <span className='font-bold'>20 seconds</span> . You'll see detailed scores shortly.
                </Typography>
              </Box>
              <Stack>
                <Typography variant='body-large'>
                  <span className='font-bold'>Faithfulness</span>: Determines How accurately the answer reflects the
                  provided information
                </Typography>
                <Typography variant='body-large'>
                  <span className='font-bold'>Answer Relevancy</span>: Determines How well the answer addresses the
                  user's question.
                </Typography>
              </Stack>
            </Stack>
            {showMultiModeMetrics && activeChatmodes != null && Object.keys(activeChatmodes).length > 1 && (
              <MultiModeMetrics
                error={multiModeError}
                metricsLoading={metricsLoading}
                data={multiModelMetrics}
              ></MultiModeMetrics>
            )}
            {showMetricsTable && activeChatmodes != null && Object.keys(activeChatmodes).length <= 1 && (
              <MetricsTab metricsLoading={metricsLoading} error={metricError} metricDetails={metricDetails} />
            )}
            {!metricDetails && activeChatmodes != undefined && Object.keys(activeChatmodes).length <= 1 && (
              <Button
                label='Metrics Action Button'
                disabled={metricsLoading || !supportedLLmsForRagas.includes(metricmodel)}
                className='w-max self-center mt-4'
                onClick={loadMetrics}
              >
                View Detailed Metrics
              </Button>
            )}
            {!multiModelMetrics.length && activeChatmodes != undefined && Object.keys(activeChatmodes).length > 1 && (
              <Button
                label='Metrics Action Button'
                disabled={metricsLoading || !supportedLLmsForRagas.includes(metricmodel)}
                className='w-max self-center mt-4'
                onClick={loadMetrics}
              >
                View Detailed Metrics For All Modes
              </Button>
            )}
          </Stack>
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
          <ChunkInfo chunks={chunks} loading={infoLoading} mode={mode} />
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
        {mode === chatModeLables['entity search+vector'] || mode === chatModeLables['global search+vector+fulltext'] ? (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={7}>
            <CommunitiesInfo loading={infoLoading} communities={communities} mode={mode} />
          </Tabs.TabPanel>
        ) : (
          <></>
        )}
      </Flex>
      {activeTab == 4 && nodes?.length && relationships?.length && mode !== chatModeLables.graph ? (
        <Box className='button-container flex mt-2 justify-center'>
          <GraphViewButton
            nodeValues={nodes}
            relationshipValues={relationships}
            label='Graph Entities used for Answer Generation'
            viewType='chatInfoView'
          />
        </Box>
      ) : (
        <></>
      )}
    </Box>
  );
};
export default ChatInfoModal;
