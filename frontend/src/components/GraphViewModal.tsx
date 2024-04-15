import { Banner, Checkbox, Dialog, IconButton, IconButtonArray, LoadingSpinner, TextInput } from '@neo4j-ndl/react';
import { useEffect, useRef, useState } from 'react';
import { GraphType, GraphViewModalProps } from '../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/core';
// import { driver } from '../utils/Driver';
import type { Node, Relationship } from '@neo4j-nvl/core';
import {
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { constructDocQuery, constructQuery, getIcon, getNodeCaption, getSize } from '../utils/Utils';
import {
  colors,
  entities,
  chunks,
  document,
  docEntities,
  docChunks,
  chunksEntities,
  docChunkEntities,
} from '../utils/Constants';
import { ArrowSmallRightIconOutline } from '@neo4j-ndl/react/icons';
import { useCredentials } from '../context/UserCredentials';

type Scheme = Record<string, string>;

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphType, setGraphType] = useState<GraphType[]>(['Entities']);
  const [documentNo, setDocumentNo] = useState<string>('3');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [docLimit, setDocLimit] = useState<string>('3');
  const { driver } = useCredentials();

  const handleCheckboxChange = (graph: GraphType) => {
    const currentIndex = graphType.indexOf(graph);
    const newGraphSelected = [...graphType];
    if (currentIndex === -1) {
      newGraphSelected.push(graph);
    } else {
      newGraphSelected.splice(currentIndex, 1);
    }
    setGraphType(newGraphSelected);
  };

  const queryMap: {
    Document: string;
    Chunks: string;
    Entities: string;
    DocEntities: string;
    DocChunks: string;
    ChunksEntities: string;
    DocChunkEntities: string;
  } = {
    Document: document,
    Chunks: chunks,
    Entities: entities,
    DocEntities: docEntities,
    DocChunks: docChunks,
    ChunksEntities: chunksEntities,
    DocChunkEntities: docChunkEntities,
  };
  const handleZoomToFit = () => {
    nvlRef.current?.fit(
      nodes.map((node) => node.id),
      {}
    );
  };
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleZoomToFit();
    }, 1000);
    return () => {
      nvlRef.current?.destroy();
      setGraphType(['Entities']);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setNodes([]);
      setRelationships([]);
      let queryToRun = '';
      const newCheck: string =
        graphType.length === 3
          ? queryMap.DocChunkEntities
          : graphType.includes('Entities') && graphType.includes('Chunks')
            ? queryMap.ChunksEntities
            : graphType.includes('Entities') && graphType.includes('Document')
              ? queryMap.DocEntities
              : graphType.includes('Document') && graphType.includes('Chunks')
                ? queryMap.DocChunks
                : graphType.includes('Entities') && graphType.length === 1
                  ? queryMap.Entities
                  : graphType.includes('Chunks') && graphType.length === 1
                    ? queryMap.Chunks
                    : queryMap.Document;
      if (viewPoint === 'showGraphView') {
        queryToRun = constructQuery(newCheck, documentNo);
        console.log('inside If QueryToRun', queryToRun);
      } else {
        queryToRun = constructDocQuery(newCheck, inspectedName);
        console.log('outside QueryToRun', queryToRun);
      }
      const session = driver?.session();
      setLoading(true);
      session?.run(queryToRun, { document_name: inspectedName })
        .then((results) => {
          if (results.records && results.records.length > 0) {
            // @ts-ignore
            const neo4jNodes = results.records.map((f) => f._fields[0]);
            // @ts-ignore
            const neo4jRels = results.records.map((f) => f._fields[1]);

            // Infer color schema dynamically
            let iterator = 0;
            const scheme: Scheme = {};

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
                  iconAlign: 'bottom',
                  captionHtml: <b>Test</b>,
                  caption: getNodeCaption(g),
                  color: scheme[g.labels[0]],
                  icon: getIcon(g),
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
            console.log('nodes', nodes);
            console.log('relations', relationships);
          } else {
            setLoading(false);
            setStatus('danger');
            setStatusMessage('Unable to retrieve document graph for ' + inspectedName);
          }
        })
        .catch((error: any) => {
          setLoading(false);
          setStatus('danger');
          setStatusMessage(error.message);
        });
    }
  }, [open, graphType, documentNo]);

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
    allowDynamicMinZoom: true,
    disableWebGL: true,
    maxZoom: 3,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    selectionBehaviour: 'single',
    useWebGL: false,
    instanceId: 'graph-preview',
    initialZoom: 0,
  };

  const headerTitle =
    viewPoint !== 'showGraphView' ? `Inspect Generated Graph from ${inspectedName}` : 'Generated Graph';

  const nvlCallbacks = {
    onLayoutComputing(isComputing: boolean) {
      if (!isComputing) {
        handleZoomToFit();
      }
    },
  };

  const handleZoomIn = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
  };

  const handleZoomOut = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
  };
  return (
    <>
      <Dialog
        modalProps={{
          className: 'h-[90%]',
          id: 'default-menu',
        }}
        size='unset'
        open={open}
        aria-labelledby='form-dialog-title'
        disableCloseButton={false}
        onClose={() => setGraphViewOpen(false)}
      >
        <Dialog.Header id='form-dialog-title'>
          {headerTitle}
          <div className='flex gap-5 mt-2 justify-between'>
            <div className='flex gap-5'>
              <Checkbox
                checked={graphType.includes('Document')}
                label='Document'
                disabled={graphType.includes('Document') && graphType.length === 1}
                onChange={() => handleCheckboxChange('Document')}
              />
              <Checkbox
                checked={graphType.includes('Entities')}
                label='Entities'
                disabled={graphType.includes('Entities') && graphType.length === 1}
                onChange={() => handleCheckboxChange('Entities')}
              />
              <Checkbox
                checked={graphType.includes('Chunks')}
                label='Chunks'
                disabled={graphType.includes('Chunks') && graphType.length === 1}
                onChange={() => handleCheckboxChange('Chunks')}
              />
            </div>
            {viewPoint === 'showGraphView' && (
              <div className='flex gap-2'>
                <TextInput
                  helpText='Documents Limit'
                  required
                  type='number'
                  aria-label='Document Limit'
                  onChange={(e) => setDocLimit(e.target.value)}
                  value={docLimit}
                ></TextInput>
                <IconButton aria-label='refresh-btn' onClick={() => setDocumentNo(docLimit)}>
                  <ArrowSmallRightIconOutline className='n-size-token-7' />
                </IconButton>
              </div>
            )}
          </div>
        </Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4 w-full h-full'>
          <div className='bg-palette-neutral-bg-default relative h-full w-full overflow-hidden'>
            {loading ? (
              <div className='my-40 flex items-center justify-center'>
                <LoadingSpinner size='large' />
              </div>
            ) : status !== 'unknown' ? (
              <div className='my-40 flex items-center justify-center'>
                <Banner
                  name='graph banner'
                  closeable
                  description={statusMessage}
                  onClose={() => setStatus('unknown')}
                  type={status}
                />
              </div>
            ) : (
              <>
                <InteractiveNvlWrapper
                  nodes={nodes}
                  rels={relationships}
                  nvlOptions={nvlOptions}
                  ref={nvlRef}
                  mouseEventCallbacks={{ ...mouseEventCallbacks }}
                  interactionOptions={{
                    selectOnClick: true,
                  }}
                  nvlCallbacks={nvlCallbacks}
                />
                <IconButtonArray orientation='vertical' floating className='absolute bottom-4 right-4'>
                  <ButtonWithToolTip text='Zoom in' onClick={handleZoomIn}>
                    <MagnifyingGlassPlusIconOutline />
                  </ButtonWithToolTip>
                  <ButtonWithToolTip text='Zoom out' onClick={handleZoomOut}>
                    <MagnifyingGlassMinusIconOutline />
                  </ButtonWithToolTip>
                  <ButtonWithToolTip text='Zoom to fit' onClick={handleZoomToFit}>
                    <FitToScreenIcon />
                  </ButtonWithToolTip>
                </IconButtonArray>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
export default GraphViewModal;
