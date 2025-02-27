import { useMemo } from 'react';
import { ResizePanelDetails } from './ResizePanel';
import { BasicNode, BasicRelationship, GraphPropertiesPanelProps } from '../../types';
import { LegendsChip } from './LegendsChip';
import GraphPropertiesTable from './GraphPropertiesTable';

const sortAlphabetically = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

const isNode = (item: BasicNode | BasicRelationship): item is BasicNode => {
  return 'labels' in item && !('from' in item) && !('to' in item);
};

const GraphPropertiesPanel = ({ inspectedItem, newScheme }: GraphPropertiesPanelProps) => {
  const inspectedItemType = isNode(inspectedItem) ? 'node' : 'relationship';
  const filteredProperties =
    inspectedItemType === 'node'
      ? Object.entries((inspectedItem as BasicNode).properties)
          .filter(([, value]) => value !== null && value !== undefined && value !== ' ')
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, any>)
      : {};
  const properties =
    inspectedItemType === 'node'
      ? [
          {
            key: '<id>',
            value: `${(inspectedItem as BasicNode).id}`,
            type: 'String',
          },
          ...Object.keys(filteredProperties).map((key) => {
            const value = filteredProperties[key];
            return { key, value };
          }),
        ]
      : [
          {
            key: '<element_id>',
            value: `${(inspectedItem as BasicRelationship).id}`,
            type: 'String',
          },
          {
            key: '<from>',
            value: `${(inspectedItem as BasicRelationship).from}`,
            type: 'String',
          },
          {
            key: '<to>',
            value: `${(inspectedItem as BasicRelationship).to}`,
            type: 'String',
          },
          {
            key: '<caption>',
            value: `${(inspectedItem as BasicRelationship).caption ?? ''}`,
            type: 'String',
          },
        ];
  const labelsSorted = useMemo(() => {
    if (isNode(inspectedItem)) {
      return [...inspectedItem.labels].sort(sortAlphabetically);
    }
    return [];
  }, [inspectedItem]);

  return (
    <>
      <ResizePanelDetails.Title>
        <h6 className='mr-auto'>{inspectedItemType === 'node' ? 'Node details' : 'Relationship details'}</h6>
      </ResizePanelDetails.Title>
      <ResizePanelDetails.Content>
        <div className='mx-4 flex! flex-row flex-wrap gap-2'>
          {isNode(inspectedItem) ? (
            labelsSorted.map((label) => (
              <LegendsChip type='node' key={`node ${label}`} label={label} scheme={newScheme} />
            ))
          ) : (
            <LegendsChip
              type='relationship'
              label={(inspectedItem as BasicRelationship).caption ?? ''}
              key={`relationship ${(inspectedItem as BasicRelationship).id}`}
              scheme={{}}
            />
          )}
        </div>
        <div className='bg-palette-neutral-border-weak my-3 h-px w-full' />
        <GraphPropertiesTable propertiesWithTypes={properties} />
      </ResizePanelDetails.Content>
    </>
  );
};

export default GraphPropertiesPanel;
