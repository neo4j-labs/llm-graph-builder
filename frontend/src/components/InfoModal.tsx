import { Box, Typography, Label, Button, TextLink } from '@neo4j-ndl/react';
import { ClockIconOutline, DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import '../styling/info.css';
import Neo4jRetrievalLogo from '../assets/images/Neo4jRetrievalLogo.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import youtubelogo from '../assets/images/youtube.png';
import { LabelColors, chatInfoMessage } from '../types';
import { useMemo } from 'react';
import HoverableLink from './HoverableLink';

const labelColors: LabelColors[] = ['default', 'success', 'info', 'warning', 'danger', undefined];

const parseEntity = (entity: string) => {
  const [label1, text1] = entity.split(/ [A-Z_]+ /)[0].split(':');
  const [label2, text2] = entity.split(/ [A-Z_]+ /)[1].split(':');
  return { label1, text1, label2, text2 };
};
const InfoModal: React.FC<chatInfoMessage> = ({ sources, model, total_tokens, response_time, entities }) => {
  console.log('sources inside modal', sources);
  console.log('entities inside modal', entities);
  console.log('model inside modal', model);
  console.log('total tokens  inside modal', total_tokens);
  console.log('timeTaken inside modal', response_time);

  const groupedEntities = useMemo(() => {
    return entities?.reduce((acc, entity) => {
      const { label1, text1, label2, text2 } = parseEntity(entity);
      if (!acc[label1]) {
        acc[label1] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
        acc[label1].texts.add(text1);
      }
      if (!acc[label2]) {
        acc[label2] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
        acc[label2].texts.add(text2);
      }
      return acc;
    }, {} as Record<string, { texts: Set<string>; color: LabelColors }>);
  }, [entities]);

  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img src={Neo4jRetrievalLogo} alt='icon' style={{ width: 95, height: 95, marginRight: 10 }} />
        <Box className='flex flex-col'>
          <Typography variant='h2'>Retrieval information</Typography>
          <Typography variant='body-medium' sx={{ mb: 2 }}>
            To generate this response, in <span className='font-bold'>{response_time.toFixed(2)} seconds</span> we used{' '}
            <span className='font-bold'>{total_tokens}</span> tokens with the model{' '}
            <span className='font-bold'>{model}</span>.
          </Typography>
        </Box>
      </Box>
      <Typography variant='h4' className='mb-1'>
        Sources used
      </Typography>
      {sources.length > 0 ? (
        <ul className='list-none'>
          {sources.map((link, index) => (
            <li key={index}>
              {link.startsWith('http') || link.startsWith('https') ? (
                <div className='flex flex-row inline-block justiy-between items-center p8'>
                  {link.includes('wikipedia.org') ? (
                    <img src={wikipedialogo} width={20} height={20} className='mr-2' />
                  ) : (
                    <img src={youtubelogo} width={20} height={20} className='mr-2' />
                  )}
                  <TextLink href={link} externalLink={true}>
                    {link.includes('wikipedia.org') ? (
                      <>
                        <HoverableLink url={link}>
                          <Typography variant='body-medium'>Wikipedia</Typography>
                          <Typography variant='body-small' className='italic'>
                            {' '}
                            - Section {total_tokens}
                          </Typography>
                        </HoverableLink>
                      </>
                    ) : (
                      <>
                        <HoverableLink url={link}>
                          <Typography variant='body-medium'>YouTube</Typography>
                          <Typography variant='body-small' className='italic'>
                            - 00:01:24 - 00:01:32
                          </Typography>
                        </HoverableLink>
                      </>
                    )}
                  </TextLink>
                </div>
              ) : (
                <div className='flex flex-row inline-block justiy-between items-center'>
                  <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                  <Typography
                    variant='body-medium'
                    className='text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden'
                  >
                    {link}
                  </Typography>
                  <Typography variant='body-small' className='italic'>
                    {' '}
                    - Page {Math.floor(Math.random() * 100)}
                  </Typography>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant='body-large'>No sources found</Typography>
      )}
      <Typography className='mt-3 mb-2' variant='h4'>
        Entities used
      </Typography>
      {Object.keys(groupedEntities).length > 0 ? (
        <ul className='list-none'>
          {Object.keys(groupedEntities).map((label, index) => (
            <li
              key={index}
              className='flex items-center mb-2'
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
            >
              <Label color={groupedEntities[label].color} fill='semi-filled' className='entity-label mr-2'>
                {label}
              </Label>
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
                {Array.from(groupedEntities[label].texts).join(', ')}
              </Typography>
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant='body-large'>No entities found</Typography>
      )}
      <Box className='button-container flex mt-2 justify-between'>
        <Button disabled={true} className='w-[48%]'>
          Graph View
        </Button>
        <Button disabled={true} className='w-[48%]'>
          Chunk used
        </Button>
      </Box>
    </Box>
  );
};
export default InfoModal;
