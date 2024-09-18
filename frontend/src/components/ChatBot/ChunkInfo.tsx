import { FC } from 'react';
import { ChunkProps } from '../../types';
import { Box, LoadingSpinner, TextLink, Typography } from '@neo4j-ndl/react';
import { DocumentTextIconOutline, GlobeAltIconOutline } from '@neo4j-ndl/react/icons';
import wikipedialogo from '../../assets/images/wikipedia.svg';
import youtubelogo from '../../assets/images/youtube.svg';
import gcslogo from '../../assets/images/gcs.webp';
import s3logo from '../../assets/images/s3logo.png';
import ReactMarkdown from 'react-markdown';
import { generateYouTubeLink } from '../../utils/Utils';

const ChunkInfo: FC<ChunkProps> = ({ loading, chunks }) => {
  return (
    <>
      {loading ? (
        <Box className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </Box>
      ) : chunks?.length > 0 ? (
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
                    <Typography variant='subheading-small'>Similarity Score: {chunk?.score}</Typography>
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
                ) : chunk.fileSource === 'local file' ? (
                  <>
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
        <span className='h6 text-center'> No Chunks Found</span>
      )}
    </>
  );
};

export default ChunkInfo;
