import { Banner, Dialog, Flex, IconButtonArray, LoadingSpinner, useDebounceValue } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicNode,
  BasicRelationship,
  EntityType,
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  GraphViewModalProps,
  OptionType,
  Scheme,
} from '../../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import {
  ArrowPathIconOutline,
  FitToScreenIcon,
  InformationCircleIconOutline,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
  ExploreIcon,
} from '@neo4j-ndl/react/icons';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import { filterData, getCheckboxConditions, graphTypeFromNodes, processGraphData } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';

import { getGraphSchema, graphQueryAPI } from '../../services/GraphQuery';
import { graphLabels, nvlOptions, queryMap } from '../../utils/Constants';
import CheckboxSelection from './CheckboxSelection';

import ResultOverview from './ResultOverview';
import { ResizePanelDetails } from './ResizePanel';
import GraphPropertiesPanel from './GraphPropertiesPanel';
import SchemaViz from '../Graph/SchemaViz';
import { extractGraphSchemaFromRawData } from '../../utils/Utils';

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
  const [node, setNode] = useState<ExtendedNode[]>([]);
  const [relationship, setRelationship] = useState<ExtendedRelationship[]>([]);
  const [allNodes, setAllNodes] = useState<ExtendedNode[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const [scheme, setScheme] = useState<Scheme>({});
  const [newScheme, setNewScheme] = useState<Scheme>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounceValue(searchQuery, 300);
  const [graphType, setGraphType] = useState<GraphType[]>([]);
  const [disableRefresh, setDisableRefresh] = useState<boolean>(false);
  const [selected, setSelected] = useState<{ type: EntityType; id: string } | undefined>(undefined);
  const [mode, setMode] = useState<boolean>(false);
  const graphQueryAbortControllerRef = useRef<AbortController>();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [schemaNodes, setSchemaNodes] = useState<OptionType[]>([]);
  const [schemaRels, setSchemaRels] = useState<OptionType[]>([]);
  const [viewCheck, setViewcheck] = useState<string>('enhancement');
  const [showLargeDatasetWarning, setShowLargeDatasetWarning] = useState<boolean>(false);

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
      setNode([]);
      setRelationship([]);
      setAllNodes([]);
      setAllRelationships([]);
      setSearchQuery('');
      setSelected(undefined);
    };
  }, []);

  useEffect(() => {
    let updateGraphType;
    if (mode) {
      updateGraphType = graphTypeFromNodes(node);
    } else {
      updateGraphType = graphTypeFromNodes(allNodes);
    }
    if (Array.isArray(updateGraphType)) {
      setGraphType(updateGraphType);
    }
  }, [allNodes]);

  const fetchData = useCallback(async () => {
    graphQueryAbortControllerRef.current = new AbortController();
    try {
      let nodeRelationshipData;
      if (viewPoint === graphLabels.showGraphView) {
        nodeRelationshipData = await graphQueryAPI(
          graphQuery,
          selectedRows?.map((f) => f.name),
          graphQueryAbortControllerRef.current.signal
        );
      } else if (viewPoint === graphLabels.showSchemaView) {
        nodeRelationshipData = await getGraphSchema();
      } else {
        nodeRelationshipData = await graphQueryAPI(
          graphQuery,
          [inspectedName ?? ''],
          graphQueryAbortControllerRef.current.signal
        );
      }
      return nodeRelationshipData;
    } catch (error: any) {
      console.error('Error fetching graph data:', error);
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Request timed out. The dataset might be too large to preview. Try selecting fewer documents.');
      }
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled.');
      }
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch graph data. Please try again.');
    }
  }, [viewPoint, selectedRows, graphQuery, inspectedName, userCredentials]);

  // Api call to get the nodes and relations
  const graphApi = async (mode?: string) => {
    try {
      const result = await fetchData();

      // Validate the response structure
      if (!result) {
        throw new Error('No response received from server. The request may have timed out.');
      }

      if (!result.data) {
        throw new Error('Invalid response format received from server.');
      }

      if (!result.data.data) {
        throw new Error(`No data in response. ${result.data.error || 'Please try again.'}`);
      }

      const { nodes = [], relationships = [] } = result.data.data;

      if (nodes.length === 0) {
        setLoading(false);
        setStatus('danger');
        const documentCount = viewPoint === graphLabels.showGraphView ? selectedRows?.length || 0 : 1;
        setStatusMessage(
          documentCount > 1
            ? `No graph data found for the selected ${documentCount} documents. This may be because the documents are still processing or contain no extractable entities.`
            : `No graph data found for ${inspectedName}. The document may still be processing or contain no extractable entities.`
        );
        return;
      }

      const neoNodes = nodes;
      const nodeIds = new Set(neoNodes.map((node: any) => node.element_id));
      const neoRels = relationships
        .map((f: Relationship) => f)
        .filter((rel: any) => nodeIds.has(rel.end_node_element_id) && nodeIds.has(rel.start_node_element_id));
      const { finalNodes, finalRels, schemeVal } = processGraphData(neoNodes, neoRels);

      if (mode === 'refreshMode') {
        initGraph(graphType, finalNodes, finalRels, schemeVal);
      } else {
        setNode(finalNodes);
        setRelationship(finalRels);
        setNewScheme(schemeVal);
        setLoading(false);
      }
      setAllNodes(finalNodes);
      setAllRelationships(finalRels);
      setScheme(schemeVal);
      setDisableRefresh(false);
      setShowLargeDatasetWarning(false);
    } catch (error: any) {
      console.error('Graph API error:', error);
      setLoading(false);
      setStatus('danger');
      setStatusMessage(error.message || 'An unexpected error occurred while loading the graph.');
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      setGraphType([]);
      if (viewPoint === graphLabels.showGraphView && selectedRows && selectedRows.length > 8) {
        setShowLargeDatasetWarning(true);
      }
      if (viewPoint !== graphLabels.chatInfoView) {
        graphApi();
      } else {
        const { finalNodes, finalRels, schemeVal } = processGraphData(nodeValues ?? [], relationshipValues ?? []);
        setAllNodes(finalNodes);
        setAllRelationships(finalRels);
        setScheme(schemeVal);
        setNode(finalNodes);
        setRelationship(finalRels);
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

  const mouseEventCallbacks = useMemo(
    () => ({
      onNodeClick: (clickedNode: Node) => {
        if (selected?.id !== clickedNode.id || selected?.type !== 'node') {
          setSelected({ type: 'node', id: clickedNode.id });
        }
      },
      onRelationshipClick: (clickedRelationship: Relationship) => {
        if (selected?.id !== clickedRelationship.id || selected?.type !== 'relationship') {
          setSelected({ type: 'relationship', id: clickedRelationship.id });
        }
      },
      onCanvasClick: () => {
        if (selected !== undefined) {
          setSelected(undefined);
        }
      },
      onPan: true,
      onZoom: true,
      onDrag: true,
    }),
    [selected]
  );

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
      setNode(filteredNodes);
      setRelationship(filteredRelations);
      setNewScheme(filteredScheme);
    }
  };

  const selectedItem = useMemo(() => {
    if (selected === undefined) {
      return undefined;
    }
    if (selected.type === 'node') {
      return node.find((nodeVal) => nodeVal.id === selected.id);
    }
    return relationship.find((relationshipVal) => relationshipVal.id === selected.id);
  }, [selected, relationship, node]);

  const handleSearch = useCallback(
    (value: string) => {
      const query = value.toLowerCase();
      const updatedNodes = node.map((nodeVal) => {
        if (query === '') {
          return {
            ...nodeVal,
            selected: false,
            size: graphLabels.nodeSize,
          };
        }
        const { id, properties, caption } = nodeVal;
        const propertiesMatch = properties?.id?.toLowerCase().includes(query);
        const match = id.toLowerCase().includes(query) || propertiesMatch || caption?.toLowerCase().includes(query);
        return {
          ...nodeVal,
          selected: match,
        };
      });
      const updatedRelationships = relationship.map((rel) => {
        return {
          ...rel,
          selected: false,
        };
      });
      setNode(updatedNodes);
      setRelationship(updatedRelationships);
    },
    [node, relationship]
  );

  if (!open) {
    return <></>;
  }

  const headerTitle =
    viewPoint === graphLabels.showGraphView || viewPoint === graphLabels.chatInfoView
      ? graphLabels.generateGraph
      : viewPoint === graphLabels.showSchemaView
        ? graphLabels.renderSchemaGraph
        : `${graphLabels.inspectGeneratedGraphFrom} ${inspectedName}`;

  const checkBoxView = viewPoint !== graphLabels.chatInfoView;

  const handleCheckboxChange = (graph: GraphType) => {
    const currentIndex = graphType.indexOf(graph);
    const newGraphSelected = [...graphType];
    if (currentIndex === -1) {
      newGraphSelected.push(graph);
    } else {
      newGraphSelected.splice(currentIndex, 1);
    }
    initGraph(newGraphSelected, allNodes, allRelationships, scheme);
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
    setMode(true);
    graphApi('refreshMode');
  };

  // when modal closes reset all states to default
  const onClose = () => {
    graphQueryAbortControllerRef?.current?.abort();
    setStatus('unknown');
    setStatusMessage('');
    setGraphViewOpen(false);
    setScheme({});
    setGraphType([]);
    setNode([]);
    setRelationship([]);
    setAllNodes([]);
    setAllRelationships([]);
    setSearchQuery('');
    setSelected(undefined);
  };

  const handleSchemaView = async (rawNodes: any[], rawRelationships: any[]) => {
    const { nodes, relationships } = extractGraphSchemaFromRawData(rawNodes, rawRelationships);
    setSchemaNodes(nodes as any);
    setSchemaRels(relationships as any);
    setViewcheck('viz');
    setOpenGraphView(true);
  };

  return (
    <>
      <Dialog
        modalProps={{
          className: 'h-[90%]',
          id: 'default-menu',
        }}
        size='unset'
        isOpen={open}
        hasDisabledCloseButton={false}
        onClose={onClose}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header htmlAttributes={{ id: 'graph-title' }}>
          {headerTitle}
          {viewPoint !== graphLabels.chatInfoView && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>
                <InformationCircleIconOutline className='n-size-token-6' />
              </span>
              <span className='n-body-small ml-1'>{graphLabels.chunksInfo}</span>
            </div>
          )}
          <Flex className='w-full' alignItems='center' flexDirection='row' justifyContent='space-between'>
            {checkBoxView && (
              <CheckboxSelection
                graphType={graphType}
                loading={loading}
                handleChange={handleCheckboxChange}
                {...getCheckboxConditions(allNodes)}
              />
            )}
            {/* <SchemaDropdown isDisabled={!selectedNodes.length || !selectedRels.length} onSchemaSelect={handleSchemaSelect} /> */}
          </Flex>
        </Dialog.Header>
        <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto border! border-palette-neutral-border-weak!'>
          {showLargeDatasetWarning && selectedRows && (
            <Banner
              name='large-dataset-warning'
              description={`You are previewing ${selectedRows.length} documents. Loading may take longer and could timeout with large datasets. For better performance, try selecting fewer documents (4-8 recommended).`}
              type='warning'
              usage='inline'
            />
          )}
          <div className='bg-white relative w-full h-full max-h-full border! border-palette-neutral-border-weak!'>
            {loading ? (
              <div className='my-40 flex! items-center justify-center'>
                <LoadingSpinner size='large' />
              </div>
            ) : status !== 'unknown' ? (
              <div className='my-40 flex! items-center justify-center'>
                <Banner name='graph banner' description={statusMessage} type={status} usage='inline' />
              </div>
            ) : node.length === 0 && relationship.length === 0 && graphType.length !== 0 ? (
              <div className='my-40 flex! items-center justify-center'>
                <Banner name='graph banner' description={graphLabels.noNodesRels} type='danger' usage='inline' />
              </div>
            ) : graphType.length === 0 && checkBoxView ? (
              <div className='my-40 flex! items-center justify-center'>
                <Banner name='graph banner' description={graphLabels.selectCheckbox} type='danger' usage='inline' />
              </div>
            ) : (
              <>
                <div className='flex' style={{ height: '100%' }}>
                  <div className='bg-palette-neutral-bg-default relative' style={{ width: '100%', flex: '1' }}>
                    <InteractiveNvlWrapper
                      nodes={node}
                      rels={relationship}
                      nvlOptions={nvlOptions}
                      ref={nvlRef}
                      mouseEventCallbacks={{ ...mouseEventCallbacks }}
                      interactionOptions={{
                        selectOnClick: true,
                      }}
                      nvlCallbacks={nvlCallbacks}
                    />
                    <IconButtonArray orientation='vertical' isFloating={true} className='absolute top-4 right-4'>
                      <IconButtonWithToolTip
                        label='Schema View'
                        text='Schema View'
                        onClick={() => handleSchemaView(node, relationship)}
                        placement='left'
                      >
                        <ExploreIcon className='n-size-token-7' />
                      </IconButtonWithToolTip>
                    </IconButtonArray>
                    <IconButtonArray orientation='vertical' isFloating={true} className='absolute bottom-4 right-4'>
                      {viewPoint !== 'chatInfoView' && (
                        <IconButtonWithToolTip
                          label='Refresh'
                          text='Refresh graph'
                          onClick={handleRefresh}
                          placement='left'
                          disabled={disableRefresh}
                        >
                          <ArrowPathIconOutline className='n-size-token-7' />
                        </IconButtonWithToolTip>
                      )}
                      <IconButtonWithToolTip label='Zoomin' text='Zoom in' onClick={handleZoomIn} placement='left'>
                        <MagnifyingGlassPlusIconOutline className='n-size-token-7' />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip label='Zoom out' text='Zoom out' onClick={handleZoomOut} placement='left'>
                        <MagnifyingGlassMinusIconOutline className='n-size-token-7' />
                      </IconButtonWithToolTip>
                      <IconButtonWithToolTip
                        label='Zoom to fit'
                        text='Zoom to fit'
                        onClick={handleZoomToFit}
                        placement='left'
                      >
                        <FitToScreenIcon className='n-size-token-7' />
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
                        nodes={node}
                        relationships={relationship}
                        newScheme={newScheme}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        setNodes={setNode}
                        setRelationships={setRelationship}
                      />
                    )}
                  </ResizePanelDetails>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog>
      {openGraphView && (
        <SchemaViz
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={schemaNodes}
          relationshipValues={schemaRels}
          view={viewCheck}
        />
      )}
    </>
  );
};
export default GraphViewModal;
