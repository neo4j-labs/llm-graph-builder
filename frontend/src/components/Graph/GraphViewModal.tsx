import {
  Banner,
  Dialog,
  Flex,
  IconButton,
  IconButtonArray,
  LoadingSpinner,
  TextInput,
  Typography,
  useDebounce,
} from '@neo4j-ndl/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  GraphViewModalProps,
  Scheme,
  UserCredentials,
} from '../../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { Resizable } from 're-resizable';
import {
  ArrowPathIconOutline,
  DragIcon,
  FitToScreenIcon,
  MagnifyingGlassIconOutline,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { filterData, processGraphData, sortAlphabetically } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
import { LegendsChip } from './LegendsChip';
import graphQueryAPI from '../../services/GraphQuery';
import {
  graphLabels,
  intitalGraphType,
  mouseEventCallbacks,
  nvlOptions,
  queryMap,
  RESULT_STEP_SIZE,
} from '../../utils/Constants';
import CheckboxSelection from './CheckboxSelection';
import { ShowAll } from '../UI/ShowAll';

const GraphViewModal: React.FunctionComponent<GraphViewModalProps> = ({
  open,
  inspectedName,
  setGraphViewOpen,
  viewPoint,
  nodeValues,
  relationshipValues,
  selectedRows,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphType, setGraphType] = useState<GraphType[]>(intitalGraphType);
  const [allNodes, setAllNodes] = useState<ExtendedNode[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const [scheme, setScheme] = useState<Scheme>({});
  const [newScheme, setNewScheme] = useState<Scheme>({});
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  // the checkbox selection
  const handleCheckboxChange = (graph: GraphType) => {
    const currentIndex = graphType.indexOf(graph);
    const newGraphSelected = [...graphType];
    if (currentIndex === -1) {
      newGraphSelected.push(graph);
      initGraph(newGraphSelected, allNodes, allRelationships, scheme);
    } else {
      newGraphSelected.splice(currentIndex, 1);
      initGraph(newGraphSelected, allNodes, allRelationships, scheme);
    }
    setSearchQuery('');
    setGraphType(newGraphSelected);
  };

  const nodeCount = (nodes: ExtendedNode[], label: string): number => {
    return [...new Set(nodes?.filter((n) => n.labels?.includes(label)).map((i) => i.id))].length;
  };

  const relationshipCount = (relationships: ExtendedRelationship[], label: string): number => {
    return [...new Set(relationships?.filter((r) => r.caption?.includes(label)).map((i) => i.id))].length;
  };

  const graphQuery: string =
    graphType.includes('DocumentChunk') && graphType.includes('Entities')
      ? queryMap.DocChunkEntities
      : graphType.includes('DocumentChunk')
      ? queryMap.DocChunks
      : graphType.includes('Entities')
      ? queryMap.Entities
      : '';

  // fit graph to original position
  const handleZoomToFit = () => {
    nvlRef.current?.fit(
      allNodes.map((node) => node.id),
      {}
    );
  };

  // Unmounting the component
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleZoomToFit();
    }, 10);
    return () => {
      if (nvlRef.current) {
        nvlRef.current?.destroy();
      }
      setGraphType(intitalGraphType);
      clearTimeout(timeoutId);
      setScheme({});
      setNodes([]);
      setRelationships([]);
      setAllNodes([]);
      setAllRelationships([]);
      setSearchQuery('');
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const nodeRelationshipData =
        viewPoint === graphLabels.showGraphView
          ? await graphQueryAPI(
              userCredentials as UserCredentials,
              graphQuery,
              selectedRows?.map((f) => f.name)
            )
          : await graphQueryAPI(userCredentials as UserCredentials, graphQuery, [inspectedName ?? '']);
      return nodeRelationshipData;
    } catch (error: any) {
      console.log(error);
    }
  }, [viewPoint, selectedRows, graphQuery, inspectedName, userCredentials]);

  // Api call to get the nodes and relations
  const graphApi = async (mode?: string) => {
    try {
      const result = await fetchData();
      if (result && result.data.data.nodes.length > 0) {
        const neoNodes = result.data.data.nodes.map((f: Node) => f);
        const neoRels = result.data.data.relationships.map((f: Relationship) => f);
        const { finalNodes, finalRels, schemeVal } = processGraphData(neoNodes, neoRels);
        if (mode === 'refreshMode') {
          initGraph(graphType, finalNodes, finalRels, schemeVal);
        } else {
          setNodes(finalNodes);
          setRelationships(finalRels);
          setNewScheme(schemeVal);
          setLoading(false);
        }
        setAllNodes(finalNodes);
        setAllRelationships(finalRels);
        setScheme(schemeVal);
      } else {
        setLoading(false);
        setStatus('danger');
        setStatusMessage(`No Nodes and Relations for the ${inspectedName} file`);
      }
    } catch (error: any) {
      setLoading(false);
      setStatus('danger');
      setStatusMessage(error.message);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      if (viewPoint !== 'chatInfoView') {
        graphApi();
      } else {
        const { finalNodes, finalRels, schemeVal } = processGraphData(nodeValues ?? [], relationshipValues ?? []);
        setAllNodes(finalNodes);
        setAllRelationships(finalRels);
        setScheme(schemeVal);
        setNodes(finalNodes);
        setRelationships(finalRels);
        setNewScheme(schemeVal);
        setLoading(false);
      }
    }
  }, [open]);

  // The search and update nodes
  const handleSearch = useCallback(
    (value: string) => {
      const query = value.toLowerCase();
      const updatedNodes = nodes.map((node) => {
        if (query === '') {
          return {
            ...node,
            activated: false,
            selected: false,
            size: graphLabels.nodeSize,
          };
        }
        const { id, properties, caption } = node;
        const propertiesMatch = properties?.id?.toLowerCase().includes(query);
        const match = id.toLowerCase().includes(query) || propertiesMatch || caption?.toLowerCase().includes(query);
        return {
          ...node,
          activated: match,
          selected: match,
          size:
            match && viewPoint === graphLabels.showGraphView
              ? 100
              : match && viewPoint !== graphLabels.showGraphView
              ? 50
              : graphLabels.nodeSize,
        };
      });
      // deactivating any active relationships
      const updatedRelationships = relationships.map((rel) => {
        return {
          ...rel,
          activated: false,
          selected: false,
        };
      });
      setNodes(updatedNodes);
      setRelationships(updatedRelationships);
    },
    [nodes]
  );

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery]);

  const initGraph = (
    graphType: GraphType[],
    finalNodes: ExtendedNode[],
    finalRels: Relationship[],
    schemeVal: Scheme
  ) => {
    if (allNodes.length > 0 && allRelationships.length > 0) {
      const { filteredNodes, filteredRelations, filteredScheme } = filterData(
        graphType,
        finalNodes ?? [],
        finalRels ?? [],
        schemeVal
      );
      setNodes(filteredNodes);
      setRelationships(filteredRelations);
      setNewScheme(filteredScheme);
    }
  };

  // Unmounting the component
  if (!open) {
    return <></>;
  }

  const headerTitle =
    viewPoint === graphLabels.showGraphView || viewPoint === graphLabels.chatInfoView
      ? graphLabels.generateGraph
      : `${graphLabels.inspectGeneratedGraphFrom} ${inspectedName}`;

  const checkBoxView = viewPoint !== graphLabels.chatInfoView;

  const nvlCallbacks = {
    onLayoutComputing(isComputing: boolean) {
      if (!isComputing) {
        handleZoomToFit();
      }
    },
  };

  // To handle the current zoom in function of graph
  const handleZoomIn = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
  };

  // To handle the current zoom out function of graph
  const handleZoomOut = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
  };

  // Refresh the graph with nodes and relations if file is processing
  const handleRefresh = () => {
    graphApi('refreshMode');
    setGraphType(graphType);
    setNodes(nodes);
    setRelationships(relationships);
    setScheme(newScheme);
  };

  // when modal closes reset all states to default
  const onClose = () => {
    setStatus('unknown');
    setStatusMessage('');
    setGraphViewOpen(false);
    setScheme({});
    setGraphType(intitalGraphType);
    setNodes([]);
    setRelationships([]);
    setAllNodes([]);
    setAllRelationships([]);
    setSearchQuery('');
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

  // To get the relationship count
  const groupedAndSortedRelationships: ExtendedRelationship[] = Object.values(
    relationshipsSorted.reduce((acc: { [key: string]: ExtendedRelationship }, relType: Relationship) => {
      const key = relType.caption || '';
      if (!acc[key]) {
        acc[key] = { ...relType, count: 0 };
      }

      acc[key]!.count += relationshipCount(relationships as ExtendedRelationship[], key);
      return acc;
    }, {})
  );

  // On Node Click, highlighting the nodes and deactivating any active relationships
  const handleNodeClick = (nodeLabel: string) => {
    const updatedNodes = nodes.map((node) => {
      const isActive = node.labels.includes(nodeLabel);
      return {
        ...node,
        activated: isActive,
        selected: isActive,
        size:
          isActive && viewPoint === graphLabels.showGraphView
            ? 100
            : isActive && viewPoint !== graphLabels.showGraphView
            ? 50
            : graphLabels.nodeSize,
      };
    });
    // deactivating any active relationships
    const updatedRelationships = relationships.map((rel) => {
      return {
        ...rel,
        activated: false,
        selected: false,
      };
    });
    if (searchQuery !== '') {
      setSearchQuery('');
    }
    setNodes(updatedNodes);
    setRelationships(updatedRelationships);
  };
  // On Relationship Legend Click, highlight the relationships and deactivating any active nodes
  const handleRelationshipClick = (nodeLabel: string) => {
    const updatedRelations = relationships.map((rel) => {
      return {
        ...rel,
        activated: rel?.caption?.includes(nodeLabel),
        selected: rel?.caption?.includes(nodeLabel),
      };
    });
    // // deactivating any active nodes
    const updatedNodes = nodes.map((node) => {
      return {
        ...node,
        activated: false,
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
          <Flex className='w-full' alignItems='center' flexDirection='row'>
            {checkBoxView && (
              <CheckboxSelection graphType={graphType} loading={loading} handleChange={handleCheckboxChange} />
            )}
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
            ) : nodes.length === 0 && relationships.length === 0 && graphType.length !== 0 ? (
              <div className='my-40 flex items-center justify-center'>
                <Banner name='graph banner' description={graphLabels.noEntities} type='danger' />
              </div>
            ) : graphType.length === 0 ? (
              <div className='my-40 flex items-center justify-center'>
                <Banner name='graph banner' description={graphLabels.selectCheckbox} type='danger' />
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
                      {viewPoint !== 'chatInfoView' && (
                        <IconButtonWithToolTip
                          label='Refresh'
                          text='Refresh graph'
                          onClick={handleRefresh}
                          placement='left'
                        >
                          <ArrowPathIconOutline />
                        </IconButtonWithToolTip>
                      )}
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
                      {nodeCheck.length > 0 && (
                        <>
                          <Flex className='py-3 pt-3 ml-2'>
                            <Typography variant='h3'>{graphLabels.resultOverview}</Typography>
                            <div className={`text-input-container`}>
                              <TextInput
                                aria-label='search nodes'
                                type='text'
                                value={searchQuery}
                                onChange={(e) => {
                                  setSearchQuery(e.target.value);
                                }}
                                placeholder='Search On Node Properties'
                                fluid={true}
                                leftIcon={
                                  <IconButton
                                    aria-label='Search Icon'
                                    clean
                                    size='small'
                                    className='-mt-0.5'
                                    type='submit'
                                  >
                                    <MagnifyingGlassIconOutline />
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
                              {nodeCheck.map((nodeLabel, index) => (
                                <LegendsChip
                                  type='node'
                                  key={index}
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
                                  scheme={{}}
                                  label={relType.caption || ''}
                                  type='relationship'
                                  count={relationshipCount(
                                    relationships as ExtendedRelationship[],
                                    relType.caption || ''
                                  )}
                                  onClick={() => handleRelationshipClick(relType.caption || '')}
                                />
                              ))}
                            </ShowAll>
                          </div>
                        </>
                      )}
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
