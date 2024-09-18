import { Box, GraphLabel, LoadingSpinner, Typography } from '@neo4j-ndl/react';
import { FC, useMemo } from 'react';
import { EntitiesProps, GroupedEntity } from '../../types';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { graphLabels } from '../../utils/Constants';
import { parseEntity } from '../../utils/Utils';

const EntitiesInfo: FC<EntitiesProps> = ({ loading, mode, graphonly_entities, infoEntities }) => {
  const groupedEntities = useMemo<{ [key: string]: GroupedEntity }>(() => {
    const items = infoEntities.reduce((acc, entity) => {
      const { label, text } = parseEntity(entity);
      if (!acc[label]) {
        const newColor = calcWordColor(label);
        acc[label] = { texts: new Set(), color: newColor };
      }
      acc[label].texts.add(text);
      return acc;
    }, {} as Record<string, { texts: Set<string>; color: string }>);
    return items;
  }, [infoEntities]);

  const labelCounts = useMemo(() => {
    const counts: { [label: string]: number } = {};
    for (let index = 0; index < infoEntities?.length; index++) {
      const entity = infoEntities[index];
      const { labels } = entity;
      const [label] = labels;
      counts[label] = counts[label] ? counts[label] + 1 : 1;
    }
    return counts;
  }, [infoEntities]);

  const sortedLabels = useMemo(() => {
    return Object.keys(labelCounts).sort((a, b) => labelCounts[b] - labelCounts[a]);
  }, [labelCounts]);
  return (
    <>
      {loading ? (
        <Box className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </Box>
      ) : Object.keys(groupedEntities)?.length > 0 || Object.keys(graphonly_entities)?.length > 0 ? (
        <ul className='list-none p-4 max-h-80 overflow-auto'>
          {mode == 'graph'
            ? graphonly_entities.map((label, index) => (
                <li
                  key={index}
                  className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                >
                  <div style={{ backgroundColor: calcWordColor(Object.keys(label)[0]) }} className='legend mr-2'>
                    {
                      // @ts-ignore
                      label[Object.keys(label)[0]].id ?? Object.keys(label)[0]
                    }
                  </div>
                </li>
              ))
            : sortedLabels.map((label, index) => {
                const entity = groupedEntities[label == 'undefined' ? 'Entity' : label];
                return (
                  <li
                    key={index}
                    className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                  >
                    <GraphLabel
                      type='node'
                      className='legend'
                      color={`${entity.color}`}
                      selected={false}
                      onClick={(e) => e.preventDefault()}
                    >
                      {label === '__Community__' ? graphLabels.community : label} ({labelCounts[label]})
                    </GraphLabel>
                    <Typography
                      className='ml-2  text-ellipsis whitespace-nowrap max-w-[calc(100%-120px)] overflow-hidden'
                      variant='body-medium'
                    >
                      {Array.from(entity.texts).slice(0, 3).join(', ')}
                    </Typography>
                  </li>
                );
              })}
        </ul>
      ) : (
        <span className='h6 text-center'>No Entities Found</span>
      )}
    </>
  );
};

export default EntitiesInfo;
