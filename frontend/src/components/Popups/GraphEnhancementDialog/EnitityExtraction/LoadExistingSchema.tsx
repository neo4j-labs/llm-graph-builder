import { useEffect, useState } from 'react';
import SchemaSelectionDialog from '../../../UI/SchemaSelectionPopup';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { OptionType, TupleType } from '../../../../types';
import { extractOptions, updateLocalStorage } from '../../../../utils/Utils';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import SchemaViz from '../../../../components/Graph/SchemaViz';

interface LoadExistingSchemaDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (patterns: string[], nodeLabels: OptionType[], relationshipLabels: OptionType[], view: string) => void;
}
export default function LoadExistingSchemaDialog({
    open,
    onClose,
    onApply
}: LoadExistingSchemaDialogProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { userCredentials } = useCredentials();
    const { setDbPattern, dbPattern } = useFileContext();
    const [openGraphView, setOpenGraphView] = useState<boolean>(false);
    const [viewPoint, setViewPoint] = useState<string>('');
    const [dbNodeSchema, setDbNodeSchema] = useState<OptionType[]>([]);
    const [dbRelationshipSchema, setDbRelationshipSchema] = useState<OptionType[]>([]);
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
            setDbNodeSchema(nodeLabelOptions);
            setDbRelationshipSchema(relationshipTypeOptions);;
            setDbPattern(relationshipTypeOptions.map((rel) => rel.value));
            updateLocalStorage(userCredentials!!, 'selectedNodeLabels', nodeLabelOptions);
            updateLocalStorage(userCredentials!!, 'selectedRelationshipLabels', relationshipTypeOptions);
        } catch (error) {
            console.error('Error fetching schema options:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleRemovePattern = (patternToRemove: string) => {
        setDbPattern((prevPatterns) => prevPatterns.filter((p) => p !== patternToRemove));
    };
    const handleSchemaView = () => {
        setOpenGraphView(true);
        setViewPoint('showSchemaView');
    };

    const handleApply = () => {
        onApply(dbPattern, dbNodeSchema, dbRelationshipSchema, 'db')
        onClose();
    }

    const handleCancel = () => {
        setDbPattern([]);
        setDbNodeSchema([]);
        setDbRelationshipSchema([]);
        onClose();
    }
    return (
        <>
            <SchemaSelectionDialog
                open={open}
                onClose={onClose}
                pattern={dbPattern}
                handleRemove={handleRemovePattern}
                handleSchemaView={handleSchemaView}
                loading={loading}
                onApply={handleApply}
                onCancel={handleCancel}
            />
            {openGraphView && (
                <SchemaViz
                    open={openGraphView}
                    setGraphViewOpen={setOpenGraphView}
                    viewPoint={viewPoint}
                    nodeValues={(dbNodeSchema as OptionType[]) ?? []}
                    relationshipValues={(dbRelationshipSchema) ?? []}
                />
            )}
        </>

    );
}