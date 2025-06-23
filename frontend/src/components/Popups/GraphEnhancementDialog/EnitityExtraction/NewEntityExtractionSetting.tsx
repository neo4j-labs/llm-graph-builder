import { MouseEventHandler, useCallback, useEffect, useState, useRef, Dispatch, SetStateAction } from 'react';
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
import {
  updateLocalStorage,
  extractOptions,
  parseRelationshipString,
  deduplicateByFullPattern,
  deduplicateNodeByValue,
} from '../../../../utils/Utils';
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
  combinedPatterns,
  setCombinedPatterns,
  combinedNodes,
  setCombinedNodes,
  combinedRels,
  setCombinedRels,
  openDataImporterSchema,
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
  combinedPatterns: string[];
  setCombinedPatterns: Dispatch<SetStateAction<string[]>>;
  combinedNodes: OptionType[];
  setCombinedNodes: Dispatch<SetStateAction<OptionType[]>>;
  combinedRels: OptionType[];
  setCombinedRels: Dispatch<SetStateAction<OptionType[]>>;
  openDataImporterSchema: () => void;
}) {
  const {
    setSelectedRels,
    setSelectedNodes,
    userDefinedPattern,
    setUserDefinedPattern,
    setUserDefinedNodes,
    setUserDefinedRels,
    setAllPatterns,
    dbPattern,
    setDbPattern,
    setDbNodes,
    setDbRels,
    setSchemaValNodes,
    setSchemaValRels,
    schemaTextPattern,
    setSchemaTextPattern,
    setPreDefinedNodes,
    setPreDefinedRels,
    preDefinedPattern,
    setPreDefinedPattern,
    setImporterNodes,
    setImporterRels,
    setImporterPattern,
    importerPattern,
  } = useFileContext();
  const { userCredentials } = useCredentials();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
  const [tupleOptions, setTupleOptions] = useState<TupleType[]>([]);
  const [selectedSource, setSource] = useState<OptionType | null>(null);
  const [selectedType, setType] = useState<OptionType | null>(null);
  const [selectedTarget, setTarget] = useState<OptionType | null>(null);
  const [highlightPattern, setHighlightedPattern] = useState<string | null>(null);

  const [isSchemaMenuOpen, setIsSchemaMenuOpen] = useState<boolean>(false);
  const schemaBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (userDefinedPattern.length > 0) {
      const lastPattern = userDefinedPattern[0];
      setHighlightedPattern(null);
      setTimeout(() => {
        setHighlightedPattern(lastPattern);
      }, 100);
    }
  }, [userDefinedPattern]);

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
    setTupleOptions([]);
    updateLocalStorage(userCredentials!, 'selectedNodeLabels', []);
    updateLocalStorage(userCredentials!, 'selectedRelationshipLabels', []);
    updateLocalStorage(userCredentials!, 'selectedPattern', []);
    showNormalToast(`Successfully Removed the Schema settings`);
    // Importer clear
    setImporterNodes([]);
    setImporterRels([]);
    setImporterPattern([]);
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
    source: OptionType[] | OptionType | null,
    type: OptionType[] | OptionType | null,
    target: OptionType[] | OptionType | null
  ) => {
    setSource(source as OptionType);
    setType(type as OptionType);
    setTarget(target as OptionType);
  };

  const handleAddPattern = (tupleOptionsValue: TupleType[]) => {
    if (selectedSource && selectedType && selectedTarget) {
      const patternValue = `${selectedSource.value} -[:${selectedType.value}]-> ${selectedTarget.value}`;
      const relValue = `${selectedSource.value},${selectedType.value},${selectedTarget.value}`;
      const relationshipOption: TupleType = {
        value: relValue,
        label: patternValue,
        source: selectedSource.value,
        target: selectedTarget.value,
        type: selectedType.value,
      };
      setUserDefinedPattern((prev) => (prev.includes(patternValue) ? prev : [patternValue, ...prev]));
      setCombinedPatterns((prev) => (prev.includes(patternValue) ? prev : [patternValue, ...prev]));
      const alreadyExists = tupleOptionsValue.some((tuple) => tuple.value === relValue);
      if (!alreadyExists) {
        const updatedTuples = [relationshipOption];
        const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTuples);
        setUserDefinedNodes((prev: OptionType[]) => {
          const combined = [...prev, ...nodeLabelOptions];
          return deduplicateNodeByValue(combined);
        });
        setUserDefinedRels((prev: OptionType[]) => {
          const combined = [...prev, ...relationshipTypeOptions];
          return deduplicateByFullPattern(combined);
        });
        setCombinedNodes((prev: OptionType[]) => {
          const combined = [...prev, ...nodeLabelOptions];
          return deduplicateNodeByValue(combined);
        });
        setCombinedRels((prev: OptionType[]) => {
          const combined = [...prev, ...relationshipTypeOptions];
          return deduplicateByFullPattern(combined);
        });
        setTupleOptions((prev) => [...updatedTuples, ...prev]);
      } else {
        if (tupleOptions.length === 0 && tupleOptionsValue.length > 0) {
          setTupleOptions(tupleOptionsValue);
        }
        showNormalToast('Pattern Already Exists');
      }
      setSource(null);
      setType(null);
      setTarget(null);
    }
  };
  const updateStore = (
    patterns: string[],
    patternToRemove: string,
    setPatterns: React.Dispatch<React.SetStateAction<string[]>>,
    setNodes: React.Dispatch<React.SetStateAction<OptionType[]>>,
    setRels: React.Dispatch<React.SetStateAction<OptionType[]>>
  ) => {
    const updatedPatterns = patterns.filter((p) => p !== patternToRemove);
    if (updatedPatterns.length === 0) {
      setPatterns([]);
      setNodes([]);
      setRels([]);
      return;
    }
    const updatedTuples: TupleType[] = updatedPatterns
      .map((item) => {
        const parts = item.match(/(.*?) -\[:(.*?)\]-> (.*)/);
        if (!parts) {
          return null;
        }
        const [src, rel, tgt] = parts.slice(1).map((s) => s.trim());
        return {
          value: `${src},${rel},${tgt}`,
          label: `${src} -[:${rel}]-> ${tgt}`,
          source: src,
          target: tgt,
          type: rel,
        };
      })
      .filter(Boolean) as TupleType[];
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTuples);
    setPatterns(updatedPatterns);
    setNodes(nodeLabelOptions);
    setRels(relationshipTypeOptions);
  };

  const handleRemovePattern = (patternToRemove: string) => {
    if (userDefinedPattern.includes(patternToRemove)) {
      updateStore(userDefinedPattern, patternToRemove, setUserDefinedPattern, setUserDefinedNodes, setUserDefinedRels);
    }
    if (preDefinedPattern.includes(patternToRemove)) {
      updateStore(preDefinedPattern, patternToRemove, setPreDefinedPattern, setPreDefinedNodes, setPreDefinedRels);
    }
    if (dbPattern.includes(patternToRemove)) {
      updateStore(dbPattern, patternToRemove, setDbPattern, setDbNodes, setDbRels);
    }
    if (schemaTextPattern.includes(patternToRemove)) {
      updateStore(schemaTextPattern, patternToRemove, setSchemaTextPattern, setSchemaValNodes, setSchemaValRels);
    }
    if (importerPattern.includes(patternToRemove)) {
      updateStore(importerPattern, patternToRemove, setImporterPattern, setImporterNodes, setImporterRels);
    }
    const updatedCombinedPatterns = combinedPatterns.filter((p) => p !== patternToRemove);
    setCombinedPatterns(updatedCombinedPatterns);
    const updatedTuples: TupleType[] = updatedCombinedPatterns
      .map((item) => {
        const parts = item.match(/(.*?) -\[:(.*?)\]-> (.*)/);
        if (!parts) {
          return null;
        }
        const [src, rel, tgt] = parts.slice(1).map((s) => s.trim());
        return {
          value: `${src},${rel},${tgt}`,
          label: `${src} -[:${rel}]-> ${tgt}`,
          source: src,
          target: tgt,
          type: rel,
        };
      })
      .filter(Boolean) as TupleType[];
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTuples);
    setCombinedNodes(nodeLabelOptions);
    setCombinedRels(relationshipTypeOptions);
    setTupleOptions((prev) => prev.filter((t) => t.label !== patternToRemove));
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

  const onDataImporterSchemaCLick: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    openDataImporterSchema();
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
          onAddPattern={() =>
            handleAddPattern(
              tupleOptions.length > 0
                ? tupleOptions
                : combinedPatterns.map((pattern) => parseRelationshipString(pattern))
            )
          }
          selectedTupleOptions={tupleOptions}
        ></GraphPattern>
        <PatternContainer
          pattern={combinedPatterns}
          handleRemove={handleRemovePattern}
          handleSchemaView={handleSchemaView}
          highlightPattern={highlightPattern ?? ''}
          nodes={combinedNodes}
          rels={combinedRels}
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
                  <TooltipWrapper hasButtonWrapper={true} placement='right' tooltip={tooltips.predinedSchema}>
                    Predefined Schema
                  </TooltipWrapper>
                }
                onClick={onPredefinedSchemaCLick}
              />
              <Menu.Item
                title={
                  <TooltipWrapper hasButtonWrapper={true} placement='right' tooltip={tooltips.useExistingSchema}>
                    Load Existing Schema
                  </TooltipWrapper>
                }
                onClick={onLoadExistingSchemaCLick}
              />
              <Menu.Item
                title={
                  <TooltipWrapper hasButtonWrapper={true} placement='right' tooltip={tooltips.createSchema}>
                    Get Schema From Text
                  </TooltipWrapper>
                }
                onClick={onSchemaFromTextCLick}
              />
              <Menu.Item
                title={
                  <TooltipWrapper hasButtonWrapper={true} placement='right' tooltip={tooltips.createSchema}>
                    Data Importer JSON
                  </TooltipWrapper>
                }
                onClick={onDataImporterSchemaCLick}
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
                disabled={!combinedPatterns.length}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={() => handleFinalApply(combinedPatterns, combinedNodes, combinedRels)}
              label='Apply Graph Settings'
              disabled={!combinedPatterns.length}
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
          nodeValues={combinedNodes}
          relationshipValues={combinedRels}
        />
      )}
    </div>
  );
}
