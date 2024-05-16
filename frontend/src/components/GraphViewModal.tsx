import { Banner, Checkbox, Dialog, IconButton, IconButtonArray, LoadingSpinner, TextInput } from '@neo4j-ndl/react';
import { useEffect, useRef, useState } from 'react';
import { GraphType, GraphViewModalProps, Scheme, UserCredentials } from '../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';

import {
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { getIcon, getNodeCaption, getSize } from '../utils/Utils';
import { ArrowSmallRightIconOutline } from '@neo4j-ndl/react/icons';
import { useCredentials } from '../context/UserCredentials';
import { LegendsChip } from './LegendsChip';
import { calcWordColor } from '@neo4j-devtools/word-color';
import graphQueryAPI from '../services/GraphQuery';
import { queryMap } from '../utils/Constants';

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphType, setGraphType] = useState<GraphType[]>(['entities']);
  const [documentNo, setDocumentNo] = useState<string>('3');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [docLimit, setDocLimit] = useState<string>('3');
  const { userCredentials } = useCredentials();
  const [scheme, setScheme] = useState<Scheme>({});

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
  const fetchData = async () => {
    try {
      const nodeRelationshipData =
        viewPoint === 'showGraphView'
          ? await graphQueryAPI(userCredentials as UserCredentials, graphQuery, '', docLimit)
          : await graphQueryAPI(userCredentials as UserCredentials, graphQuery, inspectedName, '0');
      return nodeRelationshipData;
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    setDocLimit(docLimit === '' ? '3' : docLimit);
    if (open) {
      setNodes([]);
      setRelationships([]);
      setLoading(true);
      fetchData()
        .then((result) => {
          if (result && result.data.data.nodes.length > 0) {
            const neoNodes = result.data.data.nodes.map((f: Node) => f);
            const neoRels = result.data.data.relationships.map((f: Relationship) => f);
            // Infer color schema dynamically
            let iterator = 0;
            const schemeVal: Scheme = {};
            let labels: string[] = [];
            labels = neoNodes.map((f: any) => f.labels);
            labels.forEach((label: any) => {
              if (schemeVal[label] == undefined) {
                schemeVal[label] = calcWordColor(label[0]);
                iterator += 1;
              }
            });

            const newNodes: Node[] = neoNodes.map((g: any) => {
              return {
                id: g.element_id,
                size: getSize(g),
                captionAlign: 'bottom',
                iconAlign: 'bottom',
                captionHtml: <b>Test</b>,
                caption: getNodeCaption(g),
                color: schemeVal[g.labels[0]],
                icon: getIcon(g),
                labels: g.labels,
              };
            });
            const finalNodes = newNodes.flat();
            const newRels: Relationship[] = neoRels.map((relations: any) => {
              return {
                id: relations.element_id,
                from: relations.start_node_element_id,
                to: relations.end_node_element_id,
                caption: relations.type,
              };
            });
            const finalRels = newRels.flat();
            setNodes(finalNodes);
            setRelationships(finalRels);
            setScheme(schemeVal);
            setLoading(false);
            console.log('nodes', nodes);
            console.log('relations', relationships);
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

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   const validateInput = value === '' || Number(value) < 1 ? '3' : value;
  //   setDocLimit(validateInput);
  // }
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
            {viewPoint === 'showGraphView' && (
              <div className='flex gap-2'>
                <TextInput
                  helpText='Documents Limit'
                  required
                  type='number'
                  aria-label='Document Limit'
                  onChange={(e) =>
                    setDocLimit(e.target.value === '' || Number(e.target.value) < 1 ? '3' : e.target.value)
                  }
                  value={docLimit}
                  min={1}
                ></TextInput>
                <IconButton disabled={docLimit === ''} aria-label='refresh-btn' onClick={() => setDocumentNo(docLimit)}>
                  <ArrowSmallRightIconOutline className='n-size-token-7' />
                </IconButton>
              </div>
            )}
          </div>
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
                      <ButtonWithToolTip text='Zoom in' onClick={handleZoomIn} placement='left'>
                        <MagnifyingGlassPlusIconOutline />
                      </ButtonWithToolTip>
                      <ButtonWithToolTip text='Zoom out' onClick={handleZoomOut} placement='left'>
                        <MagnifyingGlassMinusIconOutline />
                      </ButtonWithToolTip>
                      <ButtonWithToolTip text='Zoom to fit' onClick={handleZoomToFit} placement='left'>
                        <FitToScreenIcon />
                      </ButtonWithToolTip>
                    </IconButtonArray>
                  </div>
                  <div className='legend_div'>
                    <h4 className='py-4 pt-3'>Result Overview</h4>
                    <div className='flex gap-2 flex-wrap'>
                      {legendCheck.map((key, index) => (
                        <LegendsChip key={index} title={key} scheme={scheme} nodes={nodes} />
                      ))}
                    </div>
                  </div>
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
