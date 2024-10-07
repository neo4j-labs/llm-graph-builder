import { useMemo } from 'react';
import { ResizePanelDetails } from './ResizePanel';
import { Relationship } from '@neo4j-nvl/base';
import { BasicNode, BasicRelationship, ExtendedNode, Scheme } from '../../types';
import { LegendsChip } from './LegendsChip';
import { PropertiesTableNvl } from './PropertiesTableNvl';

type NvlDetailsPanelProps = {
    inspectedItem: BasicNode | BasicRelationship;
    paneWidth: number;
    enableStylePicker: boolean;
    newScheme: Scheme;

};
const sortAlphabetically = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

const isNode = (item: BasicNode | Relationship): item is ExtendedNode => {
    return !('startNodeId' in item) && !('endNodeId' in item);
};

export function NvlDetailsPanel({ inspectedItem, paneWidth, newScheme }: NvlDetailsPanelProps) {
    const inspectedItemType = isNode(inspectedItem) ? 'node' : 'relationship';
    const properties = [
        {
            key: '<id>',
            value: `${inspectedItem.id}`,
            type: 'String',
        },
        ...Object.keys(inspectedItem.properties).map((key) => {
            const value = inspectedItem.properties[key];
            const type = inspectedItem.propertyTypes[key];
            return { key: key, value: value ?? '', type: type ?? '' };
        }),
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
                <h6 className="mr-auto">{inspectedItemType === 'node' ? 'Node details' : 'Relationship details'}</h6>
                {/* <ClipboardCopier
                    textToCopy={properties.map((prop) => `${prop.key}: ${prop.value}`).join('\n')}
                    title="Copy all properties to clipboard"
                    ariaLabel="Copy all properties to clipboard"
                    iconButtonSize="small"
                /> */}
            </ResizePanelDetails.Title>
            <ResizePanelDetails.Content>
                <div className="mx-4 flex flex-row flex-wrap gap-2">
                    {isNode(inspectedItem) ? (
                        labelsSorted.map((label) => (
                            <LegendsChip
                                type='node'
                                key={`node ${label}`}
                                label={label}
                                scheme={newScheme}
                                count={nodeCount(nodes, nodeLabel)}
                                onClick={(e) => console.log('Hello node')} />
                        ))
                    ) : (
                        <LegendsChip
                            type="relationship"
                            label={inspectedItem.type ?? ''}
                            key={`relationship ${inspectedItem.type}`}
                            onClick={() => console.log('hello, relationship')}
                            scheme={{}}
                            count={relationshipCount(
                                relationships as ExtendedRelationship[],
                                relType.caption || ''
                            )}
                        />
                    )}
                </div>
                {/* Divider */}
                <div className="bg-palette-neutral-border-weak my-3 h-px w-full" />
                <PropertiesTableNvl propertiesWithTypes={properties} paneWidth={paneWidth} />
            </ResizePanelDetails.Content>
        </>
    );
}