import { Banner, Checkbox, Dialog, IconButtonArray, LoadingSpinner } from '@neo4j-ndl/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GraphType, GraphViewModalProps, Scheme, UserCredentials } from '../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { Resizable } from 're-resizable';

import {
  DragIcon,
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import IconButtonWithToolTip from './IconButtonToolTip';
import { processGraphData } from '../utils/Utils';
import { useCredentials } from '../context/UserCredentials';
import { LegendsChip } from './LegendsChip';
import graphQueryAPI from '../services/GraphQuery';
import { queryMap } from '../utils/Constants';
import { useFileContext } from '../context/UsersFiles';

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
  nodeValues,
  relationshipValues,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphType, setGraphType] = useState<GraphType[]>(['entities']);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const [scheme, setScheme] = useState<Scheme>({});
  const { selectedRows } = useFileContext();

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
      setGraphType(['entities']);
      clearTimeout(timeoutId);
      setScheme({});
    };
  }, []);

  const graphQuery: string =
    graphType.length === 3
      ? queryMap.DocChunkEntities
      : graphType.includes('entities') && graphType.includes('chunks')
      ? queryMap.ChunksEntities
      : graphType.includes('entities') && graphType.includes('document')
      ? queryMap.DocEntities
      : graphType.includes('document') && graphType.includes('chunks')
      ? queryMap.DocChunks
      : graphType.includes('entities') && graphType.length === 1
      ? queryMap.Entities
      : graphType.includes('chunks') && graphType.length === 1
      ? queryMap.Chunks
      : queryMap.Document;

  // API Call to fetch the queried Data
  const fetchData = useCallback(async () => {
    try {
      const nodeRelationshipData =
        viewPoint === 'showGraphView'
          ? await graphQueryAPI(
              userCredentials as UserCredentials,
              graphQuery,
              selectedRows.map((f) => JSON.parse(f).name)
            )
          : await graphQueryAPI(userCredentials as UserCredentials, graphQuery, [inspectedName ?? '']);
      return nodeRelationshipData;
    } catch (error: any) {
      console.log(error);
    }
  }, [viewPoint, selectedRows, graphQuery, inspectedName, userCredentials]);

  useEffect(() => {
    if (open) {
      setNodes([]);
      setRelationships([]);
      setLoading(true);
      if (viewPoint === 'chatInfoView') {
        console.log('nodes', nodeValues);
        const { finalNodes, finalRels, schemeVal } = processGraphData(nodeValues ?? [], relationshipValues ?? []);
        setNodes(finalNodes);
        setRelationships(finalRels);
        setScheme(schemeVal);
        setLoading(false);
      } else {
        fetchData()
          .then((result) => {
            if (result && result.data.data.nodes.length > 0) {
              const neoNodes = result.data.data.nodes.map((f: Node) => f);
              const neoRels = result.data.data.relationships.map((f: Relationship) => f);
              const { finalNodes, finalRels, schemeVal } = processGraphData(neoNodes, neoRels);
              setNodes(finalNodes);
              setRelationships(finalRels);
              setScheme(schemeVal);
              setLoading(false);
            } else {
              setLoading(false);
              setStatus('danger');
              setStatusMessage(`Unable to retrieve document graph for ${inspectedName}`);
            }
          })
          .catch((error: any) => {
            setLoading(false);
            setStatus('danger');
            setStatusMessage(error.message);
          });
      }
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
    allowDynamicMinZoom: true,
    disableWebGL: true,
    maxZoom: 3,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    useWebGL: false,
    instanceId: 'graph-preview',
    initialZoom: 0,
  };

  const headerTitle =
    viewPoint === 'showGraphView' || viewPoint === 'chatInfoView'
      ? 'Generated Graph'
      : `Inspect Generated Graph from ${inspectedName}`;

  const checkBoxView = viewPoint !== 'chatInfoView';

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

  const onClose = () => {
    setStatus('unknown');
    setStatusMessage('');
    setGraphViewOpen(false);
    setScheme({});
  };

  // Legends placement
  const legendCheck = Object.keys(scheme).sort((a, b) => {
    if (a === 'Document' || a === 'Chunk') {
      return -1;
    } else if (b === 'Document' || b === 'Chunk') {
      return 1;
    }
    return a.localeCompare(b);
  });

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
        onClose={onClose}
      >
        <Dialog.Header id='form-dialog-title'>
          {headerTitle}
          {checkBoxView && (
            <div className='flex gap-5 mt-2 justify-between'>
              <div className='flex gap-5'>
                <Checkbox
                  checked={graphType.includes('document')}
                  label='Document'
                  disabled={(graphType.includes('document') && graphType.length === 1) || loading}
                  onChange={() => handleCheckboxChange('document')}
                />
                <Checkbox
                  checked={graphType.includes('entities')}
                  label='Entities'
                  disabled={(graphType.includes('entities') && graphType.length === 1) || loading}
                  onChange={() => handleCheckboxChange('entities')}
                />
                <Checkbox
                  checked={graphType.includes('chunks')}
                  label='Chunks'
                  disabled={(graphType.includes('chunks') && graphType.length === 1) || loading}
                  onChange={() => handleCheckboxChange('chunks')}
                />
              </div>
            </div>
          )}
        </Dialog.Header>
        <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto border border-palette-neutral-border-weak'>
          <div className='bg-white relative w-full h-full max-h-full'>
            {loading ? (
              <div className='my-40 flex items-center justify-center'>
                <LoadingSpinner size='large' />
              </div>
            ) : status !== 'unknown' ? (
              <div className='my-40 flex items-center justify-center'>
                <Banner name='graph banner' description={statusMessage} type={status} />
              </div>
            ) : (
              <>
                <div className='flex' style={{ height: '100%' }}>
                  <div className='bg-palette-neutral-bg-default relative' style={{ width: '100%', flex: '1' }}>
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
                      <IconButtonWithToolTip label='Zoomin' text='Zoom in' onClick={handleZoomIn} placement='left'>
                        <MagnifyingGlassPlusIconOutline />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip label='Zoom out' text='Zoom out' onClick={handleZoomOut} placement='left'>
                        <MagnifyingGlassMinusIconOutline />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip
                        label='Zoom to fit'
                        text='Zoom to fit'
                        onClick={handleZoomToFit}
                        placement='left'
                      >
                        <FitToScreenIcon />
                      </IconButtonWithToolTip>
                    </IconButtonArray>
                  </div>
                  <Resizable
                    defaultSize={{
                      width: 400,
                      height: '100%',
                    }}
                    minWidth={230}
                    maxWidth='72%'
                    enable={{
                      top: false,
                      right: false,
                      bottom: false,
                      left: true,
                      topRight: false,
                      bottomRight: false,
                      bottomLeft: false,
                      topLeft: false,
                    }}
                    handleComponent={{ left: <DragIcon className='absolute top-1/2 h-6 w-6' /> }}
                    handleClasses={{ left: 'ml-1' }}
                  >
                    <div className='legend_div'>
                      <h4 className='py-4 pt-3 ml-2'>Result Overview</h4>
                      <div className='flex gap-2 flex-wrap ml-2'>
                        {legendCheck.map((key, index) => (
                          <LegendsChip key={index} title={key} scheme={scheme} nodes={nodes} />
                        ))}
                      </div>
                    </div>
                  </Resizable>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
export default GraphViewModal;
