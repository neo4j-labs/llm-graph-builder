import { Banner, Button, Dialog, LoadingSpinner, Radio } from '@neo4j-ndl/react';
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
RETURN nodes, rels`;

const pureDocument = `
MATCH (d:Document {status:'Completed'}) 
WITH d ORDER BY d.createdAt DESC 
LIMIT 10
MATCH docs=(d)<-[:PART_OF]-(c:Chunk)
WITH docs,
collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } as chain, 
collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } as chunks
WITH [docs] +chain + chunks as paths 
CALL { WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }
CALL { WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }
RETURN nodes, rels
 `;

const docEntitiesGraph = `
MATCH (d:Document {status:'Completed'}) 
WITH d ORDER BY d.createdAt DESC 
LIMIT 10
MATCH docs=(d)<-[:PART_OF]-(c:Chunk)
WITH docs, collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)--(:!Chunk) RETURN p } as entities,
collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } as chain, 
collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } as chunks
WITH entities + chain + chunks + [docs] as paths 
CALL { WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }
CALL { WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }
RETURN nodes, rels`;

const knowledgeGraph = `
MATCH (d:Document {status:'Completed'}) 
WITH d ORDER BY d.createdAt DESC 
LIMIT 10
MATCH (d)<-[:PART_OF]-(c:Chunk)
WITH 
collect { OPTIONAL MATCH p=(c)-[:HAS_ENTITY]->(e)--(:!Chunk) RETURN p } as entities
CALL { WITH entities UNWIND entities AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }
CALL { WITH entities UNWIND entities AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }
RETURN nodes, rels`;

const queryMap: any = {
  'Document Structure': pureDocument,
  'Document & Knowledge Graph': docEntitiesGraph,
  'Knowledge Graph Entities': knowledgeGraph,
};

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

const getNodeCaption = (node: any) => {
  if (node.properties.name) {
    return node.properties.name;
  }
  if (node.properties.text) {
    return node.properties.text;
  }
  if (node.properties.fileName) {
    return node.properties.fileName;
  }
  return node.elementId;
};

const getIcon = (node: any) => {
  if (node.labels[0] == 'Document') {
    return 'paginate-filter-text.svg';
  }
  if (node.labels[0] == 'Chunk') {
    return 'paragraph-left-align.svg';
  }
  return undefined;
};

const getSize = (node: any) => {
  if (node.labels[0] == 'Document') {
    return 40;
  }
  if (node.labels[0] == 'Chunk') {
    return 30;
  }
  return undefined;
};

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [relationships, setRelationships] = useState([]);
  const [graphType, setGraphType] = useState<string>('Knowledge Graph Entities');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleRadioChange = (e: any) => {
    if (e.target.checked) {
      setGraphType(e.target.value);
    }
  };

  useEffect(() => {
    return () => {
      //@ts-ignore
      nvlRef.current?.destroy();
      setGraphType('Knowledge Graph Entities');
    };
  }, []);

  useEffect(() => {
    if (open) {
      setNodes([]);
      setRelationships([]);
      let queryToRun = '';
      if (viewPoint === 'tableView') {
        queryToRun = uniqueElementsForDocQuery;
      } else {
        queryToRun = queryMap[graphType];
      }

      const session = driver.session();
      setLoading(true);
      session
        .run(queryToRun, { document_name: inspectedName })
        .then((results) => {
          // If this doc exists in the graph, the result length will be one.
          if (results.records.length == 1) {
            //@ts-ignore
            const neo4jNodes = results.records[0]._fields[0];
            //@ts-ignore
            const neo4jRels = results.records[0]._fields[1];

            // Infer color schema dynamically
            let iterator = 0;
            const scheme: any = {};
            //@ts-ignore
            neo4jNodes.forEach((node) => {
              const label = node.labels[0];
              if (scheme[label] == undefined) {
                scheme[label] = colors[iterator % colors.length];
                iterator += 1;
              }
            });

            const newNodes = neo4jNodes.map((n:any) => {
              return {
                id: n.elementId,
                size: getSize(n),
                captionAlign: 'bottom',
                captionHtml: <b>Test</b>,
                iconAlign: 'bottom',
                icon: getIcon(n),
                caption: getNodeCaption(n),
                color: scheme[n.labels[0]],
              };
            });
            const newRels: any = neo4jRels.map(
              (r: { elementId: any; startNodeElementId: any; endNodeElementId: any; type: any }) => {
                return { id: r.elementId, from: r.startNodeElementId, to: r.endNodeElementId, caption: r.type };
              }
            );
            setNodes(newNodes);
            setRelationships(newRels);
            setLoading(false);
          } else if (results.records.length > 1) {
            //@ts-ignore
            const neo4jNodes = results.records.map((f) => f._fields[0]);
            //@ts-ignore
            const neo4jRels = results.records.map((f) => f._fields[1]);

            // Infer color schema dynamically
            let iterator = 0;
            const scheme: any = {};

            neo4jNodes.forEach((node) => {
              const labels = node.map((f: any) => f.labels);

              labels.forEach((label: any) => {
                if (scheme[label] == undefined) {
                  scheme[label] = colors[iterator % colors.length];
                  iterator += 1;
                }
              });
            });

            const newNodes = neo4jNodes.map((n) => {
              const totalNodes = n.map((g: any) => {
                return {
                  id: g.elementId,
                  size: getSize(g),
                  captionAlign: 'bottom',
                  captionHtml: <b>Test</b>,
                  iconAlign: 'bottom',
                  icon: getIcon(g),
                  caption: getNodeCaption(g),
                  color: scheme[g.labels[0]],
                };
              });
              return totalNodes;
            });
            const finalNodes = newNodes.flat();
            const newRels: any = neo4jRels.map((r: any) => {
              const totalRels = r.map((relations: any) => {
                return {
                  id: relations.elementId,
                  from: relations.startNodeElementId,
                  to: relations.endNodeElementId,
                  caption: relations.type,
                };
              });
              return totalRels;
            });
            const finalRels = newRels.flat();
            setNodes(finalNodes);
            setRelationships(finalRels);
            setLoading(false);
          } else {
            throw new Error('No records found');
          }
        })
        .catch((error: any) => {
          setLoading(false)
          setStatus('danger');
          setStatusMessage(error.message);
        });
    }
  }, [open, graphType]);

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
    maxZoom: 3,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    selectionBehaviour: 'single',
    useWebGL: false,
    instanceId: 'inspect-preview',
  };

  const headerTitle =
    viewPoint !== 'showGraphView' ? `Inspect Generated Graph from ${inspectedName}` : 'Generated Graph';

  return (
    <>
      <Dialog size='unset' open={open} aria-labelledby='form-dialog-title' disableCloseButton>
        <Dialog.Header id='form-dialog-title'>{headerTitle}</Dialog.Header>
        {viewPoint === 'showGraphView' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Radio
              name='graphRadio'
              checked={graphType === 'Knowledge Graph Entities'}
              label='Knowledge Graph Entities'
              value='Knowledge Graph Entities'
              onChange={handleRadioChange}
            />
            <Radio
              name='graphRadio'
              checked={graphType === 'Document Structure'}
              label='Document Structure'
              onChange={handleRadioChange}
              value='Document Structure'
            />
            <Radio
              name='graphRadio'
              checked={graphType === 'Document & Knowledge Graph'}
              label='Document & Knowledge Graph'
              value='Document & Knowledge Graph'
              onChange={handleRadioChange}
            />
          </div>
        )}
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <div style={{ width: '100%', height: '600px' }}>
            {loading && (
              <div className='my-40 flex items-center justify-center'>
                <LoadingSpinner size='large' />
              </div>
            )}
            {status !== 'unknown' && (
              <div className='my-40 flex items-center justify-center'>
                <Banner
                  name='graph banner'
                  closeable
                  description={statusMessage}
                  onClose={() => setStatus('unknown')}
                  type={status}
                />
              </div>
            )}
            <InteractiveNvlWrapper
              ref={nvlRef}
              nodes={nodes}
              rels={relationships}
              nvlOptions={nvlOptions}
              mouseEventCallbacks={{ ...mouseEventCallbacks }}
            />
          </div>

          <Dialog.Actions className='mt-2 mb-2'>
            <Button onClick={() => setGraphViewOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
export default GraphViewModal;
