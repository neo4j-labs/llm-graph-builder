import { Banner, Dialog, IconButtonArray, LoadingSpinner, useDebounceValue } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicNode,
  BasicRelationship,
  EntityType,
  ExtendedNode,
  ExtendedRelationship,
  SchemaViewModalProps,
  Scheme,
  OptionType,
} from '../../types';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import {
  FitToScreenIcon,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import { userDefinedGraphSchema, generateGraphFromNodeAndRelVals } from '../../utils/Utils';
import { graphLabels, nvlOptions } from '../../utils/Constants';
import ResultOverview from './ResultOverview';
import { ResizePanelDetails } from './ResizePanel';
import GraphPropertiesPanel from './GraphPropertiesPanel';

const SchemaViz: React.FunctionComponent<SchemaViewModalProps> = ({
  open,
  setGraphViewOpen,
  nodeValues,
  relationshipValues,
  schemaLoading,
  view,
}) => {
  const nvlRef = useRef<NVL>(null);
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [newScheme, setNewScheme] = useState<Scheme>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounceValue(searchQuery, 300);
  const [selected, setSelected] = useState<{ type: EntityType; id: string } | undefined>(undefined);
  const graphQueryAbortControllerRef = useRef<AbortController>();

  const handleZoomToFit = () => {
    nvlRef.current?.fit(
      nodes.map((node) => node.id),
      {}
    );
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleZoomToFit();
    }, 10);
    return () => {
      if (nvlRef.current) {
        nvlRef.current?.destroy();
      }
      clearTimeout(timeoutId);
      setNodes([]);
      setRelationships([]);
      setSearchQuery('');
      setSelected(undefined);
    };
  }, []);

  useEffect(() => {
    if (open) {
      if (view !== 'viz') {
        setLoading(true);
        const { nodes, relationships, scheme } = userDefinedGraphSchema(
          (nodeValues as OptionType[]) ?? [],
          (relationshipValues as OptionType[]) ?? []
        );

        setNodes(nodes);
        setRelationships(relationships);
        setNewScheme(scheme);
        setLoading(false);
      } else {
        const { nodes, relationships, scheme } = generateGraphFromNodeAndRelVals(
          nodeValues as any,
          relationshipValues as any
        );

        setNodes(nodes);
        setRelationships(relationships);
        setNewScheme(scheme);
      }
    }
  }, [open]);

  useEffect(() => {
    if (debouncedQuery) {
      handleSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

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

  const headerTitle = graphLabels.generateGraph;

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

  // when modal closes reset all states to default
  const onClose = () => {
    graphQueryAbortControllerRef?.current?.abort();
    setStatus('unknown');
    setStatusMessage('');
    setGraphViewOpen(false);
    setNodes([]);
    setRelationships([]);
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
        isOpen={open}
        hasDisabledCloseButton={false}
        onClose={onClose}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header htmlAttributes={{ id: 'graph-title' }}>{headerTitle}</Dialog.Header>
        <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto border! border-palette-neutral-border-weak!'>
          <div className='bg-white relative w-full h-full max-h-full border! border-palette-neutral-border-weak!'>
            {loading || schemaLoading ? (
              <div className='my-40 flex! items-center justify-center'>
                <LoadingSpinner size='large' />
              </div>
            ) : status !== 'unknown' ? (
              <div className='my-40 flex! items-center justify-center'>
                <Banner name='graph banner' description={statusMessage} type={status} usage='inline' />
              </div>
            ) : nodes.length === 0 && relationships.length === 0 ? (
              <div className='my-40 flex! items-center justify-center'>
                <Banner name='graph banner' description={graphLabels.noNodesRels} type='danger' usage='inline' />
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
                    <IconButtonArray orientation='vertical' isFloating={true} className='absolute bottom-4 right-4'>
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
export default SchemaViz;
