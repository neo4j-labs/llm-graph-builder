import { Checkbox, Dialog, TextArea, Button } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { getNodeLabelsAndRelTypesFromText } from '../../../../services/SchemaFromTextAPI';
import { useFileContext } from '../../../../context/UsersFiles';
import { buttonCaptions } from '../../../../utils/Constants';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { showNormalToast } from '../../../../utils/Toasts';
import PatternContainer from './PatternContainer';
import { OptionType, TupleType } from '../../../../types';
import SchemaViz from '../../../Graph/SchemaViz';
import { extractOptions, updateSourceTargetTypeOptions } from '../../../../utils/Utils';

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

const SchemaFromTextDialog = ({ open, onClose, onApply }: SchemaFromTextProps) => {
  const [userText, setUserText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSchemaText, setIsSchemaText] = useState<boolean>(false);
  const { model } = useFileContext();
  const {
    schemaValNodes,
    setSchemaValNodes,
    schemaValRels,
    setSchemaValRels,
    schemaTextPattern,
    setSchemaTextPattern,
    sourceOptions,
    setSourceOptions,
    targetOptions,
    setTargetOptions,
    typeOptions,
    setTypeOptions,
  } = useFileContext();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');

  const clickHandler = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNodeLabelsAndRelTypesFromText(model, userText, isSchemaText, false);
      setLoading(false);
      const { status, message, data } = response.data;
      if (status === 'Success' && data?.triplets?.length) {
        const schemaData: string[] = data.triplets;
        const schemaTuples: TupleType[] = schemaData
          .map((item: string) => {
            const matchResult = item.match(/^(.+?)-([A-Z_]+)->(.+)$/);
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
        setSchemaValNodes(nodeLabelOptions);
        setSchemaValRels(relationshipTypeOptions);
        setSchemaTextPattern(schemaTuples.map((t) => t.label));
      } else if (status === 'Failed') {
        showNormalToast(message as string);
      } else {
        showNormalToast('Please provide meaningful text.');
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Error processing schema:', error);
      showNormalToast(error?.message || 'Unexpected error occurred.');
    }
  }, [model, userText, isSchemaText]);

  const handleRemovePattern = (pattern: string) => {
    const updatedPatterns = schemaTextPattern.filter((p) => p !== pattern);
    if (updatedPatterns.length === 0) {
      setSchemaTextPattern([]);
      setSchemaValNodes([]);
      setSchemaValRels([]);
      setUserText('');
      return;
    }
    // Otherwise, recalculate nodes and rels from updated patterns
    const updatedTuples: TupleType[] = updatedPatterns
      .map((item: string) => {
        const matchResult = item.match(/^(.+?)-\[:([A-Z_]+)\]->(.+)$/);
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
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(updatedTuples);
    setSchemaTextPattern(updatedPatterns);
    setSchemaValNodes(nodeLabelOptions);
    setSchemaValRels(relationshipTypeOptions);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handleSchemaTextApply = async () => {
    if (onApply) {
      const [newSourceOptions, newTargetOptions, newTypeOptions] = await updateSourceTargetTypeOptions({
        patterns: schemaTextPattern.map((label) => ({ label, value: label })),
        currentSourceOptions: sourceOptions,
        currentTargetOptions: targetOptions,
        currentTypeOptions: typeOptions,
        setSourceOptions,
        setTargetOptions,
        setTypeOptions,
      });
      onApply(schemaTextPattern, schemaValNodes, schemaValRels, newSourceOptions, newTargetOptions, newTypeOptions);
    }
    onClose();
  };

  const handleCancel = () => {
    setSchemaValNodes([]);
    setSchemaValRels([]);
    setSchemaTextPattern([]);
    setUserText('');
    setIsSchemaText(false);
    onClose();
  };

  return (
    <>
      <Dialog
        size='medium'
        isOpen={open}
        onClose={() => {
          setLoading(false);
          handleCancel();
        }}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header>Entity Graph Extraction Settings</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <TextArea
            helpText='Analyze the text to extract Entities'
            label='Document Text'
            style={{
              resize: 'vertical',
            }}
            isFluid={true}
            value={userText}
            htmlAttributes={{
              onChange: (e) => {
                const textVal = e.target.value;
                setUserText(textVal);
                setSchemaTextPattern([]);
                setSchemaValNodes([]);
                setSchemaValRels([]);
              },
            }}
            size='large'
          />
          <div className='flex justify-between mt-4'>
            <Checkbox
              label='Text is schema description'
              onChange={(e) => {
                setIsSchemaText(e.target.checked);
              }}
              isChecked={isSchemaText}
            />
            <ButtonWithToolTip
              placement='top'
              label='Analyze button'
              text={userText.trim() === '' ? 'please fill the text to extract graph schema' : 'Analyze text for schema'}
              loading={loading}
              disabled={userText.trim() === '' || loading}
              onClick={clickHandler}
            >
              {buttonCaptions.analyze}
            </ButtonWithToolTip>
          </div>
          {schemaTextPattern.length > 0 && (
            <>
              <div className='mt-6'>
                <PatternContainer
                  pattern={schemaTextPattern}
                  handleRemove={handleRemovePattern}
                  handleSchemaView={handleSchemaView}
                  nodes={schemaValNodes}
                  rels={schemaValRels}
                />
              </div>
              <Dialog.Actions className='mt-3'>
                <Button onClick={handleCancel} isDisabled={schemaTextPattern.length === 0}>
                  Cancel
                </Button>
                <Button onClick={handleSchemaTextApply} isDisabled={schemaTextPattern.length === 0}>
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
          nodeValues={(schemaValNodes as OptionType[]) ?? []}
          relationshipValues={schemaValRels ?? []}
        />
      )}
    </>
  );
};
export default SchemaFromTextDialog;
