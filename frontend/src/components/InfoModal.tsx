import { Box, Typography, TextLink, Flex, Tabs, LoadingSpinner } from '@neo4j-ndl/react';
import { DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import '../styling/info.css';
import Neo4jRetrievalLogo from '../assets/images/Neo4jRetrievalLogo.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import youtubelogo from '../assets/images/youtube.png';
import gcslogo from '../assets/images/gcs.webp';
import s3logo from '../assets/images/s3logo.png';
import { Entity, GroupedEntity, UserCredentials, chatInfoMessage } from '../types';
import { useEffect, useMemo, useState } from 'react';
import HoverableLink from './HoverableLink';
import GraphViewButton from './GraphViewButton';
import { chunkEntitiesAPI } from '../services/ChunkEntitiesInfo';
import { useCredentials } from '../context/UserCredentials';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { calcWordColor } from '@neo4j-devtools/word-color';

const InfoModal: React.FC<chatInfoMessage> = ({ sources, model, total_tokens, response_time, chunk_ids }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [infoEntities, setInfoEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const parseEntity = (entity: Entity) => {
    const { labels, properties } = entity;
    const label = labels[0];
    const text = properties.id;
    return { label, text };
  };

  useEffect(() => {
    setLoading(true);
    chunkEntitiesAPI(userCredentials as UserCredentials, chunk_ids.join(','))
      .then((response) => {
        setInfoEntities(response.data.data.nodes);
        setNodes(response.data.data.nodes);
        setRelationships(response.data.data.relationships);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching entities:', error);
        setLoading(false);
      });
  }, [chunk_ids]);

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
    return Object.keys(labelCounts)
      .slice(0, 7)
      .sort((a, b) => labelCounts[b] - labelCounts[a]);
  }, [labelCounts]);

  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img src={Neo4jRetrievalLogo} alt='icon' style={{ width: 95, height: 95, marginRight: 10 }} />
        <Box className='flex flex-col'>
          <Typography variant='h2'>Retrieval information</Typography>
          <Typography variant='body-medium' sx={{ mb: 2 }}>
            To generate this response, in <span className='font-bold'>{response_time} seconds</span> we used{' '}
            <span className='font-bold'>{total_tokens}</span> tokens with the model{' '}
            <span className='font-bold'>{model}</span>.
          </Typography>
        </Box>
      </Box>
      <Tabs size='large' fill='underline' onChange={onChangeTabs} value={activeTab}>
        <Tabs.Tab tabId={0}>Sources used</Tabs.Tab>
        <Tabs.Tab tabId={1}>Top Entities used</Tabs.Tab>
      </Tabs>
      <Flex className='p-6'>
        {activeTab === 0 ? (
          sources.length > 0 ? (
            <ul className='list-class list-none'>
              {sources.map((link, index) => (
                <li key={index}>
                  {link.source_name.startsWith('http') || link.source_name.startsWith('https') ? (
                    <div className='flex flex-row inline-block justiy-between items-center p8'>
                      {link.source_name.includes('wikipedia.org') ? (
                        <img src={wikipedialogo} width={20} height={20} className='mr-2' />
                      ) : link.source_name.includes('storage.googleapis.com') ? (
                        <img src={gcslogo} width={20} height={20} className='mr-2' />
                      ) : link.source_name?.startsWith('s3://') ? (
                        <img src={s3logo} width={20} height={20} className='mr-2' />
                      ) : (
                        <img src={youtubelogo} width={20} height={20} className='mr-2' />
                      )}
                      {link.source_name.startsWith('s3://') ? (
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <Typography
                            variant='body-medium'
                            className='text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden'
                          >
                            {decodeURIComponent(link.source_name).split('/').at(-1) ?? 'S3 File'}
                          </Typography>
                        </div>
                      ) : link.source_name.includes('storage.googleapis.com') ? (
                        <div className='flex flex-row inline-block justiy-between items-center'>
                          <Typography
                            variant='body-medium'
                            className='text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden'
                          >
                            {decodeURIComponent(link.source_name).split('/').at(-1)?.split('?')[0] ?? 'GCS File'}
                          </Typography>
                        </div>
                      ) : (
                        <TextLink href={link.source_name} externalLink={true}>
                          {link.source_name.includes('wikipedia.org') ? (
                            <>
                              <HoverableLink url={link.source_name}>
                                <Typography variant='body-medium'>Wikipedia</Typography>
                                <Typography variant='body-small' className='italic'>
                                  - Section {total_tokens}
                                </Typography>
                              </HoverableLink>
                            </>
                          ) : (
                            <>
                              <HoverableLink url={link.source_name}>
                                <Typography variant='body-medium'>{link.source_name}</Typography>
                              </HoverableLink>
                            </>
                          )}
                        </TextLink>
                      )}
                    </div>
                  ) : (
                    <div className='flex flex-row inline-block justiy-between items-center'>
                      <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                      <Typography
                        variant='body-medium'
                        className='text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden'
                      >
                        {link.source_name}
                      </Typography>
                      {link.page_numbers && link.page_numbers.length > 0 ? (
                        <Typography variant='body-small' className='italic'>
                          - Page {link.page_numbers.join(', ')}
                        </Typography>
                      ) : (
                        <></>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className='h6 text-center'>No Sources Found</span>
          )
        ) : loading ? (
          <Box className='flex justify-center items-center'>
            <LoadingSpinner size='small' />
          </Box>
        ) : Object.keys(groupedEntities).length > 0 ? (
          <ul className='list-none'>
            {sortedLabels.map((label, index) => (
              <li
                key={index}
                className='flex items-center mb-2'
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
              >
                <div key={index} style={{ backgroundColor: `${groupedEntities[label].color}` }} className='legend mr-2'>
                  {label} ({labelCounts[label]})
                </div>
                <Typography
                  className='entity-text'
                  variant='body-medium'
                  sx={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 'calc(100% - 120px)',
                  }}
                >
                  {Array.from(groupedEntities[label].texts).slice(0, 3).join(', ')}
                </Typography>
              </li>
            ))}
          </ul>
        ) : (
          <span className='h6 text-center'>No Entities Found</span>
        )}
      </Flex>
      {activeTab === 1 && nodes.length && relationships.length ? (
        <Box className='button-container flex mt-2 justify-center'>
          <GraphViewButton nodeValues={nodes} relationshipValues={relationships} />
        </Box>
      ) : (
        <></>
      )}
    </Box>
  );
};
export default InfoModal;
