import { Banner, Dialog, Flex, IconButtonArray, LoadingSpinner } from '@neo4j-ndl/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GraphType, GraphViewModalProps, OptionType, Scheme, UserCredentials } from '../../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { Resizable } from 're-resizable';
import {
  ArrowPathIconOutline,
  DragIcon,
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { filterData, processGraphData } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
import { LegendsChip } from './LegendsChip';
import graphQueryAPI from '../../services/GraphQuery';
import {
  entityGraph,
  graphView,
  intitalGraphType,
  knowledgeGraph,
  lexicalGraph,
  mouseEventCallbacks,
  nvlOptions,
  queryMap,
} from '../../utils/Constants';
import { useFileContext } from '../../context/UsersFiles';
// import CheckboxSelection from './CheckboxSelection';
import DropdownComponent from '../Dropdown';
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
  const [graphType, setGraphType] = useState<GraphType[]>(intitalGraphType);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const [scheme, setScheme] = useState<Scheme>({});
  const { selectedRows } = useFileContext();
  const [newScheme, setNewScheme] = useState<Scheme>({});

  // const handleCheckboxChange = (graph: GraphType) => {
  //   const currentIndex = graphType.indexOf(graph);
  //   const newGraphSelected = [...graphType];
  //   if (currentIndex === -1) {
  //     newGraphSelected.push(graph);
  //   } else {
  //     newGraphSelected.splice(currentIndex, 1);
  //   }
  //   setGraphType(newGraphSelected);
  // };
  const handleZoomToFit = () => {
    nvlRef.current?.fit(
      allNodes.map((node) => node.id),
      {}
    );
  };
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleZoomToFit();
    }, 10);
    return () => {
      nvlRef.current?.destroy();
      setGraphType(intitalGraphType);
      clearTimeout(timeoutId);
      setScheme({});
      setNodes([]);
      setRelationships([]);
      setAllNodes([]);
      setAllRelationships([]);
    };
  }, []);
  const graphQuery: string = queryMap.DocChunkEntities;
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
      setLoading(true);
      if (viewPoint === 'chatInfoView') {
        const { finalNodes, finalRels, schemeVal } = processGraphData(nodeValues ?? [], relationshipValues ?? []);
        setAllNodes(finalNodes);
        setAllRelationships(finalRels);
        setScheme(schemeVal);
        setNodes(finalNodes);
        setRelationships(finalRels);
        setNewScheme(schemeVal);
        setLoading(false);
      } else {
        fetchData()
          .then((result) => {
            if (result && result.data.data.nodes.length > 0) {
              const neoNodes = result.data.data.nodes.map((f: Node) => f);
              const neoRels = result.data.data.relationships.map((f: Relationship) => f);
              const { finalNodes, finalRels, schemeVal } = processGraphData(neoNodes, neoRels);
              setAllNodes(finalNodes);
              setAllRelationships(finalRels);
              setScheme(schemeVal);
              setNodes(finalNodes);
              setRelationships(finalRels);
              setNewScheme(schemeVal);
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
  }, [open]);

  console.log('nodes', nodes);

  if (!open) {
    return <></>;
  }

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
  const handleRefresh = () => {
    // fetchData();
    console.log('hello');
  };
  const onClose = () => {
    setStatus('unknown');
    setStatusMessage('');
    setGraphViewOpen(false);
    setScheme({});
    setGraphType(intitalGraphType);
    setNodes([]);
    setRelationships([]);
  };
  const legendCheck = Object.keys(newScheme).sort((a, b) => {
    if (a === 'Document' || a === 'Chunk') {
      return -1;
    } else if (b === 'Document' || b === 'Chunk') {
      return 1;
    }
    return a.localeCompare(b);
  });

  const getDropdownDefaultValue = () => {
    if (graphType.includes('Document') && graphType.includes('Chunk') && graphType.includes('Entities')) {
      return knowledgeGraph;
    }
    if (graphType.includes('Document') && graphType.includes('Chunk')) {
      return lexicalGraph;
    }
    if (graphType.includes('Entities')) {
      return entityGraph;
    }
    return '';
  };

  const initGraph = (graphType: GraphType[], finalNodes: Node[], finalRels: Relationship[], schemeVal: Scheme) => {
    if (allNodes.length > 0 && allRelationships.length > 0) {
      const { filteredNodes, filteredRelations, filteredScheme } = filterData(graphType, finalNodes, finalRels, schemeVal);
      setNodes(filteredNodes);
      setRelationships(filteredRelations);
      setNewScheme(filteredScheme);
    }
  }

  const handleDropdownChange = (selectedOption: OptionType | null | void) => {
    if (selectedOption?.value) {
      const selectedValue = selectedOption.value;
      let newGraphType: GraphType[] = [];
      if (selectedValue === knowledgeGraph) {
        newGraphType = intitalGraphType;
      } else if (selectedValue === lexicalGraph) {
        newGraphType = ['Document', 'Chunk'];
      } else if (selectedValue === entityGraph) {
        newGraphType = ['Entities'];
      }
      setGraphType(newGraphType);
      initGraph(newGraphType, allNodes, allRelationships, scheme);
    }
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
        onClose={onClose}
      >
        <Dialog.Header id='graph-title'>
          {headerTitle}
          <Flex className='w-full' alignItems='center' justifyContent='flex-end' flexDirection='row'>
            {/* {checkBoxView && (
                <CheckboxSelection graphType={graphType} loading={loading} handleChange={handleCheckboxChange} />
            )} */}
            {checkBoxView && (<DropdownComponent
              onSelect={handleDropdownChange}
              options={graphView}
              placeholder='Select Graph Type'
              defaultValue={getDropdownDefaultValue()}
              view='GraphView'
            />)}
          </Flex>
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
                      <IconButtonWithToolTip
                        label='Refresh'
                        text='Refresh graph'
                        onClick={handleRefresh}
                        placement='left'
                      >
                        <ArrowPathIconOutline />
                      </IconButtonWithToolTip>
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
                          <LegendsChip key={index} title={key} scheme={newScheme} nodes={nodes} />
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
