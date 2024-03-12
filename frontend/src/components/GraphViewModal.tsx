import { Button, Dialog } from '@neo4j-ndl/react';
import { useEffect, useRef, useState } from 'react';
import { GraphViewModalProps } from '../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/core';
import { driver } from '../utils/Driver';

const uniqueElementsForDocQuery = `
// Finds a document with chunks & entities. Transforms path objects to return a list of unique nodes and relationships.
MATCH p=(n:Document)<-[:PART_OF]-(:Chunk)-[:HAS_ENTITY]-()-[*0..1]-()
WHERE n.fileName = $document_name
WITH nodes(p) as nodes, relationships(p) as rels
UNWIND nodes as node
WITH  collect(DISTINCT node) as nodes, collect(rels) as relslist
UNWIND relslist as rels
UNWIND rels as rel
WITH  nodes, collect(DISTINCT rel) as rels
RETURN nodes, rels`

const colors = [
  '#588c7e',
  '#f2e394',
  '#f2ae72',
  '#d96459',
  '#5b9aa0',
  '#d6d4e0',
  '#b8a9c9',
  '#622569',
  '#ddd5af',
  '#d9ad7c',
  '#a2836e',
  '#674d3c',
];


const getNodeCaption = (node) => {
  if (node.properties['name']) {
    return node.properties['name'];
  }
  if (node.properties['text']) {
    return node.properties['text'];
  }
  if (node.properties['fileName']) {
    return node.properties['fileName'];
  }
  return node.elementId
}

const getIcon = (node) => {
  if (node.labels[0] == 'Document') {
    return 'paginate-filter-text.svg';
  }
  if (node.labels[0] == 'Chunk') {
    return 'paragraph-left-align.svg';
  }
  return undefined;
}

const getSize = (node) => {
  if (node.labels[0] == 'Document') {
    return 40;
  }
  if (node.labels[0] == 'Chunk') {
    return 30;
  }
  return undefined;
}

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState([]);
  const [relationships, setRelationships] = useState([]);

  useEffect(() => {
    if (open) {
      setNodes([]);
      setRelationships([]);

      const session = driver.session();
      session.run(uniqueElementsForDocQuery, { 'document_name': inspectedName }).then(
        (results) => {
          // If this doc exists in the graph, the result length will be one.
          if (results.records.length == 1) {
            const neo4jNodes = results.records[0]._fields[0];
            const neo4jRels = results.records[0]._fields[1];

            // Infer color schema dynamically
            let iterator = 0;
            const scheme = {}

            neo4jNodes.forEach(node => {
              const label = node.labels[0];
              if (scheme[label] == undefined) {
                scheme[label] = colors[iterator]
                iterator += 1;
              }
            });
            
            const newNodes = neo4jNodes.map(n => {
              return {
                id: n.elementId, size: getSize(n), captionAlign: 'bottom', captionHtml: <b>Test</b>, iconAlign: 'bottom',
                icon: getIcon(n), caption: getNodeCaption(n), color: scheme[n.labels[0]]
              };
            });
            const newRels = neo4jRels.map(r => {
              return { id: r.elementId, from: r.startNodeElementId, to: r.endNodeElementId, caption: r.type };
            });

            setNodes(newNodes);
            setRelationships(newRels);
          } else {
            console.error("Unable to retrieve document graph for " + inspectedName, results);
          }
        }
      );
    }
  }, [open]);

  // If the modal is closed, render nothing
  if (!open) {
    return <></>;
  }
  const mouseEventCallbacks = {
    onPan: true,
    onZoom: true,
    onDrag: true,
  };

  const nvlOptions: NvlOptions = {
    allowDynamicMinZoom: false,
    disableWebGL: true,
    maxZoom: 2,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    selectionBehaviour: 'single',
    useWebGL: false,
    instanceId: 'inspect-graph',
  };

  return (
    <>
      <Dialog size='unset' open={open} aria-labelledby='form-dialog-title' disableCloseButton>
        <Dialog.Header id='form-dialog-title'>Inspect Generated Graph from {inspectedName}. </Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <div style={{ width: '100%', height: '500px' }}>
            <InteractiveNvlWrapper
              ref={nvlRef}
              nodes={nodes}
              rels={relationships}
              nvlOptions={nvlOptions}
              mouseEventCallbacks={{ ...mouseEventCallbacks }}
            />
          </div>

          <Dialog.Actions className='mt-6 mb-2'>
            <Button onClick={() => setGraphViewOpen(false)}>
              Close
            </Button>
          </Dialog.Actions>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
export default GraphViewModal;
