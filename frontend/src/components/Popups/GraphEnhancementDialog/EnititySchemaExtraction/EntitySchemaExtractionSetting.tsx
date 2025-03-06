import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, getDefaultSchemaExamples, nvlOptions, tooltips } from '../../../../utils/Constants';
import { Select, Flex, Typography, useMediaQuery, IconButtonArray, TextInput } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { BasicNode, BasicRelationship, EntityType, ExtendedNode, ExtendedRelationship, OptionType, schema, SchemaNode, SchemaRelationship, Scheme } from '../../../../types';
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
  const [nodes, setNodes] = useState<SchemaNode[]>([]);
  const [relationships, setRelationships] = useState<SchemaRelationship[]>([]);
  const nvlRef = useRef<NVL>(null);
  const [selected, setSelected] = useState<{ type: EntityType; id: string } | undefined>(undefined);

  const [newNodeSchemaType, setNewNodeSchemaType] = useState('');

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

  const nvlCallbacks = {
    onLayoutComputing(isComputing: boolean) {
      if (!isComputing) {
        handleZoomToFit();
      }
    },
  };

  const handleZoomToFit = () => {
    nvlRef.current?.fit(
      nodes.map((node) => node.id),
      {}
    );
  };

  const handleZoomIn = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
  };

  const handleZoomOut = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
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

    const addNewNodeSchema = () => {
      if (!newNodeSchemaType && newNodeSchemaType!=="") return;
      setNodes((prevNodes) => {
        const exists = prevNodes.some(node => node.labels.includes(newNodeSchemaType));
        if (exists) return prevNodes;

        const newNode:SchemaNode = {
          id: newNodeSchemaType,
          description:"",
          captionAlign: 'bottom',
          caption: newNodeSchemaType,
          labels: [newNodeSchemaType],
          properties: []
        }
        
        return [...prevNodes, newNode];
      });
      setNewNodeSchemaType("")
    };

    const addNodeSchema = (NodeId: string) => {
      if (!newNodeSchemaType && newNodeSchemaType == "") return;
      
      setNodes((prevNodes) => {
        return prevNodes.map((node) => {
          if (node.id === NodeId) {
            if (node.labels.includes(newNodeSchemaType)) return node;
            return {
              ...node,
              labels: [...node.labels, newNodeSchemaType],
            };
          }
          return node;
        });
      });
      setNewNodeSchemaType("");
    };
    


   

  return (
    <div >
      <div className='flex h-[60vh]'>
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
            <>
            <div className='flex gap-2 flex-wrap ml-2'>
              {selectedItem.labels.map((label) => (
                <Legend
                  type="node"
                  key={label}
                  title={label}
                  bgColor={"blue"}
                  onClick={() => {}}
                />
              ))}
              <>
                <TextInput
                  htmlAttributes={{
                    type: "text",
                    "aria-label": "node schema type",
                    placeholder: "Node Schema Type",
                  }}
                  value={newNodeSchemaType}
                  onChange={(e) => {
                    setNewNodeSchemaType(e.target.value);
                  }}
                  isFluid={true}
                  rightElement={
                    <ButtonWithToolTip
                      text={"Add Node Type"}
                      onClick={() => addNodeSchema(selectedItem.id)}
                      label="Add Node Type"
                      >
                      +
                    </ButtonWithToolTip>
                  }
                />
              </>
            </div>
          </>
         
          ) : (
           <>
            <TextInput
              htmlAttributes={{
                type: 'text',
                'aria-label': 'node schema type',
                placeholder: 'Node Schema Type',
              }}
              value={newNodeSchemaType}
              onChange={(e) => {
                setNewNodeSchemaType(e.target.value);
              }}
              isFluid={true}
            />
            <ButtonWithToolTip
              text={"Add Node Type"}
              onClick={addNewNodeSchema}
              label='Add Node Type'
            >
              Add Node Type
            </ButtonWithToolTip>
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
