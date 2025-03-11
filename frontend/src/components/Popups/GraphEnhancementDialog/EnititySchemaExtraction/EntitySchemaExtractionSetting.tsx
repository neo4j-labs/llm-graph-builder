import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, getDefaultSchemaExamples, nvlOptions, tooltips } from '../../../../utils/Constants';
import { Select, Flex, Typography, useMediaQuery, IconButtonArray, TextInput } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta, SingleValue } from 'react-select';
import { BasicNode, BasicRelationship, EntityType, ExtendedNode, ExtendedRelationship, NodeSchema, OptionType, RelationshipSchema, schema, Scheme } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { tokens } from '@neo4j-ndl/base';
import { showNormalToast } from '../../../../utils/toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { ArrowPathIconOutline, FitToScreenIcon, Hierarchy1Icon, MagnifyingGlassMinusIconOutline, MagnifyingGlassPlusIconOutline } from '@neo4j-ndl/react/icons';
import GraphViewModal from '../../../Graph/GraphViewModal';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import { IconButtonWithToolTip } from '../../../UI/IconButtonToolTip';
import { ResizePanelDetails } from '../../../Graph/ResizePanel';
import type { Node, NVL, Relationship } from '@neo4j-nvl/base';
import Legend from '../../../UI/Legend';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';
import { Button } from '@mui/material';


export default function EntitySchemaExtractionSetting({
  view,
  open,
  onClose,
  openTextSchema,
  settingView,
  onContinue,
  closeEnhanceGraphSchemaDialog,
}: {
  view: 'Dialog' | 'Tabs';
  open?: boolean;
  onClose?: () => void;
  openTextSchema: () => void;
  settingView: 'contentView' | 'headerView';
  onContinue?: () => void;
  closeEnhanceGraphSchemaDialog?: () => void;
}) {
  if (!open) {
    return <></>;
  }
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const removeNodesAndRels = (nodelabels: string[], relationshipTypes: string[]) => {
    const labelsToRemoveSet = new Set(nodelabels);
    const relationshipLabelsToremoveSet = new Set(relationshipTypes);
    setSelectedNodes((prevState) => {
      const filterednodes = prevState.filter((item) => !labelsToRemoveSet.has(item.label));
      localStorage.setItem(
        'selectedNodeLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: filterednodes })
      );
      return filterednodes;
    });
    setSelectedRels((prevState) => {
      const filteredrels = prevState.filter((item) => !relationshipLabelsToremoveSet.has(item.label));
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: filteredrels })
      );
      return filteredrels;
    });
  };
  const onChangeSchema = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'remove-value') {
      const removedSchema: schema = JSON.parse(actionMeta.removedValue.value);
      const { nodelabels, relationshipTypes } = removedSchema;
      removeNodesAndRels(nodelabels, relationshipTypes);
    } else if (actionMeta.action === 'clear') {
      const removedSchemas = actionMeta.removedValues.map((s) => JSON.parse(s.value));
      const removedNodelabels = removedSchemas.map((s) => s.nodelabels).flatMap((k) => k);
      const removedRelations = removedSchemas.map((s) => s.relationshipTypes).flatMap((k) => k);
      removeNodesAndRels(removedNodelabels, removedRelations);
    }
    setSelectedSchemas(selectedOptions);
    localStorage.setItem(
      'selectedSchemas',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedOptions })
    );
    const nodesFromSchema = selectedOptions.map((s) => JSON.parse(s.value).nodelabels).flat();
    const relationsFromSchema = selectedOptions.map((s) => JSON.parse(s.value).relationshipTypes).flat();
    let nodeOptionsFromSchema: OptionType[] = [];
    for (let index = 0; index < nodesFromSchema.length; index++) {
      const n = nodesFromSchema[index];
      nodeOptionsFromSchema.push({ label: n, value: n });
    }
    let relationshipOptionsFromSchema: OptionType[] = [];
    for (let index = 0; index < relationsFromSchema.length; index++) {
      const r = relationsFromSchema[index];
      relationshipOptionsFromSchema.push({ label: r, value: r });
    }
    setSelectedNodes((prev) => {
      const combinedData = [...prev, ...nodeOptionsFromSchema];
      const uniqueLabels = new Set();
      const updatedOptions = combinedData.filter((item) => {
        if (!uniqueLabels.has(item.label)) {
          uniqueLabels.add(item.label);
          return true;
        }
        return false;
      });
      localStorage.setItem(
        'selectedNodeLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
      );
      return updatedOptions;
    });
    setSelectedRels((prev) => {
      const combinedData = [...prev, ...relationshipOptionsFromSchema];
      const uniqueLabels = new Set();
      const updatedOptions = combinedData.filter((item) => {
        if (!uniqueLabels.has(item.label)) {
          uniqueLabels.add(item.label);
          return true;
        }
        return false;
      });
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
      );
      return updatedOptions;
    });
  };
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    }
    setSelectedNodes(selectedOptions);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
      );
    }
    setSelectedRels(selectedOptions);
    localStorage.setItem('selectedRelationshipLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);

  useEffect(() => {
    if (userCredentials) {
      if (open && view === 'Dialog') {
        const getOptions = async () => {
          setLoading(true);
          try {
            const response = await getNodeLabelsAndRelTypes();
            setLoading(false);
            if (response.data.data.length) {
              const nodelabels = response.data?.data[0]?.labels.map((l) => ({ value: l, label: l }));
              const reltypes = response.data?.data[0]?.relationshipTypes.map((t) => ({ value: t, label: t }));
              setnodeLabelOptions(nodelabels);
              setrelationshipTypeOptions(reltypes);
            }
          } catch (error) {
            setLoading(false);
            console.log(error);
          }
        };
        getOptions();
        return;
      }
      if (view == 'Tabs') {
        const getOptions = async () => {
          setLoading(true);
          try {
            const response = await getNodeLabelsAndRelTypes();
            setLoading(false);
            if (response.data.data.length) {
              const nodelabels = response.data?.data[0]?.labels.map((l) => ({ value: l, label: l }));
              const reltypes = response.data?.data[0]?.relationshipTypes.map((t) => ({ value: t, label: t }));
              setnodeLabelOptions(nodelabels);
              setrelationshipTypeOptions(reltypes);
            }
          } catch (error) {
            setLoading(false);
            console.log(error);
          }
        };
        getOptions();
      }
    }
  }, [userCredentials, open]);

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setSelectedSchemas([]);
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);
    localStorage.setItem(
      'selectedNodeLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: nodeLabelOptions })
    );
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: relationshipTypeOptions })
    );
  }, [nodeLabelOptions, relationshipTypeOptions]);

  const handleClear = () => {
    setSelectedNodes([]);
    setSelectedRels([]);
    setSelectedSchemas([]);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
    );
    localStorage.setItem('selectedSchemas', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    showNormalToast(`Successfully Removed the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
  };
  const handleApply = () => {
    showNormalToast(`Successfully Applied the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    localStorage.setItem(
      'selectedNodeLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedNodes })
    );
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedRels })
    );
    localStorage.setItem(
      'selectedSchemas',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedSchemas })
    );
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  /*************************************/
  type SelectedElement =
  | { type: 'node'; data: NodeSchema }
  | { type: 'edge'; data: RelationshipSchema }
  | null;

  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<NodeSchema> | null>(null);
  const edgesRef = useRef<DataSet<RelationshipSchema> | null>(null);
  const nextNodeIdRef = useRef<number>(0); // Starting from 6 (initial nodes have IDs 1-5).
  const nextEdgeIdRef = useRef<number>(0); // Starting from 5 (initial edges have IDs 1-4).

  // State for node inputs.
  const [newNodeLabel, setNewNodeLabel] = useState<string>('');
  const [newNodeProperties, setNewNodeProperties] = useState<string[]>([]);

  // State for edge inputs.
  const [newEdgeLabel, setNewEdgeLabel] = useState<string>('');
  const [newEdgeProperties, setNewEdgeProperties] = useState<string[]>([]);
  const newEdgeLabelRef = useRef<string>('');
  const newEdgePropertiesRef = useRef<string[]>([]);


  // State for the currently selected element.
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);

  useEffect(() => {
    // Initialize nodes DataSet.
    nodesRef.current = new DataSet<NodeSchema>([]);

    // Initialize edges DataSet.
    edgesRef.current = new DataSet<RelationshipSchema>([]);

    if (containerRef.current) {
      networkRef.current = new Network(
        containerRef.current,
        { nodes: nodesRef.current, edges: edgesRef.current },
        {
          physics: { stabilization: false },
          nodes: { 
            shape: "circle",
            widthConstraint: {maximum: 50,minimum:50},
          }, 
          manipulation: {
            enabled: false,
            addEdge: (edgeData: any, callback: any) => {
              // Assign the edge label and properties from the inputs.
              edgeData.label = newEdgeLabelRef.current;
              edgeData.proprities = newEdgePropertiesRef.current;
              edgeData.id = nextEdgeIdRef.current++;
              callback(edgeData);
              setNewEdgeLabel('');
              setNewEdgeProperties([]);
              newEdgeLabelRef.current = '';
              newEdgePropertiesRef.current = [];
            },
            initiallyActive: false,
          },
        }
      );

      // Listen for selection events.
      networkRef.current.on('select', (params: any) => {
        if (params.nodes && params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const nodeDataCandidate = nodesRef.current?.get(nodeId);
          const nodeData = Array.isArray(nodeDataCandidate)
            ? nodeDataCandidate[0]
            : nodeDataCandidate;
          if (nodeData) {
            setSelectedElement({ type: 'node', data: nodeData });
          } else {
            setSelectedElement(null);
          }
        } else if (params.edges && params.edges.length > 0) {
          const edgeId = params.edges[0];
          const edgeDataCandidate = edgesRef.current?.get(edgeId);
          const edgeData = Array.isArray(edgeDataCandidate)
            ? edgeDataCandidate[0]
            : edgeDataCandidate;
          if (edgeData) {
            setSelectedElement({ type: 'edge', data: edgeData });
          } else {
            setSelectedElement(null);
          }
        } else {
          setSelectedElement(null);
        }
      });
    }

    return () => {
      networkRef.current?.destroy();
    };
  }, []);

  // Function to add a new node using the provided label and properties.
  const addNode = () => {
    if (nodesRef.current) {
      const newId = nextNodeIdRef.current++;
      const label = newNodeLabel.trim() || `Node ${newId}`;
      nodesRef.current.add({ id: newId, label, proprities: newNodeProperties });
      setNewNodeLabel('');
      setNewNodeProperties([]);
    }
  };

  // Function to activate edge creation mode.
  const addEdge = () => {
    if (networkRef.current) {
      networkRef.current.addEdgeMode();
    }
  };

  // Handle Zoom To Fit
  const handleZoomToFit = () => {
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };

  // Handle Zoom In: if a node is selected, zoom in centered on that node.
  const handleZoomIn = () => {
    if (networkRef.current) {
      const currentScale = networkRef.current.getScale();
      if (selectedElement && selectedElement.type === 'node') {
        const positions = networkRef.current.getPositions([selectedElement.data.id]);
        const nodePosition = positions[selectedElement.data.id];
        networkRef.current.moveTo({ position: nodePosition, scale: currentScale * 1.2 });
      } else {
        networkRef.current.moveTo({ scale: currentScale * 1.2 });
      }
    }
  };

  // Handle Zoom Out (scale down by 0.8).
  const handleZoomOut = () => {
    if (networkRef.current) {
      const currentScale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: currentScale * 0.8 });
    }
  };

  // Delete selected node and its connected relationships.
  const deleteSelectedNode = () => {
    if (selectedElement && selectedElement.type === 'node' && nodesRef.current) {
      const nodeId = selectedElement.data.id;
      // Remove the node.
      nodesRef.current.remove(nodeId);
      // Remove all edges connected to that node.
      if (edgesRef.current) {
        const edgeIds = edgesRef.current.getIds({
          filter: (edge: RelationshipSchema) =>
            edge.from === nodeId || edge.to === nodeId,
        });
        edgesRef.current.remove(edgeIds);
      }
      setSelectedElement(null);
    }
  };

  // Delete selected relationship.
  const deleteSelectedEdge = () => {
    if (selectedElement && selectedElement.type === 'edge' && edgesRef.current) {
      const edgeId = selectedElement.data.id;
      edgesRef.current.remove(edgeId);
      setSelectedElement(null);
    }
  };

  const onChangenode = (selectedOption: SingleValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
    if(selectedOption)
    setNewNodeLabel(selectedOption.value.toString());
  };
  const onChangenodeProperties = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    setNewNodeProperties(selectedOptions.map(p => p.value));
  };
  const onChangeedge = (selectedOption: SingleValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
    if(selectedOption)
    {
      setNewEdgeLabel(selectedOption.value.toString());
    newEdgeLabelRef.current = selectedOption.value.toString();
    }
  };
  const onChangeedgeProperties = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    setNewEdgeProperties(selectedOptions.map(p => p.value));
    newEdgePropertiesRef.current = selectedOptions.map(p => p.value)
  };
  



  return (
    <div >
      <div className='flex h-[60vh]'>
        <div className='bg-palette-neutral-bg-default relative' style={{ width: '100%', flex: '1' }}>
        <div
            ref={containerRef}
            className="border border-gray-300"
            style={{ height: '100%', width: '100%' }}
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
          {selectedElement  ? (
            
            <div className="mt-4 border border-gray-300 p-4">
              {/* Selected element panel */}
              {selectedElement.type === 'node' ? (
                <div>
                  <h3 className="text-xl font-bold mb-2">Selected Node</h3>
                  <p>
                    <span className="font-semibold">Label:</span> {selectedElement.data.label}
                  </p>
                  <p>
                    <span className="font-semibold">Properties:</span>{' '}
                    {selectedElement.data.proprities.length > 0
                      ? selectedElement.data.proprities.join(', ')
                      : 'None'}
                  </p>
                  <ButtonWithToolTip
                    text={"Delete Node"}
                    onClick={deleteSelectedNode}
                    label='Delete Node'
                    placement='top'
                  >
                    Delete Node
                  </ButtonWithToolTip>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold mb-2">Selected Relationship</h3>
                  <p>
                    <span className="font-semibold">From:</span>
                    {nodesRef.current?.get(selectedElement.data.from) && (
                      <> {nodesRef.current.get(selectedElement.data.from)?.label}</>
                    )}
                  </p>
                  <p>
                    <span className="font-semibold">To:</span>
                    {nodesRef.current?.get(selectedElement.data.to) && (
                      <> {nodesRef.current.get(selectedElement.data.to)?.label}</>
                    )}
                  </p>
                  <p>
                    <span className="font-semibold">Label:</span> {selectedElement.data.label}
                  </p>
                  <p>
                    <span className="font-semibold">Properties:</span>{' '}
                    {selectedElement.data.proprities.length > 0
                      ? selectedElement.data.proprities.join(', ')
                      : 'None'}
                  </p>
                  <ButtonWithToolTip
                    text={"Delete Relationship"}
                    onClick={deleteSelectedEdge}
                    label='Delete Relationship'
                    placement='top'
                  >
                    Delete Relationship
                  </ButtonWithToolTip>
                </div>
              )}
            </div>
         
          ) : (
           <>
            <div className="m-4">
              <Select
                helpText='You can select one value'
                label='Node Label'
                selectProps={{
                  isClearable: true,
                  isMulti: false,
                  options: nodeLabelOptions,
                  onChange: onChangenode,
                  value: {label:newNodeLabel,value:newNodeLabel},
                }}
                type='creatable'
              />
              <Select
                helpText='You can select more than one values'
                label='Node Properties'
                selectProps={{
                  isClearable: true,
                  isMulti: true,
                  options: [],
                  onChange: onChangenodeProperties,
                  value: newNodeProperties.map(p=> { return {label:p,value:p}}),
                }}
                type='creatable'
              />
              <ButtonWithToolTip
                text={"Add Node"}
                disabled={newNodeLabel==""}
                onClick={addNode}
                label='Add Node'
                placement='top'
              >
                Add Node
              </ButtonWithToolTip>
            </div>
            <div className="m-4">
              <Select
                helpText='You can select one value'
                label='Relationship Type'
                selectProps={{
                  isClearable: true,
                  isMulti: false,
                  options: relationshipTypeOptions,
                  onChange: onChangeedge,
                  value: {label:newEdgeLabel,value:newEdgeLabel},
                }}
                type='creatable'
              />
              <Select
                helpText='You can select more than one values'
                label='Relationship Properties'
                selectProps={{
                  isClearable: true,
                  isMulti: true,
                  options: [],
                  onChange: onChangeedgeProperties,
                  value: newEdgeProperties.map(p=> { return {label:p,value:p}}),
                }}
                type='creatable'
              />
              <ButtonWithToolTip
                text={"Add Edge"}
                disabled={newEdgeLabel==""}
                onClick={addEdge}
                label='Add Edge'
                placement='top'
              >
                Add Edge
              </ButtonWithToolTip>
            </div>
           </>
          )}
        </ResizePanelDetails>
      </div>
     
      <div className='mt-4'>
        <Flex className='mt-4! mb-2 flex items-center' flexDirection='row' justifyContent='flex-end'>
          <Flex flexDirection='row' gap='4'>
            <ButtonWithToolTip
              loading={loading}
              text={
                !nodeLabelOptions.length && !relationshipTypeOptions.length
                  ? `No Labels Found in the Database`
                  : tooltips.useExistingSchema
              }
              disabled={!nodeLabelOptions.length && !relationshipTypeOptions.length}
              onClick={clickHandler}
              label='Use Existing Schema'
              placement='top'
            >
              Load Existing Schema
            </ButtonWithToolTip>
            <ButtonWithToolTip
              label={'Graph Schema'}
              text={tooltips.visualizeGraph}
              placement='top'
              fill='outlined'
              onClick={handleSchemaView}
            >
              <Hierarchy1Icon />
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.createSchema}
              placement='top'
              onClick={() => {
                if (view === 'Dialog' && onClose != undefined) {
                  onClose();
                }
                if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
                  closeEnhanceGraphSchemaDialog();
                }
                openTextSchema();
              }}
              label='Get Existing Schema From Text'
            >
              Get Schema From Text
            </ButtonWithToolTip>
            {settingView === 'contentView' ? (
              <ButtonWithToolTip
                text={tooltips.continue}
                placement='top'
                onClick={onContinue}
                label='Continue to extract'
              >
                {buttonCaptions.continueSettings}
              </ButtonWithToolTip>
            ) : (
              <ButtonWithToolTip
                text={tooltips.clearGraphSettings}
                placement='top'
                onClick={handleClear}
                label='Clear Graph Settings'
                disabled={!hasSelections}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={handleApply}
              label='Apply Graph Settings'
              disabled={!hasSelections}
            >
              {buttonCaptions.applyGraphSchema}
            </ButtonWithToolTip>
          </Flex>
        </Flex>
      </div>
      <GraphViewModal open={openGraphView} setGraphViewOpen={setOpenGraphView} viewPoint={viewPoint} />
    </div>
  );
}
