// import { TextLink, Typography } from '@neo4j-ndl/react';
import { chatInfoMessage } from '../types';
// import { extractPdfFileName } from '../utils/Utils';

const ListComp: React.FC<chatInfoMessage> = (info) => {
  const { sources, entities, model } = info;

  return (
    <>
      <ul>
        <li>
          <strong>Model: </strong>
          {model}
        </li>
        <li>
          <strong>Sources: </strong> {sources?.join(', ')}
        </li>
        {/* {sources?.length ? (
            <div className='flex flex-col gap-1'>
              {sources.map((link, index) => {
                return (
                  <div key={index}>
                    <>{console.log('link', link)}</>
                    {link.includes('storage.googleapis.com') ? (
                      <Typography variant='body-large'>GCS : {extractPdfFileName(link)}</Typography>
                    ) : link.startsWith('http') || link.startsWith('https') ? (
                      <TextLink href={link} externalLink={true}>
                        Source
                      </TextLink>
                    ) : link.startsWith('s3') ? (
                      <Typography variant='body-large'>S3 File: {link.split('/').at(-1)}</Typography>
                    ) : (
                      <Typography variant='body-large'>{link}</Typography>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null} */}
        <li>
          <strong>Entities: </strong>{' '}
          <ul>
            {entities?.map((entity: string, index: number) => (
              <li key={index} className='text-ellipsis whitespace-normal overflow-hidden list'>
                <span title={entity}>{entity}</span>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </>
  );
};

export default ListComp;
