import { useEffect, useState } from 'react';
import SchemaSelectionDialog from '../../../UI/SchemaSelectionPopup';
import { getSchemaWithProperties } from '../../../../services/GetSchemaWithProperties';
import { OptionType, TupleType } from '../../../../types';
import { extractOptions, updateSourceTargetTypeOptions } from '../../../../utils/Utils';
import { useFileContext } from '../../../../context/UsersFiles';
import SchemaViz from '../../../../components/Graph/SchemaViz';

interface LoadDBSchemaWithPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (
    patterns: string[],
    nodeLabels: OptionType[],
    relationshipLabels: OptionType[],
    updatedSource: OptionType[],
    updatedTarget: OptionType[],
    updatedType: OptionType[],
    nodeProperties: Record<string, string[]>,
    relProperties: Record<string, string[]>
  ) => void;
}

const LoadDBSchemaWithPropertiesDialog = ({ open, onClose, onApply }: LoadDBSchemaWithPropertiesDialogProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const {
    dbWithPropsPattern,
    setDbWithPropsPattern,
    dbWithPropsNodes,
    setDbWithPropsNodes,
    dbWithPropsRels,
    setDbWithPropsRels,
    dbNodeProperties,
    setDbNodeProperties,
    dbRelProperties,
    setDbRelProperties,
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
      const response = await getSchemaWithProperties();
      const schemaData: string[] = response.data.data.triplets;
      const nodeProps = response.data.data.nodeProperties || {};
      const relProps = response.data.data.relationshipProperties || {};
      if (!schemaData || schemaData.length === 0) {
        setDbWithPropsNodes([]);
        setDbWithPropsRels([]);
        setDbWithPropsPattern([]);
        setDbNodeProperties({});
        setDbRelProperties({});
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
      setDbWithPropsNodes(nodeLabelOptions);
      setDbWithPropsRels(relationshipTypeOptions);
      setDbWithPropsPattern(schemaTuples.map((t) => t.label));
      setDbNodeProperties(nodeProps);
      setDbRelProperties(relProps);
    } catch (error) {
      console.error('Error fetching schema with properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePattern = (patternToRemove: string) => {
    const updatedPatterns = dbWithPropsPattern.filter((p) => p !== patternToRemove);
    if (updatedPatterns.length === 0) {
      setDbWithPropsPattern([]);
      setDbWithPropsNodes([]);
      setDbWithPropsRels([]);
      setDbNodeProperties({});
      setDbRelProperties({});
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
    setDbWithPropsPattern(updatedPatterns);
    setDbWithPropsNodes(nodeLabelOptions);
    setDbWithPropsRels(relationshipTypeOptions);
    // Prune properties for labels/rel-types that no longer have any pattern in scope
    const remainingLabels = new Set(nodeLabelOptions.map((n) => n.value));
    const remainingRels = new Set(relationshipTypeOptions.map((r) => r.value.split(',')[1]));
    setDbNodeProperties(Object.fromEntries(Object.entries(dbNodeProperties).filter(([k]) => remainingLabels.has(k))));
    setDbRelProperties(Object.fromEntries(Object.entries(dbRelProperties).filter(([k]) => remainingRels.has(k))));
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  const handleDBCheck = async () => {
    const [newSourceOptions, newTargetOptions, newTypeOptions] = await updateSourceTargetTypeOptions({
      patterns: dbWithPropsPattern.map((label) => ({ label, value: label })),
      currentSourceOptions: sourceOptions,
      currentTargetOptions: targetOptions,
      currentTypeOptions: typeOptions,
      setSourceOptions,
      setTargetOptions,
      setTypeOptions,
    });
    onApply(
      dbWithPropsPattern,
      dbWithPropsNodes,
      dbWithPropsRels,
      newSourceOptions,
      newTargetOptions,
      newTypeOptions,
      dbNodeProperties,
      dbRelProperties
    );
    onClose();
  };

  const handleCancel = () => {
    setDbWithPropsPattern([]);
    setDbWithPropsNodes([]);
    setDbWithPropsRels([]);
    setDbNodeProperties({});
    setDbRelProperties({});
    onClose();
  };

  return (
    <>
      <SchemaSelectionDialog
        open={open}
        onClose={handleCancel}
        pattern={dbWithPropsPattern}
        handleRemove={handleRemovePattern}
        handleSchemaView={handleSchemaView}
        loading={loading}
        onApply={handleDBCheck}
        onCancel={handleCancel}
        nodes={dbWithPropsNodes}
        rels={dbWithPropsRels}
        message={message}
        nodeProperties={dbNodeProperties}
        relProperties={dbRelProperties}
      />
      {openGraphView && (
        <SchemaViz
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={(dbWithPropsNodes as OptionType[]) ?? []}
          relationshipValues={dbWithPropsRels ?? []}
        />
      )}
    </>
  );
};

export default LoadDBSchemaWithPropertiesDialog;
