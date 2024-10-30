import { FC, useContext } from 'react';
import { Chunk, SourcesProps } from '../../types';
import { Box, LoadingSpinner, TextLink, Typography } from '@neo4j-ndl/react';
import { DocumentTextIconOutline, GlobeAltIconOutline } from '@neo4j-ndl/react/icons';
import { getLogo, isAllowedHost, youtubeLinkValidation } from '../../utils/Utils';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import HoverableLink from '../UI/HoverableLink';
import wikipedialogo from '../../assets/images/wikipedia.svg';
import youtubelogo from '../../assets/images/youtube.svg';
import gcslogo from '../../assets/images/gcs.webp';
import s3logo from '../../assets/images/s3logo.png';

const filterUniqueChunks = (chunks: Chunk[]) => {
  const chunkSource = new Set();
  return chunks.filter((chunk) => {
    const sourceCheck = `${chunk.fileName}-${chunk.fileSource}`;
    if (chunkSource.has(sourceCheck)) {
      return false;
    }
    chunkSource.add(sourceCheck);
    return true;
  });
};

const SourcesInfo: FC<SourcesProps> = ({ loading, mode, chunks, sources }) => {
  const themeUtils = useContext(ThemeWrapperContext);
  const uniqueChunks = chunks ? filterUniqueChunks(chunks) : [];
  return (
    <>
      {loading ? (
        <Box className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </Box>
      ) : mode === 'entity search+vector' && uniqueChunks.length ? (
        <ul>
          {uniqueChunks
            .map((c) => ({ fileName: c.fileName, fileSource: c.fileSource }))
            .map((s, index) => {
              return (
                <li key={index} className='flex flex-row inline-block justify-between items-center p-2'>
                  <div className='flex flex-row inline-block justify-between items-center'>
                    {s.fileSource === 'local file' ? (
                      <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                    ) : (
                      <img src={getLogo(themeUtils.colorMode)[s.fileSource]} width={20} height={20} className='mr-2' />
                    )}
                    <Typography
                      variant='body-medium'
                      className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                    >
                      {s.fileName}
                    </Typography>
                  </div>
                </li>
              );
            })}
        </ul>
      ) : sources?.length ? (
        <ul className='list-class list-none'>
          {sources.map((link, index) => {
            return (
              <li key={index} className='flex flex-row inline-block justify-between items-center p-2'>
                {link?.startsWith('http') || link?.startsWith('https') ? (
                  <>
                    {isAllowedHost(link, ['wikipedia.org']) && (
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
                    {isAllowedHost(link, ['storage.googleapis.com']) && (
                      <div className='flex flex-row inline-block justify-between items-center'>
                        <img src={gcslogo} width={20} height={20} className='mr-2' alt='Google Cloud Storage Logo' />
                        <Typography
                          variant='body-medium'
                          className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                        >
                          {decodeURIComponent(link).split('/').at(-1)?.split('?')[0] ?? 'GCS File'}
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
                      !isAllowedHost(link, ['storage.googleapis.com', 'wikipedia.org', 'www.youtube.com']) && (
                        <div className='flex flex-row inline-block justify-between items-center'>
                          <GlobeAltIconOutline className='n-size-token-7' />
                          <TextLink href={link} externalLink={true}>
                            <Typography variant='body-medium'>{link}</Typography>
                          </TextLink>
                        </div>
                      )}
                  </>
                ) : link?.startsWith('s3://') ? (
                  <div className='flex flex-row inline-block justify-between items-center'>
                    <img src={s3logo} width={20} height={20} className='mr-2' alt='S3 Logo' />
                    <Typography
                      variant='body-medium'
                      className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                    >
                      {decodeURIComponent(link).split('/').at(-1) ?? 'S3 File'}
                    </Typography>
                  </div>
                ) : (
                  <div className='flex flex-row inline-block justify-between items-center'>
                    <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                    <Typography
                      variant='body-medium'
                      className='text-ellipsis whitespace-nowrap overflow-hidden max-w-lg'
                    >
                      {link}
                    </Typography>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <span className='h6 text-center'>No Sources Found</span>
      )}
    </>
  );
};
export default SourcesInfo;
