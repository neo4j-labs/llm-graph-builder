import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Select, Flex, IconButtonArray } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta, SingleValue } from 'react-select';
import { NodeSchema, OptionType, RelationshipSchema } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { showNormalToast } from '../../../../utils/toasts';
import { FitToScreenIcon, MagnifyingGlassMinusIconOutline, MagnifyingGlassPlusIconOutline } from '@neo4j-ndl/react/icons';
import { IconButtonWithToolTip } from '../../../UI/IconButtonToolTip';
import { ResizePanelDetails } from '../../../Graph/ResizePanel';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';


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
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);

  type SelectedElement =
  | { type: 'node'; data: NodeSchema }
  | { type: 'edge'; data: RelationshipSchema }
  | null;

  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels } =
  useFileContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<NodeSchema> | null>(null);
  const edgesRef = useRef<DataSet<RelationshipSchema> | null>(null);
  const nextEdgeIdRef = useRef<number>(0); // Starting from 5 (initial edges have IDs 1-4).

  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<readonly OptionType[]>();

  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);

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
          edges: {
            arrows:{
              to: true
            }
          }, 
          manipulation: {
            enabled: false,
            addEdge: (edgeData: any, callback: any) => {
              // Assign the edge label and properties from the inputs.
              edgeData.label = newEdgeLabelRef.current;
              edgeData.properties = newEdgePropertiesRef.current;
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

  // Function to add a new node using the provided label and properties.
  const addNode = () => {
    if (nodesRef.current) {
      const label = newNodeLabel.trim();
      nodesRef.current.add({ id: label, label, properties: newNodeProperties });
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

  const onChangeSchema = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    setSelectedSchemas(selectedOptions);
  };

  const addSchema = () => {
    const nodesFromSchema = selectedSchemas?.map((s) => JSON.parse(s.value).nodelabels).flat();
    const relationsFromSchema = selectedSchemas?.map((s) => JSON.parse(s.value).relationshipTypes).flat();
    if(!nodesFromSchema && !relationsFromSchema)
      return

    nodesFromSchema?.forEach(label => {
      nodesRef.current.add({ id: label, label, properties: [] });
    })
    //ToDo
    //relationsFromSchema?.forEach(rel => {  })

    setSelectedSchemas([])
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

  const handleApply = () => {
    setSelectedNodes(nodesRef.current.map((n: { label: string; }) => { return {label:n.label,value: n.label}}));
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions:nodesRef.current.map((n: { label: string; }) => { return {label:n.label,value: n.label}}) }));
  
    setSelectedRels(edgesRef.current.map((rel: { label: string; }) => {return {label: rel.label,value:rel.label}}));
    localStorage.setItem('selectedRelationshipLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: edgesRef.current.map((rel: { label: string; }) => {return {label: rel.label,value:rel.label}}) }));
    
    showNormalToast(`Successfully Applied the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
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
  
  const loadExistingSchemaClickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    nodeLabelOptions?.forEach(node => {
      nodesRef.current.add({ id: node.value, label:node.value, properties: [] });
    })
    //ToDo
    //relationshipTypeOptions?.forEach(rel => {  })
  }, [nodeLabelOptions, relationshipTypeOptions]);

  const handleClear = () => {
    nodesRef.current.clear()
    edgesRef.current.clear()
  }


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
                    {selectedElement.data.properties.length > 0
                      ? selectedElement.data.properties.join(', ')
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
                    {selectedElement.data.properties.length > 0
                      ? selectedElement.data.properties.join(', ')
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
            <div className="m-4">
              <Select
                helpText='Schema Examples'
                label='Predefined Schema'
                selectProps={{
                  isClearable: true,
                  isMulti: true,
                  options: defaultExamples,
                  onChange: onChangeSchema,
                  value: selectedSchemas,
                  menuPosition: 'fixed',
                }}
                type='select'
              />
              <ButtonWithToolTip
                text={"Add Schema"}
                onClick={addSchema}
                label='Add Schema'
                disabled={selectedSchemas?.length==0}
                placement='top'
              >
                Add Schema
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
              onClick={loadExistingSchemaClickHandler}
              label='Use Existing Schema'
              placement='top'
            >
              Load Existing Schema
            </ButtonWithToolTip>
            <ButtonWithToolTip
                text={tooltips.clearGraphSettings}
                placement='top'
                onClick={handleClear}
                label='Clear Graph Settings'
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={handleApply}
              label='Apply Graph Settings'
            >
              {buttonCaptions.applyGraphSchema}
            </ButtonWithToolTip>
          </Flex>
        </Flex>
      </div>
    </div>
  );
}
