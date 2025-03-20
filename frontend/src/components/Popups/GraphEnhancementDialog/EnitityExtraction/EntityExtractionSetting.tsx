import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Flex, Typography, useMediaQuery, Switch } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, schema } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { tokens } from '@neo4j-ndl/base';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { Hierarchy1Icon } from '@neo4j-ndl/react/icons';
import GraphViewModal from '../../../Graph/GraphViewModal';
import TupleCreation from '../EnitityExtraction/TupleCreation'
import PreDefineSchema from './PreDefineSchema';
import { updateLocalStorage } from '../../../../utils/Utils';
 
export default function EntityExtractionSetting({
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
  const { breakpoints } = tokens;
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [relationshipMode, setRelationshipMode] = useState<'list' | 'tuple'>(
    selectedRels.length > 0 && selectedRels.every((t) => t.value.split(',').length === 3) ? 'tuple' : 'list'
  );
  const [listModeRels, setListModeRels] = useState<OptionType[]>([]);
  const [tupleModeRels, setTupleModeRels] = useState<OptionType[]>([]);
  const [selectedSource, setSelectedSource] = useState<OptionType | null>(null);
  const [selectedType, setSelectedType] = useState<OptionType | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<OptionType | null>(null);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [lastTupleSelections, setLastTupleSelections] = useState<{
    source: OptionType | null;
    type: OptionType | null;
    target: OptionType | null;
  } | null>(null);
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

  useEffect(() => {
    const storedMode = localStorage.getItem('relationshipMode');
    if (storedMode === 'tuple' || storedMode === 'list') {
      setRelationshipMode(storedMode);
      const storedRels = JSON.parse(localStorage.getItem('selectedRelationshipLabels') || '{}').selectedOptions || [];
      setSelectedRels(storedRels);
      if (storedMode === 'list') {
        setListModeRels(storedRels);
      } else {
        setTupleModeRels(storedRels);
      }
    }
  }, []);

  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      updateLocalStorage(userCredentials!!, 'selectedNodeLabels', []);
    }
    setSelectedNodes(selectedOptions);
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', selectedOptions);
  };
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', []);
      setSelectedRels([]);
      if (relationshipMode === 'list') {
        setListModeRels([]);
      } else {
        setTupleModeRels([]);
      }
      return;
    }
    const processedOptions = selectedOptions
      .map((option) => {
        const value = option.value.trim();
        if (relationshipMode === 'tuple' && value.split(',').length !== 3) {
          showNormalToast(
            `Invalid tuple format for relationship "${option.label}". Please enter as "Source, Relationship, Target".`
          );
          return null;
        }
        if (relationshipMode === 'list' && value.includes(',')) {
          showNormalToast(
            `Invalid format for relationship "${option.label}". Commas are not allowed in list mode.`
          );
          return null;
        }
        return { ...option, value };
      })
      .filter((option): option is OptionType => option !== null);
    setSelectedRels(processedOptions);
    if (relationshipMode === 'list') {
      setListModeRels(processedOptions);
    } else {
      setTupleModeRels(processedOptions);
    }
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', processedOptions);
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
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', nodeLabelOptions);
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', relationshipTypeOptions);
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

  const saveSchemaSettings = () => {
    if (userCredentials) {
      if (relationshipMode === 'list') {
        updateLocalStorage(userCredentials, 'selectedNodeLabels', selectedNodes);
        updateLocalStorage(userCredentials, 'selectedRelationshipLabels', selectedRels);
        updateLocalStorage(userCredentials, 'selectedSchemas', selectedSchemas);
      }
      else {
        updateLocalStorage(userCredentials, 'lastTupleSelections', lastTupleSelections);
      }
    }
  };
 
  const handleSchemaAction = (action: 'apply' | 'clear') => {
    if (action === 'clear') {
      setSelectedNodes([]);
      setSelectedRels([]);
      setSelectedSchemas([]);
    }
    saveSchemaSettings();
    showNormalToast(
      action === 'apply' ? 'Successfully Applied the Schema settings' : 'Successfully Removed the Schema settings'
    );
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog) {
      closeEnhanceGraphSchemaDialog();
    }
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handlePatternChange = (source: OptionType | null, type: OptionType | null, target: OptionType | null) => {
    setSelectedSource(source);
    setSelectedType(type);
    setSelectedTarget(target);
    setLastTupleSelections({ source, type, target });
    if (source && target && type) {
      const relValue = `${source.value},${type.value},${target.value}`;
      const relationshipOption: OptionType = { label: relValue, value: relValue };
      setSelectedRels((prev) => {
        const alreadyExists = prev.some((rel) => rel.value === relValue);
        if (!alreadyExists) {
          const updatedRels = [...prev, relationshipOption];
          updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', updatedRels);
          return updatedRels;
        }
        return prev;
      });
      const nodeOptions: OptionType[] = [
        { label: source.value, value: source.value },
        { label: target.value, value: target.value },
      ];
      setSelectedNodes((prev) => {
        const combinedNodes = [...prev, ...nodeOptions];
        const uniqueNodes = Array.from(new Set(combinedNodes.map((item) => item.value))).map((value) => ({
          label: value,
          value,
        }));
        updateLocalStorage(userCredentials!!, 'selectedNodeLabels', uniqueNodes);
        return uniqueNodes;
      });
    }
  };
 
  const toggleRelationshipMode = () => {
    setRelationshipMode((prevMode) => {
      const newMode = prevMode === 'list' ? 'tuple' : 'list';
      if (prevMode === 'tuple') {
        setLastTupleSelections({
          source: selectedSource,
          type: selectedType,
          target: selectedTarget,
        });
      }
      if (newMode === 'tuple' && lastTupleSelections) {
        setSelectedSource(lastTupleSelections.source);
        setSelectedType(lastTupleSelections.type);
        setSelectedTarget(lastTupleSelections.target);
      }
      const restoredRels = newMode === 'list' ? listModeRels : tupleModeRels;
      setSelectedRels(restoredRels);
      localStorage.setItem('relationshipMode', newMode);
      return newMode;
    });
  };
 
  const handleAddPattern = () => {
    if (selectedSource && selectedType && selectedTarget) {
      const newPattern = `(:${selectedSource.value})-[:${selectedType.value}]->(:${selectedTarget.value})`;
      if (!selectedPatterns.includes(newPattern)) {
        setSelectedPatterns((prevPatterns) => [...prevPatterns, newPattern]);
      }
    }
  };
 
  const handleRemovePattern = (pattern: string) => {
    setSelectedPatterns((prevPatterns) => prevPatterns.filter((p) => p !== pattern));
  };
 
  return (
    <div>
      <Typography variant='body-medium'>
        <span>
          1.Predefine the structure of your knowledge graph by selecting specific node and relationship labels.
        </span>
        <br></br>
        <span>
          2.Focus your analysis by extracting only the relationships and entities that matter most to your use case.
          Achieve a cleaner and more insightful graph representation tailored to your domain.
        </span>
      </Typography>
      <Flex className={'mt-1.5'} justifyContent='center'>
        <Switch
          label={
            relationshipMode === 'tuple'
              ? 'Switched to Tuple Mode'
              : 'Switched to Predefined Schema'
          }
          isChecked={relationshipMode === 'tuple'}
          onChange={toggleRelationshipMode}
        />
      </Flex>
      {relationshipMode === 'tuple' ? (<>
        <TupleCreation
          selectedSource={selectedSource}
          selectedType={selectedType}
          selectedTarget={selectedTarget}
          selectedPatterns={selectedPatterns}
          onPatternChange={handlePatternChange}
          onAddPattern={handleAddPattern}
          onRemovePattern={handleRemovePattern}
          onClearSelection={() => handleSchemaAction('clear')} />
      </>) : (
        <PreDefineSchema
          selectedNodes={selectedNodes}
          selectedRels={selectedRels}
          selectedSchemas={selectedSchemas}
          loading={loading}
          nodeLabelOptions={nodeLabelOptions}
          relationshipMode='list'
          relationshipTypeOptions={relationshipTypeOptions}
          defaultExamples={defaultExamples}
          onChangeSchema={onChangeSchema}
          onChangenodes={onChangenodes}
          onChangerels={onChangerels}
          isTablet={isTablet}
        ></PreDefineSchema>
      )}
      <>
 
        <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
          <Flex flexDirection='row' gap='4'>
            {relationshipMode === 'list' && (<ButtonWithToolTip
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
            </ButtonWithToolTip>)}
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
                onClick={() => { handleSchemaAction('clear') }}
                label='Clear Graph Settings'
                disabled={!hasSelections}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={() => { handleSchemaAction('apply') }}
              label='Apply Graph Settings'
              disabled={!hasSelections}
            >
              {buttonCaptions.applyGraphSchema}
            </ButtonWithToolTip>
          </Flex>
        </Flex>
      </>
      <GraphViewModal open={openGraphView} setGraphViewOpen={setOpenGraphView} viewPoint={viewPoint} />
    </div>
  );
}
