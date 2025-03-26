import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Flex, Typography, useMediaQuery, Tag } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, schema, TupleType } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { tokens } from '@neo4j-ndl/base';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { Hierarchy1Icon } from '@neo4j-ndl/react/icons';
import SchemaViz from '../../../Graph/SchemaViz';
import GraphPattern from '../EnitityExtraction/GraphPattern';
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
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([])
  const [selectedSource, setSource] = useState<OptionType[] | null>([]);
  const [selectedType, setType] = useState<OptionType[] | null>([]);
  const [selectedTarget, setTarget] = useState<OptionType[] | null>([]);
  const [pattern, setPattern] = useState<string[]>([]);

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


  useEffect(() => {
    if (userCredentials) {
      if (open && view === 'Dialog') {
        const getOptions = async () => {
          setLoading(true);
          try {
            const response = await getNodeLabelsAndRelTypes();
            setLoading(false);
            const schemaData = response.data.data ;
            console.log('response',schemaData )
            if (response.data.data.length) {
              // const nodelabels = response.data?.data[0]?.labels.map((l) => ({ value: l, label: l }));
              // const reltypes = response.data?.data[0]?.relationshipTypes.map((t) => ({ value: t, label: t }));
              // // setnodeLabelOptions(nodelabels);
              // // setrelationshipTypeOptions(reltypes);
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
            const schemaData = response.data.data ;
            console.log('response',schemaData )
            if (response.data.data.length) {
              // const nodelabels = response.data?.data[0]?.labels.map((l) => ({ value: l, label: l }));
              // const reltypes = response.data?.data[0]?.relationshipTypes.map((t) => ({ value: t, label: t }));
              // setnodeLabelOptions(nodelabels);
              // setrelationshipTypeOptions(reltypes);
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

  const handlePatternChange = (source: OptionType[] | OptionType, type: OptionType[] | OptionType, target: OptionType[] | OptionType) => {
    setSource(source as OptionType[]);
    setType(type as OptionType[]);
    setTarget(target as OptionType[]);
    // updateLocalStorage(userCredentials!, 'selectedSource', source);
    // updateLocalStorage(userCredentials!, 'selectedType', type);
    // updateLocalStorage(userCredentials!, 'selectedTarget', target);
  };

  const handleAddPattern = () => {
    if (selectedSource && selectedType && selectedTarget) {
      let updatedTupples: TupleType[] = [];
      const patternValue = `${selectedSource.label} -[:${selectedType.value}]-> ${selectedTarget.label}`;
      const relValue = `${selectedSource.label},${selectedType.value},${selectedTarget.label}`;
      const relationshipOption: TupleType = {
        value: relValue,
        label: patternValue,
        source: selectedSource.value || '',
        target: selectedTarget.value || '',
        type: selectedType.value || '',
      };
      // Update pattern
      setPattern((prev) => {
        const alreadyExists = prev.includes(patternValue);
        if (!alreadyExists) {
          const updatedPattern = [...prev, patternValue];
          updateLocalStorage(userCredentials!, 'selectedTuplePatterns', updatedPattern);
          return updatedPattern;
        }
        return prev;
      });
      // Update tuple options
      setTupleOptions((prev) => {
        const alreadyExists = prev.some((tuple) => tuple.value === relValue);
        if (!alreadyExists) {
          updatedTupples = [...prev, relationshipOption];
          updateLocalStorage(userCredentials!, 'selectTupleOptions', updatedTupples);
          return updatedTupples;
        }
        return prev;
      });
      // Set source and target to labels and type to relationship
      setnodeLabelOptions((prev) => {
        const newOptions = [
          { label: selectedSource.label, value: selectedSource.value },
          { label: selectedTarget.label, value: selectedTarget.value },
        ];
        return [...new Set([...prev, ...newOptions])];
      });
      setrelationshipTypeOptions((prev) => {
        const newRelOption = { label: relValue, value: relValue };
        const alreadyExists = prev.some((rel) => rel.value === type.value);
        if (!alreadyExists) {
          return [...prev, newRelOption];
        }
        return prev;
      });
      // Reset source, type, and target
      setSource(null);
      setType(null);
      setTarget(null);
    }
  };

  const handleRemovePattern = (pattern: string) => {
    setPattern((prevPatterns) => prevPatterns.filter((p) => p !== pattern));
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
      <div className='mt-4'>
        <GraphPattern
          defaultExamples={defaultExamples}
          selectedSchemas={[]}
          onChangeSchema={() => console.log('heloo')}
          selectedSource={selectedSource}
          selectedType={selectedType}
          selectedTarget={selectedTarget}
          onPatternChange={handlePatternChange}
          onAddPattern={handleAddPattern}
          onClearSelection={handleClear}
          selectedTupleOptions={tupleOptions}
        >
        </GraphPattern>
        {pattern.length > 0 && (
          <div className='h-full'>
            <div className='flex align-self-center justify-center border'>
              <h5>{appLabels.selectedPatterns}</h5>
            </div>
            <div className='flex flex-wrap gap-2 mt-4 patternContainer'>
              {pattern.map((pattern) => (
                <Tag
                  key={pattern}
                  onRemove={() => handleRemovePattern(pattern)}
                  isRemovable={true}
                  type='default'
                  size='medium'
                  className='rounded-full px-4 py-1 shadow-sm'
                >
                  {pattern}
                </Tag>
              ))}
            </div>
          </div>
        )}
        <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
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
      {openGraphView && (
        <SchemaViz
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={(nodeLabelOptions as OptionType[]) ?? []}
          relationshipValues={(relationshipTypeOptions) ?? []}
        />
      )}
    </div>
  );
}
