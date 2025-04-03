import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, tooltips } from '../../../../utils/Constants';
import { Flex, Typography } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OptionType, TupleType } from '../../../../types';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import PatternContainer from './PatternContainer';
import SchemaViz from '../../../Graph/SchemaViz';
import GraphPattern from './GraphPattern';
import { updateLocalStorage, extractOptions } from '../../../../utils/Utils';

export default function NewEntityExtractionSetting({
  view,
  open,
  onClose,
  openTextSchema,
  openLoadSchema,
  openPredefinedSchema,
  settingView,
  onContinue,
  closeEnhanceGraphSchemaDialog,
}: {
  view: 'Dialog' | 'Tabs';
  open?: boolean;
  onClose?: () => void;
  openTextSchema: () => void;
  openLoadSchema: () => void;
  openPredefinedSchema: () => void;
  settingView: 'contentView' | 'headerView';
  onContinue?: () => void;
  closeEnhanceGraphSchemaDialog?: () => void;
}) {
  const {
    selectedRels,
    setSelectedRels,
    selectedNodes,
    setSelectedNodes,
    userDefinedPattern, setUserDefinedPattern,
    userDefinedNodes, setUserDefinedNodes,
    userDefinedRels, setUserDefinedRels,
    allPatterns, setAllPatterns,
    schemaView, setSchemaView,
    dbPattern, setDbPattern,
    dbNodes, setDbNodes,
    dbRels, setDbRels,
    schemaValNodes, setSchemaValNodes,
    schemaValRels, setSchemaValRels,
    schemaTextPattern, setSchemaTextPattern,
    preDefinedNodes, setPreDefinedNodes,
    preDefinedRels, setPreDefinedRels,
    preDefinedPattern, setPreDefinedPattern
  } =
    useFileContext();
  const { userCredentials } = useCredentials();
  // const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([])
  const [selectedSource, setSource] = useState<OptionType | null>(null);
  const [selectedType, setType] = useState<OptionType | null>(null);
  const [selectedTarget, setTarget] = useState<OptionType | null>(null);
  const [highlightPattern, setHighlightedPattern] = useState<string | null>(null);
  const [nodes, setNodes] = useState<OptionType[]>([]);
  const [rels, setRels] = useState<OptionType[]>([]);
  const [combinedPatterns, setCombinedPatterns] = useState<string[]>([]);
  const [combinedNodes, setCombinedNodes] = useState<OptionType[]>([]);
  const [combinedRels, setCombinedRels] = useState<OptionType[]>([]);

  useEffect(() => {
    const patterns = Array.from(new Set([...userDefinedPattern, ...preDefinedPattern, ...dbPattern, ...schemaTextPattern]));
    const nodesVal = Array.from(new Set([...userDefinedNodes, ...preDefinedNodes, ...dbNodes, ...schemaValNodes]));
    const relsVal = Array.from(new Set([...userDefinedRels, ...preDefinedRels, ...dbRels, ...schemaValRels]));
    setCombinedPatterns(patterns);
    setCombinedNodes(nodesVal);
    setCombinedRels(relsVal);
  }, [userDefinedPattern, userDefinedNodes, userDefinedRels, preDefinedNodes, preDefinedPattern, preDefinedRels, dbNodes, dbPattern, dbRels, schemaTextPattern, schemaValNodes, schemaValRels]);

  useEffect(() => {
    if (userDefinedPattern.length > 0) {
      const lastPattern = userDefinedPattern[0];
      setHighlightedPattern(null);
      setTimeout(() => {
        setHighlightedPattern(lastPattern);
      }, 100);
    }
  }, [userDefinedPattern]);

  useEffect(() => {
    if (dbNodes.length && schemaValNodes.length && userDefinedNodes.length && preDefinedNodes.length) {
      setSchemaView('all')
      setNodes(combinedNodes);
      setRels(combinedRels)
    }

  }, [combinedNodes, combinedRels]);


  const handleFinalClear = () => {
    // overall  
    setSelectedNodes([]);
    setSelectedRels([]);
    //User
    setUserDefinedPattern([]);
    setUserDefinedNodes([]);
    setUserDefinedRels([]);
    //DB
    setDbPattern([]);
    setDbNodes([]);
    setDbRels([]);
    //Text
    setSchemaTextPattern([]);
    setSchemaValNodes([]);
    setSchemaValRels([]);
    //Predefined
    setPreDefinedNodes([]);
    setPreDefinedRels([]);
    setPreDefinedPattern([])
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedPattern', []);
    showNormalToast(`Successfully Removed the Schema settings`);
    setSchemaView('');
  };

  const handleFinalApply = (pattern: string[], nodeLables: OptionType[], relationshipLabels: OptionType[]) => {
    showNormalToast(`Successfully applied the schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    setAllPatterns(pattern);
    setSelectedNodes(nodeLables);
    setSelectedRels(relationshipLabels);
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', nodeLables);
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', relationshipLabels);
    updateLocalStorage(userCredentials!!, 'selectedPatterns', pattern);
  };

  const handleSchemaView = () => {
    nodeVal();
    relVal();
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handlePatternChange = (source: OptionType[] | OptionType, type: OptionType[] | OptionType, target: OptionType[] | OptionType) => {
    setSource(source as OptionType);
    setType(type as OptionType);
    setTarget(target as OptionType);
  };

  const handleAddPattern = () => {
    setSchemaView('user');
    if (selectedSource && selectedType && selectedTarget) {
      const patternValue = `${selectedSource.value} -[:${selectedType.value}]-> ${selectedTarget.value}`;
      const relValue = `${selectedSource.value},${selectedType.value},${selectedTarget.value}`;
      const relationshipOption: TupleType = {
        value: relValue,
        label: patternValue,
        source: selectedSource.value || '',
        target: selectedTarget.value || '',
        type: selectedType.value || '',
      };
      setUserDefinedPattern((prev: string[]) => {
        const alreadyExists = prev.includes(patternValue);
        if (!alreadyExists) {
          const updatedPattern = [patternValue, ...prev];
          return updatedPattern;
        }
        return prev;
      });
      setTupleOptions((prev: TupleType[]) => {
        const alreadyExists = prev.some((tuple) => tuple.value === relValue);
        if (!alreadyExists) {
          const updatedTupples = [relationshipOption, ...prev,];
          const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTupples);
          setUserDefinedNodes(nodeLabelOptions);
          setUserDefinedRels(relationshipTypeOptions);
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
    setUserDefinedPattern((prevPatterns) => prevPatterns.filter((p) => p !== pattern));
  };

  const onSchemaFromTextCLick = () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openTextSchema();
  }

  const onPredefinedSchemaCLick = () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openPredefinedSchema();
  }

  const onLoadExistingSchemaCLick: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openLoadSchema();
  }, []);

  const nodeVal = () => {
    if (schemaView === 'db') {
      return setNodes(dbNodes);
    }
    else if (schemaView === 'text') {
      return setNodes(schemaValNodes);
    }
    else if (schemaView === 'preDefined') {
      return setNodes(preDefinedNodes);
    }
    else if (schemaView === 'user') {
      return setNodes(userDefinedNodes);
    }
    else if (schemaView === 'all') {
      return setNodes(combinedNodes);
    }
  }

  const relVal = () => {
    if (schemaView === 'db') {
      return setRels(dbRels);
    }
    else if (schemaView === 'text') {
      return setRels(schemaValRels);
    }
    else if (schemaView === 'preDefined') {
      return setRels(preDefinedRels);
    }
    else if (schemaView === 'user') {
      return setRels(userDefinedRels);
    }
    else if (schemaView === 'all') {
      return setRels(combinedRels);
    }
  }

  console.log('allNodes', nodes)
  console.log('allRels', rels);
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
          selectedSource={selectedSource}
          selectedType={selectedType}
          selectedTarget={selectedTarget}
          onPatternChange={handlePatternChange}
          onAddPattern={handleAddPattern}
          selectedTupleOptions={tupleOptions}
        >
        </GraphPattern>
        {
          combinedPatterns.length > 0 && (
            <PatternContainer
              pattern={combinedPatterns}
              handleRemove={handleRemovePattern}
              handleSchemaView={handleSchemaView}
              highlightPattern={highlightPattern ?? ''}
              nodes={combinedNodes}
              rels={combinedRels}
            ></PatternContainer>
          )
        }
        <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
          <Flex flexDirection='row' gap='4'>
            <ButtonWithToolTip
              text={tooltips.predinedSchema}
              placement='top'
              onClick={onPredefinedSchemaCLick}
              label='Use Predefined Schema'
            >
              Predefined Schema
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.useExistingSchema}
              onClick={onLoadExistingSchemaCLick}
              label='Use Existing Schema'
              placement='top'
            >
              Load Existing Schema
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.createSchema}
              placement='top'
              onClick={onSchemaFromTextCLick}
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
                onClick={handleFinalClear}
                label='Clear Graph Settings'
                disabled={!combinedNodes.length || !combinedRels.length}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={() => handleFinalApply(allPatterns, combinedNodes, combinedRels)}
              label='Apply Graph Settings'
              disabled={!combinedNodes.length || !combinedRels.length}
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
          nodeValues={(nodes) ?? []}
          relationshipValues={(rels) ?? []}
        />
      )}
    </div>
  );
}
