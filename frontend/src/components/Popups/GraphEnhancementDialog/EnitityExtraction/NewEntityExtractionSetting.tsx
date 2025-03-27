import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Flex, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OptionType, TupleType } from '../../../../types';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import PatternContainer from './PatternContainer';
import SchemaViz from '../../../Graph/SchemaViz';
import GraphPattern from './GraphPattern';
import { updateLocalStorage, extractOptions } from '../../../../utils/Utils';
import LoadExistingSchemaDialog from './LoadExistingSchema';

export default function NewEntityExtractionSetting({
  view,
  open,
  onClose,
  openTextSchema,
  openLoadSchema,
  settingView,
  onContinue,
  closeEnhanceGraphSchemaDialog,
}: {
  view: 'Dialog' | 'Tabs';
  open?: boolean;
  onClose?: () => void;
  openTextSchema: () => void;
  openLoadSchema: () => void;
  settingView: 'contentView' | 'headerView';
  onContinue?: () => void;
  closeEnhanceGraphSchemaDialog?: () => void;
}) {
  const { setSelectedRels, setSelectedNodes, userDefinedPattern,
    setUserDefinedPattern, dbPattern, setDbPattern, setSchemaTextPattern, schemaTextPattern,
    selectedNodes, selectedRels, allPatterns, setAllPatterns,
    schemaView, setSchemaView, dbNodes, dbRels, schemaValNodes, schemaValRels
  } =
    useFileContext();
  const { userCredentials } = useCredentials();
  // const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [userNodes, setUserNodes] = useState<OptionType[]>([]);
  const [userRels, setUserRels] = useState<OptionType[]>([]);
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([])
  const [selectedSource, setSource] = useState<OptionType | null>(null);
  const [selectedType, setType] = useState<OptionType | null>(null);
  const [selectedTarget, setTarget] = useState<OptionType | null>(null);
  const [highlightPattern, setHighlightedPattern] = useState<string | null>(null);
  const [nodes, setNodes] = useState<OptionType[]>([]);
  const [rels, setRels] = useState<OptionType[]>([]);


  // useEffect(() => {
  //   if (relationshipTypeOptions.length > 0) {
  //     setUserDefinedPattern(relationshipTypeOptions.map((rel) => rel.value));
  //     updateLocalStorage(userCredentials!!, 'selectedNodeLabels', nodeLabelOptions);
  //     updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', relationshipTypeOptions);
  //   }

  // }, [relationshipTypeOptions, nodeLabelOptions]);



  const handleClear = () => {
    setSelectedNodes([]);  // overall nodes 
    setSelectedRels([]);   // over all Rels
    setUserDefinedPattern([]);
    setUserNodes([]);   //user defined Nodes
    setUserRels([]);    // user defined rels 
    setDbPattern([]);
    setSchemaTextPattern([]); 
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', []);
    updateLocalStorage(userCredentials!!, 'selectedPattern', []);
    showNormalToast(`Successfully Removed the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
  };
  // useEffect(() => {
  //   const { nodeLabels, relLabels } = getStoredSchemaSettings();
  //   setSelectedNodes(nodeLabels);
  //   setSelectedRels(relLabels);
  //   //setPattern(patternVal);
  // }, []);

  // const getStoredSchemaSettings = () => {
  //   const storedNodeLabels = localStorage.getItem('selectedNodeLabels');
  //   const storedRelLabels = localStorage.getItem('selectedRelationshipLabels');
  //   //const storedPattern = localStorage.getItem('selectedRelationshipLabels');
  //   const nodeLabels = storedNodeLabels ? JSON.parse(storedNodeLabels).selectedOptions : [];
  //   const relLabels = storedRelLabels ? JSON.parse(storedRelLabels).selectedOptions : [];
  //   // const patternVal = storedPattern ? JSON.parse(storedPattern).selectedOptions : [];
  //   return { nodeLabels, relLabels };
  // };

  const handleApply = (pattern: string[], nodeLables: OptionType[], relationshipLabels: OptionType[]) => {
    showNormalToast(`Successfully applied the schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    const selectedNodePayload = {
      db: userCredentials?.uri || '',
      selectedOptions: userNodes || [],
    };
    const selectedRelPayload = {
      db: userCredentials?.uri || '',
      selectedOptions: userRels || [],
    };

    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', selectedNodePayload);
    updateLocalStorage(userCredentials!!, 'selectedNodeLabels', selectedRelPayload);
    setAllPatterns(pattern);
    setSelectedNodes(nodeLables);
    setSelectedRels(relationshipLabels);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
    nodeVal();
    relVal();
  };

  const handlePatternChange = (source: OptionType[] | OptionType, type: OptionType[] | OptionType, target: OptionType[] | OptionType) => {
    setSource(source as OptionType);
    setType(type as OptionType);
    setTarget(target as OptionType);
  };

  useEffect(() => {
    if (userDefinedPattern.length > 0) {
      const lastPattern = userDefinedPattern[0];
      setHighlightedPattern(null);
      setTimeout(() => {
        setHighlightedPattern(lastPattern);
      }, 100);
    }
  }, [userDefinedPattern]);

  const handleAddPattern = () => {
    if (selectedSource && selectedType && selectedTarget) {
      console.log('source', selectedSource, selectedTarget, selectedType);
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
          updateLocalStorage(userCredentials!, 'selectedTuplePatterns', updatedPattern);
          return updatedPattern;
        }
        return prev;
      });
      setTupleOptions((prev: TupleType[]) => {
        const alreadyExists = prev.some((tuple) => tuple.value === relValue);
        if (!alreadyExists) {
          const updatedTupples = [relationshipOption, ...prev,];
          updateLocalStorage(userCredentials!, 'selectTupleOptions', updatedTupples);
          const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTupples);
          setUserNodes(nodeLabelOptions);
          setUserRels(relationshipTypeOptions);
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

  const onLoadExistingSchemaCLick: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openLoadSchema();
  }, []);

  const nodeVal = ()=>{
      if(schemaView === 'db'){
        return setNodes(dbNodes);
      }
      else if(schemaView === 'text'){
        return setNodes(schemaValNodes);
      }
      else{
        return setNodes(userNodes);
      }
  }

  const relVal = ()=>{
    if(schemaView === 'db'){
      return setRels(dbRels);
    }
    else if(schemaView === 'text'){
      return setRels(schemaValRels);
    }
    else{
      return setRels(userRels);
    }
}

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
        {dbPattern.length > 0 && (
          <PatternContainer
            pattern={dbPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            highlightPattern={highlightPattern ?? ''}
            nodes={dbNodes}
            rels={dbRels}
          ></PatternContainer>
        )}
        {schemaTextPattern.length > 0 && (
          <PatternContainer
            pattern={schemaTextPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            highlightPattern={highlightPattern ?? ''}
            nodes={schemaValNodes}
            rels={schemaValRels}
          ></PatternContainer>
        )}
        {userDefinedPattern.length > 0 && (
          <PatternContainer
            pattern={userDefinedPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            highlightPattern={highlightPattern ?? ''}
            nodes={userNodes}
            rels={userRels}
          ></PatternContainer>
        )}
        <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
          <Flex flexDirection='row' gap='4'>
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
                onClick={handleClear}
                label='Clear Graph Settings'
              // disabled={!hasSelections}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={() => handleApply(allPatterns, selectedNodes as OptionType[], selectedRels as OptionType[])}
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
          nodeValues={(nodes) ?? []}
          relationshipValues={(rels) ?? []}
        />
      )}
    </div>
  );
}
