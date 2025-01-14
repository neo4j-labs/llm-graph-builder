import { Flex, IconButton, TextInput, Typography } from '@neo4j-ndl/react';
import { MagnifyingGlassIconOutline } from '@neo4j-ndl/react/icons';
import { LegendsChip } from './LegendsChip';
import { ExtendedNode, ExtendedRelationship, Scheme } from '../../types';
import { graphLabels, RESULT_STEP_SIZE } from '../../utils/Constants';
import type { Relationship } from '@neo4j-nvl/base';
import { ShowAll } from '../UI/ShowAll';
import { sortAlphabetically } from '../../utils/Utils';
import { Dispatch, SetStateAction } from 'react';

interface OverViewProps {
  nodes: ExtendedNode[];
  relationships: ExtendedRelationship[];
  newScheme: Scheme;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setNodes: Dispatch<SetStateAction<ExtendedNode[]>>;
  setRelationships: Dispatch<SetStateAction<ExtendedRelationship[]>>;
}
const ResultOverview: React.FunctionComponent<OverViewProps> = ({
  nodes,
  relationships,
  newScheme,
  searchQuery,
  setSearchQuery,
  setNodes,
  setRelationships,
}) => {
  const nodeCount = (nodes: ExtendedNode[], label: string): number => {
    return [...new Set(nodes?.filter((n) => n.labels?.includes(label)).map((i) => i.id))].length;
  };

  // sort the legends in with Chunk and Document always the first two values
  const nodeCheck = Object.keys(newScheme).sort((a, b) => {
    if (a === graphLabels.document || a === graphLabels.chunk) {
      return -1;
    } else if (b === graphLabels.document || b === graphLabels.chunk) {
      return 1;
    }
    return a.localeCompare(b);
  });

  // get sorted relationships
  const relationshipsSorted = relationships.sort(sortAlphabetically);

  const relationshipCount = (relationships: ExtendedRelationship[], label: string): number => {
    return [...new Set(relationships?.filter((r) => r.caption?.includes(label)).map((i) => i.id))].length;
  };

  // To get the relationship count
  const groupedAndSortedRelationships: ExtendedRelationship[] = Object.values(
    relationshipsSorted.reduce((acc: { [key: string]: ExtendedRelationship }, relType: Relationship) => {
      const key = relType.caption || '';
      if (!acc[key]) {
        acc[key] = { ...relType, count: 0 };
      }
      (acc[key] as { count: number }).count += relationshipCount(relationships as ExtendedRelationship[], key);
      return acc;
    }, {})
  );

  // On Relationship Legend Click, highlight the relationships and deactivating any active nodes
  const handleRelationshipClick = (nodeLabel: string) => {
    const updatedRelations = relationships.map((rel) => {
      return {
        ...rel,
        selected: rel?.caption?.includes(nodeLabel),
      };
    });

    // // deactivating any active nodes
    const updatedNodes = nodes.map((node) => {
      return {
        ...node,
        selected: false,
        size: graphLabels.nodeSize,
      };
    });
    if (searchQuery !== '') {
      setSearchQuery('');
    }
    setRelationships(updatedRelations);
    setNodes(updatedNodes);
  };

  // On Node Click, highlighting the nodes and deactivating any active relationships
  const handleNodeClick = (nodeLabel: string) => {
    const updatedNodes = nodes.map((node) => {
      const isActive = node.labels.includes(nodeLabel);
      return {
        ...node,
        selected: isActive,
      };
    });
    // deactivating any active relationships
    const updatedRelationships = relationships.map((rel) => {
      return {
        ...rel,
        selected: false,
      };
    });
    if (searchQuery !== '') {
      setSearchQuery('');
    }
    setNodes(updatedNodes);
    setRelationships(updatedRelationships);
  };

  return (
    <>
      {nodeCheck.length > 0 && (
        <>
          <Flex className='py-3 pt-3 ml-2'>
            <Typography variant='h3'>{graphLabels.resultOverview}</Typography>
            <div className={`text-input-container`}>
              <TextInput
                htmlAttributes={{
                  type: 'text',
                  'aria-label': 'search nodes',
                  placeholder: 'Search On Node Properties',
                }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                isFluid={true}
                leftElement={
                  <IconButton
                    ariaLabel='Search Icon'
                    isClean={true}
                    size='small'
                    className='-mt-0.5'
                    htmlAttributes={{ type: 'submit' }}
                  >
                    <MagnifyingGlassIconOutline className='n-size-token-7' />
                  </IconButton>
                }
              />
            </div>
            <Typography variant='subheading-small'>
              {graphLabels.totalNodes} ({nodes.length})
            </Typography>
          </Flex>
          <div className='flex gap-2 flex-wrap ml-2'>
            <ShowAll initiallyShown={RESULT_STEP_SIZE}>
              {nodeCheck.map((nodeLabel) => (
                <LegendsChip
                  type='node'
                  key={nodeLabel}
                  label={nodeLabel}
                  scheme={newScheme}
                  count={nodeCount(nodes, nodeLabel)}
                  onClick={() => handleNodeClick(nodeLabel)}
                />
              ))}
            </ShowAll>
          </div>
        </>
      )}
      {relationshipsSorted.length > 0 && (
        <>
          <Flex className='py-3 pt-3 ml-2'>
            <Typography variant='subheading-small'>
              {graphLabels.totalRelationships} ({relationships.length})
            </Typography>
          </Flex>
          <div className='flex gap-2 flex-wrap ml-2'>
            <ShowAll initiallyShown={RESULT_STEP_SIZE}>
              {groupedAndSortedRelationships.map((relType, index) => (
                <LegendsChip
                  key={index}
                  label={relType.caption || ''}
                  type='relationship'
                  count={relationshipCount(relationships as ExtendedRelationship[], relType.caption || '')}
                  onClick={() => handleRelationshipClick(relType.caption || '')}
                  scheme={{}}
                />
              ))}
            </ShowAll>
          </div>
        </>
      )}
    </>
  );
};

export default ResultOverview;
