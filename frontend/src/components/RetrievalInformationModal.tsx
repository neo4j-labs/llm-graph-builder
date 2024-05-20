import React from 'react';
import { Box, Typography, Label, Button, TextLink } from '@neo4j-ndl/react';
import { ClockIconOutline, DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import './Retrieval.css';
import HoverableLink from './HoverableLink';

import Neo4jRetrievalLogo from '../assets/images/Neo4jRetrievalLogo.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import youtubelogo from '../assets/images/youtube.png';

function RetrievalInformation({ sources, model, entities, timeTaken }) {
  const labelColors = ["default", "success", "info", "warning", "danger", undefined];
  
  const parseEntity = (entity) => {
    const parts = entity.split(/ [A-Z_]+ /);
    const [label1, text1] = parts[0].split(':');
    const [label2, text2] = parts[1].split(':');
    return { label1, text1, label2, text2 };
  };

  const groupedEntities = entities.reduce((acc, entity) => {
    const { label1, text1, label2, text2 } = parseEntity(entity);

    if (!acc[label1]) {
      acc[label1] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
    }
    acc[label1].texts.add(text1);

    if (!acc[label2]) {
      acc[label2] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
    }
    acc[label2].texts.add(text2);

    return acc;
  }, {});

  return (
    <Box className="n-bg-palette-neutral-bg-weak p-4">
      <Box className='flex flex-row pb-6' sx={{ alignItems: 'center', mb: 2 }}>
        <img src={Neo4jRetrievalLogo} alt="icon" style={{ width: 95, height: 95, marginRight: 10 }} />
        <Box className='flex flex-col'>
          <Typography variant="h2">Retrieval information</Typography>
          <Typography className="" variant="body-medium" sx={{ mb: 2 }}>
            To generate this response, we used <span className='font-bold italic'>xx</span> tokens with the model <span className='font-bold italic'>{model}</span>.
            <Typography className="pl-1 italic" variant="body-small"><ClockIconOutline className="w-4 h-4 inline-block mb-1" /> {timeTaken / 1000} seconds</Typography>
          </Typography>
        </Box>
      </Box>
      <Typography variant="h4" sx={{ mb: 1 }}>Sources used</Typography>
      <ul className='list-none'>
        {sources.map((link, index) => (
          <li key={index}>
            {link.startsWith('http') || link.startsWith('https') ? (
              <div className='flex flex-row inline-block'>
                {link.includes('wikipedia.org') ? (
                   <img src={wikipedialogo} width={20} height={20} />
                ) : (
                  <img src={youtubelogo} width={20} height={20} />
                )}
                <TextLink href={link} externalLink={true}>
                  {link.includes('wikipedia.org') ? (
                    <>
                      <HoverableLink url={link}>
                          <Typography variant='body-medium'>Wikipedia</Typography>
                          <Typography variant='body-small' className="italic"> - Section XXX</Typography>
                      </HoverableLink>
                    </>
                  ) : (
                    <>
                      <HoverableLink url={link}>
                        <Typography variant='body-medium'>YouTube</Typography>
                        <Typography variant='body-small' className="italic"> - 00:01:24 - 00:01:32</Typography>
                      </HoverableLink>
                    </>
                  )}
                </TextLink>
              </div>
            ) : (
              <div className='flex flex-row inline-block'>
                <DocumentTextIconOutline className="n-size-token-7" />
                <Typography variant='body-medium' className="text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden">{link}</Typography>
                <Typography variant='body-small' className="italic"> - Page {Math.floor(Math.random() * 100)}</Typography>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>Entities used</Typography>
      <ul className='list-none'>
        {Object.keys(groupedEntities).map((label, index) => (
          <li key={index} className='flex items-center mb-2' style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <Label color={groupedEntities[label].color} fill="semi-filled" className='entity-label mr-2'>{label}</Label>
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
      <Box className="button-container" sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button className='w-[48%]'>Graph View</Button>
        <Button className='w-[48%]'>Chunk used</Button>
      </Box>
    </Box>
  );
}

export default RetrievalInformation;
