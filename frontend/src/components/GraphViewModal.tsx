import { Banner, Checkbox, Dialog, IconButton, IconButtonArray, LoadingSpinner, TextInput } from '@neo4j-ndl/react';
import { useEffect, useRef, useState } from 'react';
import { GraphType, GraphViewModalProps } from '../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/core';
import { driver } from '../utils/Driver';
import {
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { constructDocQuery, constructQuery, getIcon, getNodeCaption, getSize } from '../utils/Utils';
import { colors, entities, knowledgeGraph, document } from '../utils/Constants';
import { ArrowSmallRightIconOutline } from '@neo4j-ndl/react/icons';

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [relationships, setRelationships] = useState([]);
  const [fileNodes, setfileNodes] = useState<any[]>([]);
  const [filerelationships, setFileRelationships] = useState<any[]>([]);
  const [graphType, setGraphType] = useState<GraphType[]>(['Entities']);
  const [documentNo, setDocumentNo] = useState<string>('5');
  const [individualGraphType, setIndividualGraphType] = useState<GraphType[]>(['Entities']);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [docLimit, setDocLimit] = useState<string>('5');

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

  const HandleIndividualCheckboxChange = (graph: GraphType) => {
    const currentIndex = individualGraphType.indexOf(graph);
    const newGraphSelected = [...individualGraphType];
    if (currentIndex === -1) {
      newGraphSelected.push(graph);
    } else {
      newGraphSelected.splice(currentIndex, 1);
    }
    setIndividualGraphType(newGraphSelected);
  };
  const queryMap: { Document: string, Chunks: string, Entities: string } = {
    Document: document,
    Chunks: knowledgeGraph,
    Entities: entities,
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
      //@ts-ignore
      nvlRef.current?.destroy();
      setGraphType(['Entities']);
      setIndividualGraphType(['Entities']);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setNodes([]);
      setRelationships([]);
      let queryToRun = '';
      const newQuery: string = graphType.map((option) => queryMap[option]).join(' ');
      queryToRun = constructQuery(newQuery, documentNo);
      const session = driver.session();
      setLoading(true);
      session
        .run(queryToRun, { document_name: inspectedName })
        .then((results) => {
          // If this doc exists in the graph, the result length will be one.
          if (results.records.length > 1) {
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
                  iconAlign: 'bottom',
                  captionHtml: <b>Test</b>,
                  caption: getNodeCaption(g),
                  color: scheme[g.labels[0]],
                  icon: getIcon(g)
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
          setLoading(false);
          setStatus('danger');
          setStatusMessage(error.message);
        });
    }
  }, [open, graphType, documentNo]);

  useEffect(() => {
    if (open) {
      setfileNodes([]);
      setFileRelationships([]);
      if (viewPoint === 'tableView') {
        const newQuery: any = individualGraphType.map((option) => queryMap[option]).join(' ');
        const queryToRun = constructDocQuery(newQuery);
        setLoading(true);
        const session = driver.session();
        session
          .run(queryToRun, { document_name: inspectedName })
          .then((results) => {
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
            const newNodes = neo4jNodes.map((n: any) => {
              return {
                id: n.elementId,
                size: getSize(n),
                captionAlign: 'bottom',
                captionHtml: <b>Test</b>,
                caption: getNodeCaption(n),
                iconAlign: 'bottom',
                icon: getIcon(n),
                color: scheme[n.labels[0]],
              };
            });
            const newRels: any = neo4jRels.map(
              (r: { elementId: any; startNodeElementId: any; endNodeElementId: any; type: any }) => {
                return { id: r.elementId, from: r.startNodeElementId, to: r.endNodeElementId, caption: r.type };
              }
            );
            setfileNodes(newNodes);
            setFileRelationships(newRels);
            setLoading(false);
          })
          .catch((error) => {
            setLoading(false);
            setStatus('danger');
            setStatusMessage(error.message);
          });
      }
    }
  }, [open, individualGraphType]);

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
          {viewPoint === 'showGraphView' ? (
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
              <div className='flex gap-2'>
                <TextInput
                  helpText="Documents Limit"
                  required
                  type='number'
                  onChange={(e) => setDocLimit(e.target.value)}
                  value={docLimit}
                ></TextInput>
                <IconButton onClick={() => setDocumentNo(docLimit)}>
                  <ArrowSmallRightIconOutline className='n-size-token-7' />
                </IconButton>
              </div>
            </div>
          ) : (
            <div className='flex gap-5'>
              <Checkbox
                checked={individualGraphType.includes('Document')}
                label='Document'
                disabled={individualGraphType.includes('Document') && individualGraphType.length === 1}
                onChange={() => HandleIndividualCheckboxChange('Document')}
              />
              <Checkbox
                checked={individualGraphType.includes('Entities')}
                label='Entities'
                disabled={individualGraphType.includes('Entities') && individualGraphType.length === 1}
                onChange={() => HandleIndividualCheckboxChange('Entities')}
              />
            </div>
          )}
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
                  nodes={viewPoint === 'showGraphView' ? nodes : fileNodes}
                  rels={viewPoint === 'showGraphView' ? relationships : filerelationships}
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
