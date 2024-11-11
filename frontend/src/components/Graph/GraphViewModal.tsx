import { Banner, Dialog, Flex, IconButtonArray, LoadingSpinner, useDebounce } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicNode,
  BasicRelationship,
  EntityType,
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
import {
  ArrowPathIconOutline,
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import { filterData, getCheckboxConditions, graphTypeFromNodes, processGraphData } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';

import { graphQueryAPI } from '../../services/GraphQuery';
import { graphLabels, nvlOptions, queryMap } from '../../utils/Constants';
import CheckboxSelection from './CheckboxSelection';

import ResultOverview from './ResultOverview';
import { ResizePanelDetails } from './ResizePanel';
import GraphPropertiesPanel from './GraphPropertiesPanel';

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
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>([]);
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
  const [graphType, setGraphType] = useState<GraphType[]>([]);
  const [disableRefresh, setDisableRefresh] = useState<boolean>(false);
  const [selected, setSelected] = useState<{ type: EntityType; id: string } | undefined>(undefined);

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
      setGraphType([]);
      clearTimeout(timeoutId);
      setScheme({});
      setNodes([]);
      setRelationships([]);
      setAllNodes([]);
      setAllRelationships([]);
      setSearchQuery('');
      setSelected(undefined);
    };
  }, []);

  useEffect(() => {
    const updateGraphType = graphTypeFromNodes(allNodes);
    if (Array.isArray(updateGraphType)) {
      setGraphType(updateGraphType);
    }
  }, [allNodes]);

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
        const neoNodes = result.data.data.nodes;
        const nodeIds = new Set(neoNodes.map((node: any) => node.element_id));
        const neoRels = result.data.data.relationships
          .map((f: Relationship) => f)
          .filter((rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id));
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
        setDisableRefresh(false);
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
      setGraphType([]);
      if (viewPoint !== graphLabels.chatInfoView) {
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

  useEffect(() => {
    if (debouncedQuery) {
      handleSearch(debouncedQuery);
    }
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

  const selectedItem = useMemo(() => {
    if (selected === undefined) {
      return undefined;
    }
    if (selected.type === 'node') {
      return nodes.find((node) => node.id === selected.id);
    }
    return relationships.find((relationship) => relationship.id === selected.id);
  }, [selected, relationships, nodes]);

  // The search and update nodes
  const handleSearch = useCallback(
    (value: string) => {
      const query = value.toLowerCase();
      const updatedNodes = nodes.map((node) => {
        if (query === '') {
          return {
            ...node,
            selected: false,
            size: graphLabels.nodeSize,
          };
        }
        const { id, properties, caption } = node;
        const propertiesMatch = properties?.id?.toLowerCase().includes(query);
        const match = id.toLowerCase().includes(query) || propertiesMatch || caption?.toLowerCase().includes(query);
        return {
          ...node,
          selected: match,
        };
      });
      // deactivating any active relationships
      const updatedRelationships = relationships.map((rel) => {
        return {
          ...rel,
          selected: false,
        };
      });
      setNodes(updatedNodes);
      setRelationships(updatedRelationships);
    },
    [nodes, relationships]
  );

  // Unmounting the component
  if (!open) {
    return <></>;
  }

  const headerTitle =
    viewPoint === graphLabels.showGraphView || viewPoint === graphLabels.chatInfoView
      ? graphLabels.generateGraph
      : `${graphLabels.inspectGeneratedGraphFrom} ${inspectedName}`;

  const checkBoxView = viewPoint !== graphLabels.chatInfoView;

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
    setSelected(undefined);
    if (nvlRef.current && nvlRef?.current?.getScale() > 1) {
      handleZoomToFit();
    }
  };

  // Callback
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
    setDisableRefresh(true);
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
    setGraphType([]);
    setNodes([]);
    setRelationships([]);
    setAllNodes([]);
    setAllRelationships([]);
    setSearchQuery('');
    setSelected(undefined);
  };

  const mouseEventCallbacks = {
    onNodeClick: (clickedNode: Node) => {
      setSelected({ type: 'node', id: clickedNode.id });
    },
    onRelationshipClick: (clickedRelationship: Relationship) => {
      setSelected({ type: 'relationship', id: clickedRelationship.id });
    },
    onCanvasClick: () => {
      setSelected(undefined);
    },
    onPan: true,
    onZoom: true,
    onDrag: true,
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
              <CheckboxSelection
                graphType={graphType}
                loading={loading}
                handleChange={handleCheckboxChange}
                {...getCheckboxConditions(allNodes)}
              />
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
                <Banner name='graph banner' description={graphLabels.noNodesRels} type='danger' />
              </div>
            ) : graphType.length === 0 && checkBoxView ? (
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
                          disabled={disableRefresh}
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
                  <ResizePanelDetails open={true}>
                    {selectedItem !== undefined ? (
                      <GraphPropertiesPanel
                        inspectedItem={selectedItem as BasicNode | BasicRelationship}
                        newScheme={newScheme}
                      />
                    ) : (
                      <ResultOverview
                        nodes={nodes}
                        relationships={relationships}
                        newScheme={newScheme}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        setNodes={setNodes}
                        setRelationships={setRelationships}
                      />
                    )}
                  </ResizePanelDetails>
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