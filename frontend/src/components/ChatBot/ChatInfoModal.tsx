import {
  Box,
  Typography,
  TextLink,
  Flex,
  Tabs,
  LoadingSpinner,
  CypherCodeBlock,
  CypherCodeBlockProps,
  useCopyToClipboard,
} from '@neo4j-ndl/react';
import { DocumentDuplicateIconOutline, DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import '../../styling/info.css';
import Neo4jRetrievalLogo from '../../assets/images/Neo4jRetrievalLogo.png';
import wikipedialogo from '../../assets/images/wikipedia.svg';
import youtubelogo from '../../assets/images/youtube.svg';
import gcslogo from '../../assets/images/gcs.webp';
import s3logo from '../../assets/images/s3logo.png';
import { Chunk, Entity, GroupedEntity, UserCredentials, chatInfoMessage } from '../../types';
import { useContext, useEffect, useMemo, useState } from 'react';
import HoverableLink from '../UI/HoverableLink';
import GraphViewButton from '../Graph/GraphViewButton';
import { chunkEntitiesAPI } from '../../services/ChunkEntitiesInfo';
import { useCredentials } from '../../context/UserCredentials';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { calcWordColor } from '@neo4j-devtools/word-color';
import ReactMarkdown from 'react-markdown';
import { GlobeAltIconOutline } from '@neo4j-ndl/react/icons';
import { youtubeLinkValidation } from '../../utils/Utils';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { ClipboardDocumentCheckIconOutline } from '@neo4j-ndl/react/icons';

const ChatInfoModal: React.FC<chatInfoMessage> = ({
  sources,
  model,
  total_tokens,
  response_time,
  chunk_ids,
  mode,
  cypher_query,
  graphonly_entities,
}) => {
  const [activeTab, setActiveTab] = useState<number>(mode === 'graph' ? 4 : 3);
  const [infoEntities, setInfoEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const themeUtils = useContext(ThemeWrapperContext);
  const [, copy] = useCopyToClipboard();
  const [copiedText, setcopiedText] = useState<boolean>(false);

  const parseEntity = (entity: Entity) => {
    const { labels, properties } = entity;
    const label = labels[0];
    const text = properties.id;
    return { label, text };
  };
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
    if (mode != 'graph') {
      setLoading(true);
      chunkEntitiesAPI(userCredentials as UserCredentials, chunk_ids.map((c) => c.id).join(','))
        .then((response) => {
          setInfoEntities(response.data.data.nodes);
          setNodes(response.data.data.nodes);
          setRelationships(response.data.data.relationships);
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
        })
        .catch((error) => {
          console.error('Error fetching entities:', error);
          setLoading(false);
        });
    }

    () => {
      setcopiedText(false);
    };
  }, [chunk_ids, mode]);
  const groupedEntities = useMemo<{ [key: string]: GroupedEntity }>(() => {
    return infoEntities.reduce((acc, entity) => {
      const { label, text } = parseEntity(entity);
      if (!acc[label]) {
        const newColor = calcWordColor(label);
        acc[label] = { texts: new Set(), color: newColor };
      }
      acc[label].texts.add(text);
      return acc;
    }, {} as Record<string, { texts: Set<string>; color: string }>);
  }, [infoEntities]);
  const onChangeTabs = (tabId: number) => {
    setActiveTab(tabId);
  };
  const labelCounts = useMemo(() => {
    const counts: { [label: string]: number } = {};
    infoEntities.forEach((entity) => {
      const { labels } = entity;
      const label = labels[0];
      counts[label] = counts[label] ? counts[label] + 1 : 1;
    });
    return counts;
  }, [infoEntities]);
  const sortedLabels = useMemo(() => {
    return Object.keys(labelCounts).sort((a, b) => labelCounts[b] - labelCounts[a]);
  }, [labelCounts]);

  const generateYouTubeLink = (url: string, startTime: string) => {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('t', startTime);
      return urlObj.toString();
    } catch (error) {
      console.error('Invalid URL:', error);
      return '';
    }
  };
  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img src={Neo4jRetrievalLogo} style={{ width: 95, height: 95, marginRight: 10 }} loading='lazy' />
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
      <Tabs size='large' fill='underline' onChange={onChangeTabs} value={activeTab}>
        {mode != 'graph' ? <Tabs.Tab tabId={3}>Sources used</Tabs.Tab> : <></>}
        {mode === 'graph+vector' || mode === 'graph' ? <Tabs.Tab tabId={4}>Top Entities used</Tabs.Tab> : <></>}
        {mode === 'graph' && cypher_query?.trim().length ? (
          <Tabs.Tab tabId={6}>Generated Cypher Query</Tabs.Tab>
        ) : (
          <></>
        )}
        {mode != 'graph' ? <Tabs.Tab tabId={5}>Chunks</Tabs.Tab> : <></>}
      </Tabs>
      <Flex className='p-4'>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={3}>
          {sources.length ? (
            <ul className='list-class list-none'>
              {sources.map((link, index) => {
                return (
                  <li key={index} className='flex flex-row inline-block justify-between items-center p-2'>
                    {link?.startsWith('http') || link?.startsWith('https') ? (
                      <>
                        {link?.includes('wikipedia.org') && (
                          <div className='flex flex-row inline-block justify-between items-center'>
                            <img src={wikipedialogo} width={20} height={20} className='mr-2' alt='Wikipedia Logo' />
                            <TextLink href={link} externalLink={true}>
                              <HoverableLink url={link}>
                                <Typography
                                  variant='body-medium'
                                  className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                                >
                                  {link}
                                </Typography>
                              </HoverableLink>
                            </TextLink>
                          </div>
                        )}
                        {link?.includes('storage.googleapis.com') && (
                          <div className='flex flex-row inline-block justify-between items-center'>
                            <img
                              src={gcslogo}
                              width={20}
                              height={20}
                              className='mr-2'
                              alt='Google Cloud Storage Logo'
                            />
                            <Typography
                              variant='body-medium'
                              className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                            >
                              {decodeURIComponent(link).split('/').at(-1)?.split('?')[0] ?? 'GCS File'}
                            </Typography>
                          </div>
                        )}
                        {link?.startsWith('s3://') && (
                          <div className='flex flex-row inline-block justify-between items-center'>
                            <img src={s3logo} width={20} height={20} className='mr-2' alt='S3 Logo' />
                            <Typography
                              variant='body-medium'
                              className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                            >
                              {decodeURIComponent(link).split('/').at(-1) ?? 'S3 File'}
                            </Typography>
                          </div>
                        )}
                        {youtubeLinkValidation(link) && (
                          <>
                            <div className='flex flex-row inline-block justiy-between items-center'>
                              <img src={youtubelogo} width={20} height={20} className='mr-2' />
                              <TextLink href={link} externalLink={true}>
                                <HoverableLink url={link}>
                                  <Typography
                                    variant='body-medium'
                                    className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                                  >
                                    {link}
                                  </Typography>
                                </HoverableLink>
                              </TextLink>
                            </div>
                          </>
                        )}
                        {!link?.startsWith('s3://') &&
                          !link?.includes('storage.googleapis.com') &&
                          !link?.includes('wikipedia.org') &&
                          !link?.includes('youtube.com') && (
                            <div className='flex flex-row inline-block justify-between items-center'>
                              <GlobeAltIconOutline className='n-size-token-7' />
                              <TextLink href={link} externalLink={true}>
                                <Typography variant='body-medium'>{link}</Typography>
                              </TextLink>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className='flex flex-row inline-block justify-between items-center'>
                        <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                        <Typography
                          variant='body-medium'
                          className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                        >
                          {link}
                        </Typography>
                        {/* {chunks?.length > 0 && (
                          <Typography variant='body-small' className='italic'>
                            - Page{' '}
                            {chunks
                              .map((c) => c.page_number as number)
                              .sort((a, b) => a - b)
                              .join(', ')}
                          </Typography>
                        )} */}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <span className='h6 text-center'>No Sources Found</span>
          )}
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={4}>
          {loading ? (
            <Box className='flex justify-center items-center'>
              <LoadingSpinner size='small' />
            </Box>
          ) : Object.keys(groupedEntities).length > 0 || Object.keys(graphonly_entities).length > 0 ? (
            <ul className='list-none p-4 max-h-80 overflow-auto'>
              {mode == 'graph'
                ? graphonly_entities.map((label, index) => (
                    <li
                      key={index}
                      className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                    >
                      <div style={{ backgroundColor: calcWordColor(Object.keys(label)[0]) }} className='legend mr-2'>
                        {
                          //@ts-ignore
                          label[Object.keys(label)[0]].id ?? Object.keys(label)[0]
                        }
                      </div>
                    </li>
                  ))
                : sortedLabels.map((label, index) => (
                    <li
                      key={index}
                      className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                    >
                      <div
                        key={index}
                        style={{ backgroundColor: `${groupedEntities[label].color}` }}
                        className='legend mr-2'
                      >
                        {label} ({labelCounts[label]})
                      </div>
                      <Typography
                        className='entity-text text-ellipsis whitespace-nowrap max-w-[calc(100%-120px)] overflow-hidden'
                        variant='body-medium'
                      >
                        {Array.from(groupedEntities[label].texts).slice(0, 3).join(', ')}
                      </Typography>
                    </li>
                  ))}
            </ul>
          ) : (
            <span className='h6 text-center'>No Entities Found</span>
          )}
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={5}>
          {loading ? (
            <Box className='flex justify-center items-center'>
              <LoadingSpinner size='small' />
            </Box>
          ) : chunks.length > 0 ? (
            <div className='p-4 h-80 overflow-auto'>
              <ul className='list-disc list-inside'>
                {chunks.map((chunk) => (
                  <li key={chunk.id} className='mb-2'>
                    {chunk?.page_number ? (
                      <>
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <DocumentTextIconOutline className='w-4 h-4 inline-block mr-2' />
                          <Typography
                            variant='subheading-medium'
                            className='text-ellipsis whitespace-nowrap max-w-[calc(100%-200px)] overflow-hidden'
                          >
                            {/* {chunk?.fileName}, Page: {chunk?.page_number} */}
                            {chunk?.fileName}
                          </Typography>
                        </div>
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      </>
                    ) : chunk?.url && chunk?.start_time ? (
                      <>
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <img src={youtubelogo} width={20} height={20} className='mr-2' />
                          <TextLink href={generateYouTubeLink(chunk?.url, chunk?.start_time)} externalLink={true}>
                            <Typography
                              variant='body-medium'
                              className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                            >
                              {chunk?.fileName}
                            </Typography>
                          </TextLink>
                        </div>
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      </>
                    ) : chunk?.url && chunk?.url.includes('wikipedia.org') ? (
                      <>
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <img src={wikipedialogo} width={20} height={20} className='mr-2' />
                          <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                        </div>
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      </>
                    ) : chunk?.url && chunk?.url.includes('storage.googleapis.com') ? (
                      <>
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <img src={gcslogo} width={20} height={20} className='mr-2' />
                          <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                        </div>
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      </>
                    ) : chunk?.url && chunk?.url.startsWith('s3://') ? (
                      <>
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <img src={s3logo} width={20} height={20} className='mr-2' />
                          <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                        </div>
                      </>
                    ) : chunk?.url &&
                      !chunk?.url.startsWith('s3://') &&
                      !chunk?.url.includes('storage.googleapis.com') &&
                      !chunk?.url.includes('wikipedia.org') &&
                      !chunk?.url.includes('youtube.com') ? (
                      <>
                        <div className='flex flex-row inline-block items-center'>
                          <GlobeAltIconOutline className='n-size-token-7' />
                          <TextLink href={chunk?.url} externalLink={true}>
                            <Typography variant='body-medium'>{chunk?.url}</Typography>
                          </TextLink>
                        </div>
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      </>
                    ) : (
                      <></>
                    )}
                    <ReactMarkdown>{chunk?.text}</ReactMarkdown>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span className='h6 text-center'>No Chunks Found</span>
          )}
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
      </Flex>
      {activeTab == 4 && nodes.length && relationships.length ? (
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
