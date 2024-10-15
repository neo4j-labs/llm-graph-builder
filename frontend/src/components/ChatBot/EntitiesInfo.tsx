import { Box, GraphLabel, LoadingSpinner, TextLink } from '@neo4j-ndl/react';
import { FC, useMemo, useState } from 'react';
import { EntitiesProps, GroupedEntity, UserCredentials } from '../../types';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { graphLabels } from '../../utils/Constants';
import { parseEntity } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
import { getNeighbors } from '../../services/GraphQuery';
import GraphViewModal from '../Graph/GraphViewModal';
const EntitiesInfo: FC<EntitiesProps> = ({ loading, mode, graphonly_entities, infoEntities }) => {
  const { userCredentials } = useCredentials();
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
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

  const handleEntityClick = async (elementId: string) => {
    console.log('element_id', elementId);
    try {
      const result = await getNeighbors(userCredentials as UserCredentials, elementId);
      if (result && result.data.data.nodes.length > 0) {
        const nodes = result.data.data.nodes.filter((node: any) => node.labels.length === 1);
        const nodeIds = new Set(nodes.map((node: any) => node.element_id));
        const relationships = result.data.data.relationships.filter(
          (rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id)
        );
        setNeoNodes(nodes);
        setNeoRels(relationships);
        setOpenGraphView(true);
        setViewPoint('chatInfoView'); // Open the graph view modal
      }
    } catch (error: any) {
      console.log('error', error);
    }
  };

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
                const entityId = infoEntities.find((entity) => entity.labels.includes(label))?.element_id; // Extract element_id
                return (
                  <li
                    key={index}
                    className='flex items-center mb-2 text-ellipsis whitespace-nowrap max-w-[100%)] overflow-hidden'
                  >
                    <GraphLabel type='node' className='legend' color={`${entity.color}`} selected={false}>
                      {label === '__Community__' ? graphLabels.community : label} ({labelCounts[label]})
                    </GraphLabel>
                    <TextLink
                      className='ml-2 text-ellipsis whitespace-nowrap max-w-[calc(100%-120px)] overflow-hidden cursor-pointer'
                      onClick={() => handleEntityClick(entityId!)} // Pass the entityId to the click handler
                    >
                      {Array.from(entity.texts).slice(0, 3).join(', ')}
                    </TextLink>
                  </li>
                );
              })}
        </ul>
      ) : (
        <span className='h6 text-center'>No Entities Found</span>
      )}
      {/* Render the Graph View Modal */}
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
