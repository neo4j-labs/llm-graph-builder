import { Button, Dialog } from '@neo4j-ndl/react';
import { useState } from 'react';
import { OptionType, TupleType } from '../../../../types';
import { extractOptions, updateSourceTargetTypeOptions } from '../../../../utils/Utils';
import { useFileContext } from '../../../../context/UsersFiles';
import ImporterInput from './ImporterInput';
import SchemaViz from '../../../Graph/SchemaViz';
import PatternContainer from './PatternContainer';
import UploadJsonData from './UploadJsonData';

interface DataImporterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (
    patterns: string[],
    nodeLabels: OptionType[],
    relationshipLabels: OptionType[],
    updatedSource: OptionType[],
    updatedTarget: OptionType[],
    updatedType: OptionType[]
  ) => void;
}

const DataImporterSchemaDialog = ({ open, onClose, onApply }: DataImporterDialogProps) => {
  const {
    importerPattern,
    setImporterPattern,
    importerNodes,
    setImporterNodes,
    importerRels,
    setImporterRels,
    sourceOptions,
    setSourceOptions,
    targetOptions,
    setTargetOptions,
    typeOptions,
    setTypeOptions,
  } = useFileContext();

  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');
  const handleCancel = () => {
    onClose();
    setImporterPattern([]);
    setImporterNodes([]);
    setImporterRels([]);
  };

  const handleImporterCheck = async () => {
    const [newSourceOptions, newTargetOptions, newTypeOptions] = await updateSourceTargetTypeOptions({
      patterns: importerPattern.map((label) => ({ label, value: label })),
      currentSourceOptions: sourceOptions,
      currentTargetOptions: targetOptions,
      currentTypeOptions: typeOptions,
      setSourceOptions,
      setTargetOptions,
      setTypeOptions,
    });
    onApply(importerPattern, importerNodes, importerRels, newSourceOptions, newTargetOptions, newTypeOptions);
    onClose();
  };

  const handleRemovePattern = (patternToRemove: string) => {
    const updatedPatterns = importerPattern.filter((p) => p !== patternToRemove);
    if (updatedPatterns.length === 0) {
      setImporterPattern([]);
      setImporterNodes([]);
      setImporterRels([]);
      return;
    }
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
    setImporterPattern(updatedPatterns);
    setImporterNodes(nodeLabelOptions);
    setImporterRels(relationshipTypeOptions);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  return (
    <>
      <Dialog isOpen={open} onClose={handleCancel}>
        <Dialog.Header>JSON Data Graph Extraction Settings</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-6 p-6'>
          <ImporterInput />
          <UploadJsonData
            onSchemaExtracted={({ nodeLabels, relationshipTypes, relationshipObjectTypes, nodeObjectTypes }) => {
              const nodeLabelMap = Object.fromEntries(nodeLabels.map((n) => [n.$id, n.token]));
              const relTypeMap = Object.fromEntries(relationshipTypes.map((r) => [r.$id, r.token]));
              const nodeIdToLabel: Record<string, string> = {};
              nodeObjectTypes.forEach((nodeObj: any) => {
                const labelRef = nodeObj.labels?.[0]?.$ref;
                if (labelRef && nodeLabelMap[labelRef.slice(1)]) {
                  nodeIdToLabel[nodeObj.$id] = nodeLabelMap[labelRef.slice(1)];
                }
              });

              const patterns = relationshipObjectTypes.map((relObj) => {
                const fromId = relObj.from.$ref.slice(1);
                const toId = relObj.to.$ref.slice(1);
                const relId = relObj.type.$ref.slice(1);
                const fromLabel = nodeIdToLabel[fromId] || 'source';
                const toLabel = nodeIdToLabel[toId] || 'target';
                const relLabel = relTypeMap[relId] || 'type';
                const pattern = `${fromLabel} -[:${relLabel}]-> ${toLabel}`;
                return pattern;
              });

              const importerTuples = patterns
                .map((p) => {
                  const match = p.match(/^(.+?) -\[:(.+?)\]-> (.+)$/);
                  if (!match) {
                    return null;
                  }
                  const [_, source, type, target] = match;
                  return {
                    label: `${source} -[:${type}]-> ${target}`,
                    value: `${source},${type},${target}`,
                    source,
                    target,
                    type,
                  };
                })
                .filter(Boolean) as TupleType[];
              const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(importerTuples);
              setImporterNodes(nodeLabelOptions);
              setImporterRels(relationshipTypeOptions);
              setImporterPattern(patterns);
            }}
          />
          <PatternContainer
            pattern={importerPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            nodes={importerNodes}
            rels={importerRels}
          />
          <Dialog.Actions className='n-flex n-justify-end n-gap-token-4 pt-4'>
            <Button onClick={handleCancel} isDisabled={importerPattern.length === 0}>
              Cancel
            </Button>
            <Button onClick={handleImporterCheck} isDisabled={importerPattern.length === 0}>
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
          nodeValues={importerNodes ?? []}
          relationshipValues={importerRels ?? []}
        />
      )}
    </>
  );
};

export default DataImporterSchemaDialog;
