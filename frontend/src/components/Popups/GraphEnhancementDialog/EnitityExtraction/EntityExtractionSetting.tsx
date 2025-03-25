import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, getDefaultSchemaExamples, tooltips, appLabels } from '../../../../utils/Constants';
import { Flex, Typography, Switch, Tag } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, TupleType } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { Hierarchy1Icon } from '@neo4j-ndl/react/icons';
import SchemaGraphViewModal from '../../../Graph/SchemaGraphViz';
import TupleCreation from '../EnitityExtraction/TupleCreation';
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
  const {
    setSelectedTupleNodes,   // for node labels
    selectedTupleRels,       // for rel labels
    setSelectedTupleRels,
    selectedTupleNodes,
    selectedSource,
    setSelectedSource,
    selectedType,
    setSelectedType,
    selectedTarget,
    setSelectedTarget,
    selectedPatterns,
    setSelectedPatterns,
    nodesLabels,
    setNodeLabels,
    relationshipLabels,
    setRelationshipLabels
  } = useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const hasSelections = useHasSelections(selectedTupleRels, selectedTupleNodes,);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [tuples, setTuples] = useState<TupleType[]>([]);
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);

  useEffect(() => {
    if (userCredentials) {
      if ((open && view === 'Dialog') || view === 'Tabs') {
        const getOptions = async () => {
          setLoading(true);
          try {
            const response = await getNodeLabelsAndRelTypes();
            setLoading(false);
            const schemaData = response.data.data as string[];
            if (schemaData.length) {
              const schemaTuples = schemaData
                .map((item) => {
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
                .filter(Boolean) as OptionType[];
              setTuples(schemaTuples as TupleType[]);
              const nodeValues = schemaTuples.flatMap((tuple: any) => [
                { value: tuple.source, label: tuple.source },
                { value: tuple.target, label: tuple.target },
              ]);
              const relationshipValues = schemaTuples.flatMap((tuple: any) => tuple.value);
              setNodeLabels(nodeValues);
              setRelationshipLabels(relationshipValues);
            }
          } catch (error) {
            setLoading(false);
            console.error('Error fetching schema options:', error);
          }
        };
        getOptions();
      }
    }
  }, [userCredentials, open, view]);

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const tuplePatterns = tuples.map((tuple) => tuple.label);
    setSelectedPatterns(tuplePatterns);
    const nodeValues = tuples.flatMap((tuple) => [
      { value: tuple.source, label: tuple.source },
      { value: tuple.target, label: tuple.target },
    ]);
    setNodeLabels(nodeValues);
    setRelationshipLabels(tuples.flatMap((tuple) => tuple.value));
    updateLocalStorage(userCredentials!, 'selectTupleOptions', tuples);
    updateLocalStorage(userCredentials!, 'selectedTuplePatterns', selectedPatterns);
  }, [tuples, selectedPatterns]);

  const handleClear = () => {
    setSelectedTupleNodes([]);
    setSelectedTupleRels([]);
    setSelectedPatterns([]);
    setTuples([]);
    setSelectedSource([]);
    setSelectedTarget([]);
    setSelectedType([]);
    updateLocalStorage(userCredentials!, 'selectedTupleNodeLabels', []);
    updateLocalStorage(userCredentials!, 'selectedTupleRelationshipLabels', []);
    updateLocalStorage(userCredentials!, 'selectedTuplePatterns', []);
    updateLocalStorage(userCredentials!, 'selectTupleOptions', []);
    updateLocalStorage(userCredentials!, 'selectedSource', []);
    updateLocalStorage(userCredentials!, 'selectedType', []);
    updateLocalStorage(userCredentials!, 'selectedTarget', []);
    showNormalToast(`Successfully removed the schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog) {
      closeEnhanceGraphSchemaDialog();
    }
  };

  const handleApply = () => {
    const tupleNodeLabels = tuples.flatMap((tuple) => [
      { value: tuple.source, label: tuple.source },
      { value: tuple.target, label: tuple.target },
    ]);
    const tupleRelationshipLabels = tuples.flatMap((tuple) => tuple.value)
    const tuplePatterns = tuples.map((tuple) => tuple.label);
    setNodeLabels(tupleNodeLabels);
    setRelationshipLabels(tupleRelationshipLabels);
    setSelectedTupleNodes(tupleNodeLabels);
    updateLocalStorage(userCredentials!, 'selectedTupleNodeLabels', tupleNodeLabels);
    setSelectedTupleRels(tupleRelationshipLabels);
    updateLocalStorage(userCredentials!, 'selectedTupleRelationshipLabels', tupleRelationshipLabels);
    setSelectedPatterns(tuplePatterns);
    updateLocalStorage(userCredentials!, 'selectedTuplePatterns', tuplePatterns);
    showNormalToast(`Successfully applied the schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog) {
      closeEnhanceGraphSchemaDialog();
    }
  };

  const handleSchemaView = (view: string) => {
    setOpenGraphView(true);
    setViewPoint(view);
  };

  const handlePatternChange = (source: OptionType[]|OptionType , type: OptionType[] | OptionType, target: OptionType[] | OptionType) => {
    setSelectedSource(source as OptionType []);
    setSelectedType(type as OptionType []);
    setSelectedTarget(target as OptionType []);
    updateLocalStorage(userCredentials!, 'selectedSource', source);
    updateLocalStorage(userCredentials!, 'selectedType', type);
    updateLocalStorage(userCredentials!, 'selectedTarget', target);
  };

  const handleAddPattern = () => {
    if (selectedSource && selectedType && selectedTarget) {
      let updatedTupples:TupleType[] = [];
      const patternValue = `${selectedSource.value} -[:${selectedType.value}]-> ${selectedTarget.value}`;
      const relValue = `${selectedSource.value},${selectedType.value},${selectedTarget.value}`;
      const relationshipOption: TupleType = {
        value: relValue,
        label: patternValue,
        source: selectedSource.value || '',
        target: selectedTarget.value || '',
        type: selectedType.value || '',
      };
      setSelectedPatterns((prev) => {
        const alreadyExists = prev.includes(patternValue);
        if (!alreadyExists) {
          const updatedPattern = [...prev, patternValue];
          updateLocalStorage(userCredentials!, 'selectedTuplePatterns', updatedPattern);
          return updatedPattern;
        }
        return prev;
      });
      setTuples((prev) => {
        const alreadyExists = prev.some((tuple) => tuple.value === relValue);
        if (!alreadyExists) {
          updatedTupples = [...prev, relationshipOption];
          updateLocalStorage(userCredentials!, 'selectTupleOptions', updatedTupples);
          return updatedTupples;
        }
        return prev;

      })
      const tupleNodeLabels = updatedTupples.flatMap((tuple) => [
        { value: tuple.source, label: tuple.source },
        { value: tuple.target, label: tuple.target },
      ]);
      setNodeLabels(tupleNodeLabels);
      setRelationshipLabels(updatedTupples.flatMap((tuple)=>tuple.value));
      setSelectedSource([]);
      setSelectedType([]);
      setSelectedTarget([]);
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
      {/* <Flex className='mt-1.5 flex!' flexDirection='row' justifyContent='space-between'>
        <Switch
          label={viewMode ? 'Preview' : 'Code'}
          isChecked={viewMode}
          onChange={() => setViewMode((prevMode) => !prevMode)}
        />
      </Flex> */}
      <div className='mt-4'>
        <TupleCreation
          defaultExamples={defaultExamples}
          selectedSchemas={[]}
          onChangeSchema={() => console.log('heloo')}
          selectedSource={selectedSource}
          selectedType={selectedType}
          selectedTarget={selectedTarget}
          onPatternChange={handlePatternChange}
          onAddPattern={handleAddPattern}
          onClearSelection={handleClear}
          selectedTupleOptions={tuples}
        />
        {selectedPatterns.length > 0 && (
          <div className='h-full'>
            <div className='flex align-self-center justify-center border'>
              <h5>{appLabels.selectedPatterns}</h5>
            </div>
            <div className='flex flex-wrap gap-2 mt-4 patternContainer'>
              {selectedPatterns.map((pattern) => (
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
            <>
              <ButtonWithToolTip
                loading={loading}
                text={
                  !tuples.length
                    ? `No Labels Found in the Database`
                    : tooltips.useExistingSchema
                }
                disabled={false}
                onClick={clickHandler}
                label='Use Existing Schema'
                placement='top'
              >
                Load Existing Schema
              </ButtonWithToolTip>
              {/* <ButtonWithToolTip
                label={'Graph Schema'}
                text={tooltips.visualizeGraph}
                placement='top'
                fill='filled'
                onClick={() => handleSchemaView('showSchemaView')}
              >
                {'Graph Schema from DB '} <Hierarchy1Icon />
              </ButtonWithToolTip> */}
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
            </>
            <ButtonWithToolTip
              label={'Tuple Schema'}
              text={tooltips.visualizeGraph}
              placement='top'
              fill='filled'
              onClick={() => handleSchemaView('showTupleView')}
              disabled={selectedPatterns.length === 0}
            >
              {'Visualise Schema'} <Hierarchy1Icon />
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
                disabled={selectedPatterns.length === 0}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={handleApply}
              label='Apply Graph Settings'
              disabled={selectedPatterns.length === 0}
            >
              {buttonCaptions.applyGraphSchema}
            </ButtonWithToolTip>
          </Flex>
        </Flex>
      </div>
      {openGraphView && (
        <SchemaGraphViewModal
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={(nodesLabels as OptionType[]) ?? []}
          relationshipValues={(relationshipLabels) ?? []}
        />
      )}
    </div>
  );
}
