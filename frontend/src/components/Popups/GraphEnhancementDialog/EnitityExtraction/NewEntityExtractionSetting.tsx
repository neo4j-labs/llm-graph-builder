import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Flex, Typography, useMediaQuery, Tag } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OptionType, TupleType } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { Hierarchy1Icon } from '@neo4j-ndl/react/icons';
import SchemaViz from '../../../Graph/SchemaViz';
import GraphPattern from './GraphPattern';
import { updateLocalStorage, extractOptions } from '../../../../utils/Utils';

export default function NewEntityExtractionSetting({
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
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([])
  const [selectedSource, setSource] = useState<OptionType | null>(null);
  const [selectedType, setType] = useState<OptionType | null>(null);
  const [selectedTarget, setTarget] = useState<OptionType | null>(null);
  const [pattern, setPattern] = useState<string[]>([]);

  useEffect(() => {
    if (relationshipTypeOptions.length > 0) {
      setPattern(relationshipTypeOptions.map((rel) => rel.value));
      updateLocalStorage(userCredentials!!, 'selectedNodeLabels', nodeLabelOptions);
      updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', relationshipTypeOptions);
    }

  }, [relationshipTypeOptions, nodeLabelOptions]);

  const getOptions = async () => {
    setLoading(true);
    try {
      const response = await getNodeLabelsAndRelTypes();
      setLoading(false);
      const schemaData: string[] = response.data.data;
      const schemaTuples: TupleType[] = schemaData.map((item: string) => {
        const matchResult = item.match(/(.*?)-\[:(.*?)\]->(.*)/);
        if (matchResult) {
          const [source, rel, target] = matchResult.slice(1).map((s) => s.trim());
          return {
            value: `${source},${rel},${target}`,
            label: `${source} -[:${rel}]-> ${target}`,
            source,
            target,
            type: rel,
          };
        }
        return null;
      })
        .filter(Boolean) as TupleType[];
      const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(schemaTuples);
      setnodeLabelOptions(nodeLabelOptions);
      setrelationshipTypeOptions(relationshipTypeOptions);
    } catch (error) {
      setLoading(false);
      console.error('Error fetching schema options:', error);
    }
  };

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    await getOptions();
  }, [nodeLabelOptions, relationshipTypeOptions]);

  const handleClear = () => {
    setSelectedNodes([]);
    setSelectedRels([]);
    setPattern([]);
    setnodeLabelOptions([]);
    setrelationshipTypeOptions([]);
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedPattern', []);
    showNormalToast(`Successfully Removed the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
  };
  useEffect(() => {
    const { nodeLabels, relLabels } = getStoredSchemaSettings();
    setSelectedNodes(nodeLabels);
    setSelectedRels(relLabels);
    //setPattern(patternVal);
  }, []);

  const getStoredSchemaSettings = () => {
    const storedNodeLabels = localStorage.getItem('selectedNodeLabels');
    const storedRelLabels = localStorage.getItem('selectedRelationshipLabels');
    //const storedPattern = localStorage.getItem('selectedRelationshipLabels');
    const nodeLabels = storedNodeLabels ? JSON.parse(storedNodeLabels).selectedOptions : [];
    const relLabels = storedRelLabels ? JSON.parse(storedRelLabels).selectedOptions : [];
    // const patternVal = storedPattern ? JSON.parse(storedPattern).selectedOptions : [];
    return { nodeLabels, relLabels };
  };

  const handleApply = () => {
    // Show success toast
    showNormalToast(`Successfully applied the schema settings`);
    // Close the dialog if the view is 'Tabs'
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    // Prepare the payload to save in localStorage
    const selectedNodePayload = {
      db: userCredentials?.uri || '', // Add fallback to avoid undefined
      selectedOptions: nodeLabelOptions || [], // Ensure selectedNodes is never undefined
    };
    const selectedRelPayload = {
      db: userCredentials?.uri || '',
      selectedOptions: relationshipTypeOptions || [],
    };

    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', selectedNodePayload);
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', selectedRelPayload);
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);

    console.log('Schema settings saved successfully:', {
      nodes: selectedNodePayload,
      rels: selectedRelPayload,
    });
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handlePatternChange = (source: OptionType[] | OptionType, type: OptionType[] | OptionType, target: OptionType[] | OptionType) => {
    setSource(source as OptionType);
    setType(type as OptionType);
    setTarget(target as OptionType);
  };

  const handleAddPattern = () => {
    if (selectedSource && selectedType && selectedTarget) {
      console.log('source', selectedSource, selectedTarget, selectedType);
      let updatedTupples: TupleType[] = [];
      const patternValue = `${selectedSource.value} -[:${selectedType.value}]-> ${selectedTarget.value}`;
      const relValue = `${selectedSource.value},${selectedType.value},${selectedTarget.value}`;
      const relationshipOption: TupleType = {
        value: relValue,
        label: patternValue,
        source: selectedSource.value || '',
        target: selectedTarget.value || '',
        type: selectedType.value || '',
      };
      setPattern((prev: string[]) => {
        const alreadyExists = prev.includes(patternValue);
        if (!alreadyExists) {
          const updatedPattern = [...prev, patternValue];
          updateLocalStorage(userCredentials!, 'selectedTuplePatterns', updatedPattern);
          return updatedPattern;
        }
        return prev;
      });
      setTupleOptions((prev: TupleType[]) => {
        const alreadyExists = prev.some((tuple) => tuple.value === relValue);
        if (!alreadyExists) {
          updatedTupples = [...prev, relationshipOption];
          updateLocalStorage(userCredentials!, 'selectTupleOptions', updatedTupples);
          const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTupples);
          setnodeLabelOptions(nodeLabelOptions);
          setrelationshipTypeOptions(relationshipTypeOptions);
          return updatedTupples;
        }
        return prev;
      });
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
              //disabled={!nodeLabelOptions.length && !relationshipTypeOptions.length}
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
              //disabled={!hasSelections}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={handleApply}
              label='Apply Graph Settings'
            //disabled={!hasSelections}
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
