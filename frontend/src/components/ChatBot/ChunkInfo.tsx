import { FC, useContext, useState } from 'react';
import { ChunkProps } from '../../types';
import { LoadingSpinner, TextLink, Typography } from '@neo4j-ndl/react';
import { DocumentTextIconOutline, GlobeAltIconOutline } from '@neo4j-ndl/react/icons';
import wikipedialogo from '../../assets/images/wikipedia.svg';
import youtubelogo from '../../assets/images/youtube.svg';
import gcslogo from '../../assets/images/gcs.webp';
import s3logo from '../../assets/images/s3logo.png';
import ReactMarkdown from 'react-markdown';
import { generateYouTubeLink, getLogo, isAllowedHost } from '../../utils/Utils';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { chatModeLables } from '../../utils/Constants';
import GraphViewModal from '../Graph/GraphViewModal';
import { handleGraphNodeClick } from './chatInfo';

const ChunkInfo: FC<ChunkProps> = ({ loading, chunks, mode }) => {
  const themeUtils = useContext(ThemeWrapperContext);
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
  const [loadingGraphView, setLoadingGraphView] = useState(false);

  const handleChunkClick = (elementId: string, viewMode: string) => {
    handleGraphNodeClick(
      elementId,
      viewMode,
      setNeoNodes,
      setNeoRels,
      setOpenGraphView,
      setViewPoint,
      setLoadingGraphView
    );
  };

  return (
    <>
      {loading ? (
        <div className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </div>
      ) : chunks?.length > 0 ? (
        <div className='p-4 h-80 overflow-auto'>
          <ul className='list-inside list-none'>
            {chunks.map((chunk) => (
              <li key={chunk.id} className='mb-2'>
                {chunk?.page_number ? (
                  <>
                    <div className='flex flex-row inline-block items-center'>
                      <>
                        <DocumentTextIconOutline className='w-4 h-4 inline-block mr-2' />
                        <Typography
                          variant='body-medium'
                          className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                        >
                          {chunk?.fileName}
                        </Typography>
                      </>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph &&
                      chunk.score && (
                        <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                      )}
                    <div>
                      <Typography variant='subheading-small'>Page: {chunk?.page_number}</Typography>
                    </div>
                    <div>
                      <TextLink
                        className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                        htmlAttributes={{
                          onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                        }}
                      >
                        {'View Graph'}
                      </TextLink>
                    </div>
                  </>
                ) : chunk?.url && chunk?.start_time ? (
                  <>
                    <div className='flex flex-row inline-block justiy-between items-center'>
                      <img src={youtubelogo} width={20} height={20} className='mr-2' />
                      <TextLink href={generateYouTubeLink(chunk?.url, chunk?.start_time)} isExternalLink={true}>
                        <Typography
                          variant='body-medium'
                          className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                        >
                          {chunk?.fileName}
                        </Typography>
                      </TextLink>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph && (
                        <>
                          <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                          <div>
                            <TextLink
                              as='small'
                              className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                              htmlAttributes={{
                                onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                              }}
                            >
                              {'View Graph'}
                            </TextLink>
                          </div>
                        </>
                      )}
                  </>
                ) : chunk?.url && new URL(chunk.url).host === 'wikipedia.org' ? (
                  <>
                    <div className='flex flex-row inline-block justiy-between items-center'>
                      <img src={wikipedialogo} width={20} height={20} className='mr-2' />
                      <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph && (
                        <>
                          <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                          <div>
                            <TextLink
                              className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                              htmlAttributes={{
                                onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                              }}
                            >
                              {'View Graph'}
                            </TextLink>
                          </div>
                        </>
                      )}
                  </>
                ) : chunk?.url && new URL(chunk.url).host === 'storage.googleapis.com' ? (
                  <>
                    <div className='flex flex-row inline-block justiy-between items-center'>
                      <img src={gcslogo} width={20} height={20} className='mr-2' />
                      <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph && (
                        <>
                          <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                          <div>
                            <TextLink
                              className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                              htmlAttributes={{
                                onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                              }}
                            >
                              {'View Graph'}
                            </TextLink>
                          </div>
                        </>
                      )}
                  </>
                ) : chunk?.url && chunk?.url.startsWith('s3://') ? (
                  <>
                    <div className='flex flex-row inline-block justiy-between items-center'>
                      <img src={s3logo} width={20} height={20} className='mr-2' />
                      <Typography variant='subheading-medium'>{chunk?.fileName}</Typography>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph && (
                        <>
                          <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                          <div>
                            <TextLink
                              className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                              htmlAttributes={{
                                onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                              }}
                            >
                              {'View Graph'}
                            </TextLink>
                          </div>
                        </>
                      )}
                  </>
                ) : chunk?.url &&
                  !chunk?.url.startsWith('s3://') &&
                  !isAllowedHost(chunk?.url, ['storage.googleapis.com', 'wikipedia.org', 'youtube.com']) ? (
                  <>
                    <div className='flex flex-row inline-block items-center'>
                      <GlobeAltIconOutline className='n-size-token-7' />
                      <TextLink href={chunk?.url} isExternalLink={true}>
                        <Typography variant='body-medium'>{chunk?.url}</Typography>
                      </TextLink>
                    </div>
                    {mode !== chatModeLables['global search+vector+fulltext'] &&
                      mode !== chatModeLables['entity search+vector'] &&
                      mode !== chatModeLables.graph && (
                        <>
                          <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
                          <div>
                            <TextLink
                              className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                              htmlAttributes={{
                                onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                              }}
                            >
                              {'View Graph'}
                            </TextLink>
                          </div>
                        </>
                      )}
                  </>
                ) : (
                  <>
                    <div className='flex flex-row inline-block items-center'>
                      {chunk.fileSource === 'local file' ? (
                        <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                      ) : (
                        <img
                          src={getLogo(themeUtils.colorMode)[chunk.fileSource]}
                          width={20}
                          height={20}
                          className='mr-2'
                        />
                      )}
                      <>
                        <Typography
                          variant='body-medium'
                          className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                        >
                          {chunk.fileName}
                        </Typography>
                        <div>
                          <TextLink
                            className={`${loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}`}
                            htmlAttributes={{
                              onClick: () => handleChunkClick(chunk.element_id, 'Chunk'),
                            }}
                          >
                            {'View Graph'}
                          </TextLink>
                        </div>
                      </>
                    </div>
                  </>
                )}
                <div className='mt-2'>
                  <ReactMarkdown>{chunk?.text}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span className='h6 text-center'> No Chunks Found</span>
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
export default ChunkInfo;
