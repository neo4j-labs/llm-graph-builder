import { Box, GraphLabel, LoadingSpinner, TextLink, Typography } from '@neo4j-ndl/react';
import { FC, useMemo, useState } from 'react';
import { EntitiesProps, GroupedEntity, UserCredentials } from '../../types';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { graphLabels } from '../../utils/Constants';
import { parseEntity } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
import GraphViewModal from '../Graph/GraphViewModal';
import { handleGraphNodeClick } from './chatInfo';

const EntitiesInfo: FC<EntitiesProps> = ({ loading, mode, graphonly_entities, infoEntities }) => {
  const { userCredentials } = useCredentials();
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
  const [loadingGraphView, setLoadingGraphView] = useState(false);

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

  const handleEntityClick = (elementId: string, viewMode: string) => {
    handleGraphNodeClick(
      userCredentials as UserCredentials,
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
        <Box className='flex justify-center items-center'>
          <LoadingSpinner size='small' />
        </Box>
      ) : (mode !== 'graph' && Object.keys(groupedEntities)?.length > 0) ||
        (mode == 'graph' && Object.keys(graphonly_entities)?.length > 0) ? (
        <ul className='list-none p-4 max-h-80 overflow-auto'>
          {mode == 'graph'
            ? graphonly_entities.map((label, index) => (
                <li
                  key={index}
                  className={`flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%] overflow-hidden ${
                    loadingGraphView ? 'cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  <ul className='list-inside'>
                    {Object.keys(label).map((key) => (
                      <li key={key} className='flex items-center'>
                        <GraphLabel type='node' color={calcWordColor(key)} className='mr-2 mt-2 ' selected={false}>
                          {key}
                        </GraphLabel>
                        <Typography
                          variant='body-medium'
                          className='ml-2 text-ellipsis whitespace-nowrap overflow-hidden'
                        >
                          {
                            // @ts-ignore
                            label[key].id ?? label[key]
                          }
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            : sortedLabels.map((label, index) => {
                const entity = groupedEntities[label == 'undefined' ? 'Entity' : label];
                return (
                  <li
                    key={index}
                    className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                  >
                    <GraphLabel type='node' className='legend' color={`${entity.color}`} selected={false}>
                      {label === '__Community__' ? graphLabels.community : label} ({labelCounts[label]})
                    </GraphLabel>
                    <Typography
                      variant='body-medium'
                      className='ml-2 text-ellipsis whitespace-nowrap max-w-[calc(100%-120px)] overflow-hidden'
                    >
                      {Array.from(entity.texts)
                        .slice(0, 3)
                        .map((text, idx) => {
                          const matchingEntity = infoEntities.find(
                            (e) => e.labels.includes(label) && parseEntity(e).text === text
                          );
                          const textId = matchingEntity?.element_id;
                          return (
                            <span key={idx}>
                              <TextLink
                                onClick={() => handleEntityClick(textId!, 'chatInfoView')}
                                className={loadingGraphView ? 'cursor-wait' : 'cursor-pointer'}
                              >
                                {text}
                              </TextLink>
                              {Array.from(entity.texts).length > 1 ? ',' : ''}
                            </span>
                          );
                        })}
                    </Typography>
                  </li>
                );
              })}
        </ul>
      ) : (
        <span className='h6 text-center'>No Entities Found</span>
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
export default EntitiesInfo;