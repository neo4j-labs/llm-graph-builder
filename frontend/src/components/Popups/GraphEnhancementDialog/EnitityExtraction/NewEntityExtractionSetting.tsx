import { MouseEventHandler, useCallback, useEffect, useState, useRef } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { buttonCaptions, tooltips } from '../../../../utils/Constants';
import { Flex, Typography, DropdownButton, Menu } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OptionType, TupleType } from '../../../../types';
import { showNormalToast } from '../../../../utils/Toasts';
import PatternContainer from './PatternContainer';
import SchemaViz from '../../../Graph/SchemaViz';
import GraphPattern from './GraphPattern';
import { updateLocalStorage, extractOptions } from '../../../../utils/Utils';
import TooltipWrapper from '../../../UI/TipWrapper';

export default function NewEntityExtractionSetting({
  view,
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
    selectedNodes,
    allPatterns,
    setSelectedRels,
    setSelectedNodes,
    userDefinedPattern,
    setUserDefinedPattern,
    userDefinedNodes,
    setUserDefinedNodes,
    userDefinedRels,
    setUserDefinedRels,
    setAllPatterns,
    dbPattern,
    setDbPattern,
    dbNodes,
    setDbNodes,
    dbRels,
    setDbRels,
    schemaValNodes,
    setSchemaValNodes,
    schemaValRels,
    setSchemaValRels,
    schemaTextPattern,
    setSchemaTextPattern,
    preDefinedNodes,
    setPreDefinedNodes,
    preDefinedRels,
    setPreDefinedRels,
    preDefinedPattern,
    setPreDefinedPattern,
  } = useFileContext();
  const { userCredentials } = useCredentials();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([]);
  const [selectedSource, setSource] = useState<OptionType | null>(null);
  const [selectedType, setType] = useState<OptionType | null>(null);
  const [selectedTarget, setTarget] = useState<OptionType | null>(null);
  const [highlightPattern, setHighlightedPattern] = useState<string | null>(null);
  const [combinedPatterns, setCombinedPatterns] = useState<string[]>([]);
  const [combinedNodes, setCombinedNodes] = useState<OptionType[]>([]);
  const [combinedRels, setCombinedRels] = useState<OptionType[]>([]);
  const [isSchemaMenuOpen, setIsSchemaMenuOpen] = useState<boolean>(false);
  const schemaBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const patterns = Array.from(
      new Set([...userDefinedPattern, ...preDefinedPattern, ...dbPattern, ...schemaTextPattern])
    );
    const nodesVal = Array.from(new Set([...userDefinedNodes, ...preDefinedNodes, ...dbNodes, ...schemaValNodes]));
    const relsVal = Array.from(new Set([...userDefinedRels, ...preDefinedRels, ...dbRels, ...schemaValRels]));
    setCombinedPatterns(patterns);
    setCombinedNodes(nodesVal);
    setCombinedRels(relsVal);
  }, [
    userDefinedPattern,
    preDefinedPattern,
    dbPattern,
    schemaTextPattern,
    userDefinedNodes,
    preDefinedNodes,
    dbNodes,
    schemaValNodes,
    userDefinedRels,
    preDefinedRels,
    dbRels,
    schemaValRels,
  ]);

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
    setCombinedNodes([...userDefinedNodes, ...preDefinedNodes, ...dbNodes, ...schemaValNodes]);
    setCombinedRels([...userDefinedRels, ...preDefinedRels, ...dbRels, ...schemaValRels]);
  }, [
    userDefinedNodes,
    preDefinedNodes,
    dbNodes,
    schemaValNodes,
    userDefinedRels,
    preDefinedRels,
    dbRels,
    schemaValRels,
    userDefinedPattern,
    preDefinedPattern,
    dbPattern,
    schemaTextPattern,
  ]);

  const handleFinalClear = () => {
    // overall
    setSelectedNodes([]);
    setSelectedRels([]);
    setAllPatterns([]);
    // User
    setUserDefinedPattern([]);
    setUserDefinedNodes([]);
    setUserDefinedRels([]);
    // DB
    setDbPattern([]);
    setDbNodes([]);
    setDbRels([]);
    // Text
    setSchemaTextPattern([]);
    setSchemaValNodes([]);
    setSchemaValRels([]);
    // Predefined
    setPreDefinedNodes([]);
    setPreDefinedRels([]);
    setPreDefinedPattern([]);
    setCombinedPatterns([]);
    setCombinedNodes([]);
    setCombinedRels([]);
    updateLocalStorage(userCredentials!, 'selectedNodeLabels', []);
    updateLocalStorage(userCredentials!, 'selectedRelationshipLabels', []);
    updateLocalStorage(userCredentials!, 'selectedPattern', []);
    updateLocalStorage(userCredentials!, 'preDefinedNodeLabels', []);
    updateLocalStorage(userCredentials!, 'preDefinedRelationshipLabels', []);
    updateLocalStorage(userCredentials!, 'preDefinedPatterns', []);
    updateLocalStorage(userCredentials!, 'textNodeLabels', []);
    updateLocalStorage(userCredentials!, 'textRelationLabels', []);
    updateLocalStorage(userCredentials!, 'textPatterns', []);
    updateLocalStorage(userCredentials!, 'dbNodeLabels', []);
    updateLocalStorage(userCredentials!, 'dbRelationLabels', []);
    updateLocalStorage(userCredentials!, 'dbPatterns', []);
    showNormalToast(`Successfully Removed the Schema settings`);
  };

  const handleFinalApply = (pattern: string[], nodeLables: OptionType[], relationshipLabels: OptionType[]) => {
    showNormalToast(`Successfully applied the schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    setAllPatterns(pattern);
    setSelectedNodes(nodeLables);
    setSelectedRels(relationshipLabels);
    updateLocalStorage(userCredentials!, 'selectedNodeLabels', nodeLables);
    updateLocalStorage(userCredentials!, 'selectedRelationshipLabels', relationshipLabels);
    updateLocalStorage(userCredentials!, 'selectedPattern', pattern);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handlePatternChange = (
    source: OptionType[] | OptionType,
    type: OptionType[] | OptionType,
    target: OptionType[] | OptionType
  ) => {
    setSource(source as OptionType);
    setType(type as OptionType);
    setTarget(target as OptionType);
  };

  const handleAddPattern = () => {
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
          const updatedTupples = [relationshipOption, ...prev];
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
    const match = pattern.match(/(.*?) -\[:(.*?)\]-> (.*)/);
    if (!match) {
      return;
    }
    const [, source, type, target] = match;
    const updatePatternAndLabels = (
      patterns: string[],
      setPatterns: React.Dispatch<React.SetStateAction<string[]>>,
      nodes: OptionType[],
      setNodes: React.Dispatch<React.SetStateAction<OptionType[]>>,
      rels: OptionType[],
      setRels: React.Dispatch<React.SetStateAction<OptionType[]>>
    ) => {
      const updatedPatterns = patterns.filter((p) => p !== pattern);
      setPatterns(updatedPatterns);
      const isNodeStillUsed = (value: string) => updatedPatterns.some((p) => p.includes(value));
      const isRelStillUsed = (value: string) => updatedPatterns.some((p) => p.includes(`[:${value}]`));
      const updatedNodes = nodes.filter(
        (n) => (n.value !== source || isNodeStillUsed(source)) && (n.value !== target || isNodeStillUsed(target))
      );
      const updatedRels = rels.filter((r) => r.value !== type || isRelStillUsed(type));
      setNodes(updatedNodes);
      setRels(updatedRels);
    };
    updatePatternAndLabels(
      userDefinedPattern,
      setUserDefinedPattern,
      userDefinedNodes,
      setUserDefinedNodes,
      userDefinedRels,
      setUserDefinedRels
    );
    updatePatternAndLabels(
      preDefinedPattern,
      setPreDefinedPattern,
      preDefinedNodes,
      setPreDefinedNodes,
      preDefinedRels,
      setPreDefinedRels
    );
    updatePatternAndLabels(dbPattern, setDbPattern, dbNodes, setDbNodes, dbRels, setDbRels);
    updatePatternAndLabels(
      schemaTextPattern,
      setSchemaTextPattern,
      schemaValNodes,
      setSchemaValNodes,
      schemaValRels,
      setSchemaValRels
    );
    setCombinedPatterns((prev) => prev.filter((p) => p !== pattern));
    setCombinedNodes((prev) => prev.filter((n) => !(n.value === source || n.value === target)));
    setCombinedRels((prev) => prev.filter((r) => r.value !== type));
    setTupleOptions((prev) => prev.filter((t) => t.label !== pattern));
  };

  const onSchemaFromTextCLick = () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openTextSchema();
  };

  const onPredefinedSchemaCLick = () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openPredefinedSchema();
  };

  const onLoadExistingSchemaCLick: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openLoadSchema();
  }, []);

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
        ></GraphPattern>
        <PatternContainer
          pattern={allPatterns.length > 0 ? allPatterns : combinedPatterns}
          handleRemove={handleRemovePattern}
          handleSchemaView={handleSchemaView}
          highlightPattern={highlightPattern ?? ''}
          nodes={selectedNodes.length > 0 ? selectedNodes as OptionType[] : combinedNodes}
          rels={selectedRels.length > 0 ? selectedRels as OptionType[] : combinedRels}
        ></PatternContainer>
        <Flex className='my-8! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
          <DropdownButton
            isOpen={isSchemaMenuOpen}
            htmlAttributes={{
              onClick: () => setIsSchemaMenuOpen((old) => !old),
            }}
            ref={schemaBtnRef}
          >
            Add Schema from ...
          </DropdownButton>
          <Menu isOpen={isSchemaMenuOpen} anchorRef={schemaBtnRef} onClose={() => setIsSchemaMenuOpen(false)}>
            <Menu.Items
              htmlAttributes={{
                id: 'default-menu',
              }}
            >
              <Menu.Item
                title={
                  <TooltipWrapper placement='right' tooltip={tooltips.predinedSchema}>
                    Predefined Schema
                  </TooltipWrapper>
                }
                onClick={onPredefinedSchemaCLick}
              />
              <Menu.Item
                title={
                  <TooltipWrapper placement='right' tooltip={tooltips.useExistingSchema}>
                    Load Existing Schema
                  </TooltipWrapper>
                }
                onClick={onLoadExistingSchemaCLick}
              />
              <Menu.Item
                title={
                  <TooltipWrapper placement='right' tooltip={tooltips.createSchema}>
                    Get Schema From Text
                  </TooltipWrapper>
                }
                onClick={onSchemaFromTextCLick}
              />
            </Menu.Items>
          </Menu>
          <Flex flexDirection='row' gap='4'>
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
                disabled={allPatterns.length > 0 ? !allPatterns.length : !combinedPatterns.length}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={() => handleFinalApply(combinedPatterns, combinedNodes, combinedRels)}
              label='Apply Graph Settings'
              disabled={allPatterns.length > 0 ? !allPatterns.length : !combinedPatterns.length}
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
          nodeValues={combinedNodes.length > 0 ? combinedNodes : selectedNodes as OptionType[]}
          relationshipValues={combinedRels.length > 0 ? combinedRels : selectedRels as OptionType[]}
        />
      )}
    </div>
  );
}
