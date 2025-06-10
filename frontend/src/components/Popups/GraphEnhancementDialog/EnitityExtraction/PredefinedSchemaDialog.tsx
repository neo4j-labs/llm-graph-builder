import { Dialog, Button, Select } from '@neo4j-ndl/react';
import { useState, useMemo } from 'react';
import PatternContainer from '../../GraphEnhancementDialog/EnitityExtraction/PatternContainer';
import { OptionType, TupleType } from '../../../../types';
import { extractOptions, getSelectedTriplets, updateSourceTargetTypeOptions } from '../../../../utils/Utils';
import SchemaViz from '../../../../components/Graph/SchemaViz';
import { getDefaultSchemaExamples, appLabels } from '../../../../utils/Constants';
import { useFileContext } from '../../../../context/UsersFiles';

interface SchemaFromTextProps {
  open: boolean;
  onClose: () => void;
  onApply: (
    patterns: string[],
    nodes: OptionType[],
    rels: OptionType[],
    updatedSource: OptionType[],
    updatedTarget: OptionType[],
    updatedType: OptionType[]
  ) => void;
}

const PredefinedSchemaDialog = ({ open, onClose, onApply }: SchemaFromTextProps) => {
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);
  const {
    setPreDefinedPattern,
    preDefinedPattern,
    preDefinedNodes,
    setPreDefinedNodes,
    preDefinedRels,
    setPreDefinedRels,
    setSelectedPreDefOption,
    selectedPreDefOption,
    sourceOptions,
    setSourceOptions,
    targetOptions,
    setTargetOptions,
    typeOptions,
    setTypeOptions,
  } = useFileContext();

  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');

  const handleRemovePattern = (patternToRemove: string) => {
    const updatedPatterns = preDefinedPattern.filter((p) => p !== patternToRemove);
    if (updatedPatterns.length === 0) {
      setSelectedPreDefOption(null);
      setPreDefinedPattern([]);
      setPreDefinedNodes([]);
      setPreDefinedRels([]);
      return;
    }
    setPreDefinedPattern(updatedPatterns);
    const selectedTriplets: TupleType[] = getSelectedTriplets(
      selectedPreDefOption ? [selectedPreDefOption] : []
    ).filter((t) => updatedPatterns.includes(t.label));
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(selectedTriplets);
    setPreDefinedNodes(nodeLabelOptions);
    setPreDefinedRels(relationshipTypeOptions);
  };
  const onChangeSchema = (selectedOption: OptionType | null | void) => {
    if (!selectedOption) {
      setSelectedPreDefOption(null);
      setPreDefinedPattern([]);
      setPreDefinedNodes([]);
      setPreDefinedRels([]);
      return;
    }
    setSelectedPreDefOption(selectedOption);
    const selectedTriplets: TupleType[] = getSelectedTriplets([selectedOption]);
    setPreDefinedPattern(selectedTriplets.map((t) => t.label));
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(selectedTriplets);
    setPreDefinedNodes(nodeLabelOptions);
    setPreDefinedRels(relationshipTypeOptions);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handlePreDefinedSchemaApply = async () => {
    const [newSourceOptions, newTargetOptions, newTypeOptions] = await updateSourceTargetTypeOptions({
      patterns: preDefinedPattern.map((label) => ({ label, value: label })),
      currentSourceOptions: sourceOptions,
      currentTargetOptions: targetOptions,
      currentTypeOptions: typeOptions,
      setSourceOptions,
      setTargetOptions,
      setTypeOptions,
    });
    onApply(preDefinedPattern, preDefinedNodes, preDefinedRels, newSourceOptions, newTargetOptions, newTypeOptions);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPreDefOption(null);
    setPreDefinedPattern([]);
    setPreDefinedNodes([]);
    setPreDefinedRels([]);
    onClose();
  };

  return (
    <>
      <Dialog
        size='medium'
        isOpen={open}
        onClose={() => {
          handleCancel();
        }}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header>Entity Graph Extraction Settings</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-6 p-6'>
          <div className='text-center'>
            <h5 className='text-lg font-semibold'>{appLabels.predefinedSchema}</h5>
          </div>
          <Select
            helpText='Schema Examples'
            label='Predefined Schema'
            size='medium'
            selectProps={{
              isClearable: true,
              options: defaultExamples,
              onChange: onChangeSchema,
              value: selectedPreDefOption,
              menuPosition: 'fixed',
            }}
            type='select'
          />
          <PatternContainer
            pattern={preDefinedPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            nodes={preDefinedNodes}
            rels={preDefinedRels}
          />
          <Dialog.Actions className='n-flex n-justify-end n-gap-token-4 pt-4'>
            <Button onClick={handleCancel} isDisabled={preDefinedPattern.length === 0}>
              Cancel
            </Button>
            <Button onClick={handlePreDefinedSchemaApply} isDisabled={preDefinedPattern.length === 0}>
              Apply
            </Button>
          </Dialog.Actions>
        </Dialog.Content>
      </Dialog>
      {openGraphView && (
        <SchemaViz
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={preDefinedNodes ?? []}
          relationshipValues={preDefinedRels ?? []}
        />
      )}
    </>
  );
};
export default PredefinedSchemaDialog;
