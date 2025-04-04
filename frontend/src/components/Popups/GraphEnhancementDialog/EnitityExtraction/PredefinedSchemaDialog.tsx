import { Dialog, Button, Select } from '@neo4j-ndl/react';
import { useState, useMemo } from 'react';
import PatternContainer from '../../GraphEnhancementDialog/EnitityExtraction/PatternContainer';
import { OptionType, TupleType } from '../../../../types';
import { updateLocalStorage, extractOptions, getSelectedTriplets } from '../../../../utils/Utils';
import SchemaViz from '../../../../components/Graph/SchemaViz';
import { getDefaultSchemaExamples } from '../../../../utils/Constants';
import { useCredentials } from '../../../../context/UserCredentials';
import { appLabels } from '../../../../utils/Constants';
import { useFileContext } from '../../../../context/UsersFiles';

interface SchemaFromTextProps {
  open: boolean;
  onClose: () => void;
  onApply: (patterns: string[], nodes: OptionType[], rels: OptionType[], view: string) => void;
}

const PredefinedSchemaDialog = ({ open, onClose, onApply }: SchemaFromTextProps) => {
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);
  const { userCredentials } = useCredentials();
  const {
    setPreDefinedPattern,
    preDefinedPattern,
    preDefinedNodes,
    setPreDefinedNodes,
    preDefinedRels,
    setPreDefinedRels,
  } = useFileContext();
  const [selectedPreDefOption, setSelectedPreDefOption] = useState<readonly OptionType[]>([]);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');

  const handleRemovePattern = (patternToRemove: string) => {
    setPreDefinedPattern((prevPatterns) => prevPatterns.filter((p) => p !== patternToRemove));
  };

  const onChangeSchema = (selectedOptions: readonly OptionType[], actionMeta: any) => {
    if (actionMeta.action === 'remove-value') {
      const removedSchema = JSON.parse(actionMeta.removedValue.value);
      setPreDefinedPattern((prev) => prev.filter((p) => !removedSchema.includes(p)));
    } else if (actionMeta.action === 'clear') {
      setPreDefinedPattern([]);
      setPreDefinedNodes([]);
      setPreDefinedRels([]);
    } else {
      const selectedTriplets: TupleType[] = getSelectedTriplets(selectedOptions);
      setPreDefinedPattern(selectedTriplets.map((t) => t.label));
      const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(selectedTriplets);
      setPreDefinedNodes(nodeLabelOptions);
      setPreDefinedRels(relationshipTypeOptions);
    }
    setSelectedPreDefOption(selectedOptions);
  };

  const handleSchemaView = () => {
    if (preDefinedPattern.length > 0 && preDefinedNodes.length > 0 && preDefinedRels.length > 0) {
      setOpenGraphView(true);
      setViewPoint('showSchemaView');
    }
  };

  const handlePreDefinedSchemaApply = () => {
    onApply(preDefinedPattern, preDefinedNodes, preDefinedRels, 'preDefined');
    updateLocalStorage(userCredentials!, 'preDefinedNodeLabels', preDefinedNodes);
    updateLocalStorage(userCredentials!, 'preDefinedRelationshipLabels', preDefinedRels);
    updateLocalStorage(userCredentials!, 'preDefinedPatterns', preDefinedPattern);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPreDefOption([]);
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
          onClose();
          setPreDefinedPattern([]);
          setPreDefinedNodes([]);
          setPreDefinedRels([]);
        }}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header>Entity Graph Extraction Settings</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <>
            <div className='flex align-self-center justify-center'>
              <h5>{appLabels.predefinedSchema}</h5>
            </div>
            <Select
              helpText='Schema Examples'
              label='Predefined Schema'
              size='medium'
              selectProps={{
                isClearable: true,
                isMulti: true,
                options: defaultExamples,
                onChange: onChangeSchema,
                value: selectedPreDefOption,
                menuPosition: 'fixed',
              }}
              type='select'
            />
          </>
          {preDefinedPattern.length > 0 && (
            <>
              <div className='mt-6'>
                <PatternContainer
                  pattern={preDefinedPattern}
                  handleRemove={handleRemovePattern}
                  handleSchemaView={handleSchemaView}
                  nodes={preDefinedNodes}
                  rels={preDefinedRels}
                />
              </div>
              <Dialog.Actions className='mt-3'>
                <Button onClick={handleCancel} isDisabled={preDefinedPattern.length === 0}>
                  Cancel
                </Button>
                <Button onClick={handlePreDefinedSchemaApply} isDisabled={preDefinedPattern.length === 0}>
                  Apply
                </Button>
              </Dialog.Actions>
            </>
          )}
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
