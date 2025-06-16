import { useEffect, useState } from 'react';
import SchemaSelectionDialog from '../../../UI/SchemaSelectionPopup';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { OptionType, TupleType } from '../../../../types';
import { extractOptions, updateSourceTargetTypeOptions } from '../../../../utils/Utils';
import { useFileContext } from '../../../../context/UsersFiles';
import SchemaViz from '../../../../components/Graph/SchemaViz';

interface LoadDBSchemaDialogProps {
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
const LoadDBSchemaDialog = ({ open, onClose, onApply }: LoadDBSchemaDialogProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const {
    dbPattern,
    setDbPattern,
    dbNodes,
    setDbNodes,
    dbRels,
    setDbRels,
    sourceOptions,
    setSourceOptions,
    targetOptions,
    setTargetOptions,
    typeOptions,
    setTypeOptions,
  } = useFileContext();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (open) {
      getOptions();
    }
  }, [open]);

  const getOptions = async () => {
    setLoading(true);
    try {
      const response = await getNodeLabelsAndRelTypes();
      const schemaData: string[] = response.data.data.triplets;
      if (!schemaData || schemaData.length === 0) {
        setDbNodes([]);
        setDbRels([]);
        setDbPattern([]);
        setMessage('No data found');
        return;
      }
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
      setDbNodes(nodeLabelOptions);
      setDbRels(relationshipTypeOptions);
      setDbPattern(schemaTuples.map((t) => t.label));
    } catch (error) {
      console.error('Error fetching schema options:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleRemovePattern = (patternToRemove: string) => {
    const updatedPatterns = dbPattern.filter((p) => p !== patternToRemove);
    if (updatedPatterns.length === 0) {
      setDbPattern([]);
      setDbNodes([]);
      setDbRels([]);
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
    setDbPattern(updatedPatterns);
    setDbNodes(nodeLabelOptions);
    setDbRels(relationshipTypeOptions);
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handleDBCheck = async () => {
    const [newSourceOptions, newTargetOptions, newTypeOptions] = await updateSourceTargetTypeOptions({
      patterns: dbPattern.map((label) => ({ label, value: label })),
      currentSourceOptions: sourceOptions,
      currentTargetOptions: targetOptions,
      currentTypeOptions: typeOptions,
      setSourceOptions,
      setTargetOptions,
      setTypeOptions,
    });
    onApply(dbPattern, dbNodes, dbRels, newSourceOptions, newTargetOptions, newTypeOptions);
    onClose();
  };

  const handleCancel = () => {
    setDbPattern([]);
    setDbNodes([]);
    setDbRels([]);
    onClose();
  };
  return (
    <>
      <SchemaSelectionDialog
        open={open}
        onClose={handleCancel}
        pattern={dbPattern}
        handleRemove={handleRemovePattern}
        handleSchemaView={handleSchemaView}
        loading={loading}
        onApply={handleDBCheck}
        onCancel={handleCancel}
        nodes={dbNodes}
        rels={dbRels}
        message={message}
      />
      {openGraphView && (
        <SchemaViz
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={(dbNodes as OptionType[]) ?? []}
          relationshipValues={dbRels ?? []}
        />
      )}
    </>
  );
};

export default LoadDBSchemaDialog;
