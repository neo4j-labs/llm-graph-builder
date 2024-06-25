import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox, Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, OptionTypeForExamples, schema } from '../types';
import { getNodeLabelsAndRelTypes } from '../services/GetNodeLabelsRelTypes';
import { useCredentials } from '../context/UserCredentials';
import schemaExamples from '../assets/schemas.json';
import ButtonWithToolTip from '../components/ButtonWithToolTip';
import { tooltips } from '../utils/Constants';

interface DefaultSettings {
    setSelectedRels: React.Dispatch<React.SetStateAction<readonly OptionType[]>>;
    setSelectedNodes: React.Dispatch<React.SetStateAction<readonly OptionType[]>>;
    selectedNodes: OptionType[];
    selectedRels: OptionType[];
    selectedSchemas: OptionType[];
    setSelectedSchemas: React.Dispatch<React.SetStateAction<readonly OptionType[]>>;
    isSchema: boolean;
    setIsSchema: React.Dispatch<React.SetStateAction<boolean>>;
}
interface UseSettingsModalProps {
    open: boolean;
    onClose: () => void;
    opneTextSchema: () => void;
    defaultSettings: DefaultSettings;
}

const useSettingsModal = ({ open, onClose, opneTextSchema, defaultSettings }: UseSettingsModalProps) => {
    const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas, isSchema, setIsSchema } = defaultSettings;
    const { userCredentials } = useCredentials();
    const [loading, setLoading] = useState<boolean>(false);
    const [nodeLabelOptions, setNodeLabelOptions] = useState<OptionType[]>([]);
    const [relationshipTypeOptions, setRelationshipTypeOptions] = useState<OptionType[]>([]);
    const [defaultExamples, setDefaultExamples] = useState<OptionType[]>([]);
    useEffect(() => {
        const parsedData = schemaExamples.reduce((accu: OptionTypeForExamples[], example) => {
            const exampleValues: OptionTypeForExamples = {
                label: example.schema,
                value: JSON.stringify({
                    nodelabels: example.labels,
                    relationshipTypes: example.relationshipTypes,
                }),
            };
            accu.push(exampleValues);
            return accu;
        }, []);
        setDefaultExamples(parsedData);
    }, []);
    useEffect(() => {
        if (userCredentials && open) {
            const getOptions = async () => {
                setLoading(true);
                try {
                    const response = await getNodeLabelsAndRelTypes(userCredentials);
                    setLoading(false);
                    if (response.data.data.length) {
                        const nodeLabels = response.data.data[0].labels.map((l: string) => ({ value: l, label: l }));
                        const relTypes = response.data.data[0].relationshipTypes.map((t: string) => ({ value: t, label: t }));
                        setNodeLabelOptions(nodeLabels);
                        setRelationshipTypeOptions(relTypes);
                    }
                } catch (error) {
                    setLoading(false);
                    console.log(error);
                }
            };
            getOptions();
        }
    }, [userCredentials, open]);

    const removeNodesAndRels = (nodelabels: string[], relationshipTypes: string[]) => {
        const labelsToRemoveSet = new Set(nodelabels);
        const relationshipLabelsToRemoveSet = new Set(relationshipTypes);
        setSelectedNodes((prevState) => {
            const filteredNodes = prevState.filter((item) => !labelsToRemoveSet.has(item.label));
            localStorage.setItem(
                'selectedNodeLabels',
                JSON.stringify({ db: userCredentials?.uri, selectedOptions: filteredNodes })
            );
            return filteredNodes;
        });
        setSelectedRels((prevState) => {
            const filteredRels = prevState.filter((item) => !relationshipLabelsToRemoveSet.has(item.label));
            localStorage.setItem(
                'selectedRelationshipLabels',
                JSON.stringify({ db: userCredentials?.uri, selectedOptions: filteredRels })
            );
            return filteredRels;
        });
    };
    const onChangeSchema = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
        if (actionMeta.action === 'remove-value') {
            const removedSchema: schema = JSON.parse(actionMeta.removedValue.value);
            const { nodelabels, relationshipTypes } = removedSchema;
            removeNodesAndRels(nodelabels, relationshipTypes);
        } else if (actionMeta.action === 'clear') {
            const removedSchemas = actionMeta.removedValues.map((s) => JSON.parse(s.value));
            const removedNodeLabels = removedSchemas.map((s) => s.nodelabels).flat();
            const removedRelations = removedSchemas.map((s) => s.relationshipTypes).flat();
            removeNodesAndRels(removedNodeLabels, removedRelations);
        }
        setSelectedSchemas(selectedOptions);
        const nodesFromSchema = selectedOptions.map((s) => JSON.parse(s.value).nodelabels).flat();
        const relationsFromSchema = selectedOptions.map((s) => JSON.parse(s.value).relationshipTypes).flat();
        let nodeOptionsFromSchema: OptionType[] = [];
        nodesFromSchema.forEach((n) => nodeOptionsFromSchema.push({ label: n, value: n }));
        let relationshipOptionsFromSchema: OptionType[] = [];
        relationsFromSchema.forEach((r) => relationshipOptionsFromSchema.push({ label: r, value: r }));
        setSelectedNodes((prev) => {
            const combinedData = [...prev, ...nodeOptionsFromSchema];
            const uniqueLabels = new Set();
            const updatedOptions = combinedData.filter((item) => {
                if (!uniqueLabels.has(item.label)) {
                    uniqueLabels.add(item.label);
                    return true;
                }
                return false;
            });
            localStorage.setItem(
                'selectedNodeLabels',
                JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
            );
            return updatedOptions;
        });
        setSelectedRels((prev) => {
            const combinedData = [...prev, ...relationshipOptionsFromSchema];
            const uniqueLabels = new Set();
            const updatedOptions = combinedData.filter((item) => {
                if (!uniqueLabels.has(item.label)) {
                    uniqueLabels.add(item.label);
                    return true;
                }
                return false;
            });
            localStorage.setItem(
                'selectedRelationshipLabels',
                JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
            );
            return updatedOptions;
        });
    };
    const onChangeNodes = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
        if (actionMeta.action === 'clear') {
            localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
        }
        setSelectedNodes(selectedOptions);
        localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
    };
    const onChangeRels = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
        if (actionMeta.action === 'clear') {
            localStorage.setItem(
                'selectedRelationshipLabels',
                JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
            );
        }
        setSelectedRels(selectedOptions);
        localStorage.setItem('selectedRelationshipLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
    };
    const clickHandler = useCallback(() => {
        setSelectedSchemas([]);
        setSelectedNodes(nodeLabelOptions);
        setSelectedRels(relationshipTypeOptions);
    }, [nodeLabelOptions, relationshipTypeOptions]);

    const settingsModal = createPortal(
        <Dialog size='large' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
            <Dialog.Header id='form-dialog-title'>Entity Graph Extraction Settings</Dialog.Header>
            <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
                <Dropdown
                    helpText='Schema Examples'
                    label='Predefined Schema'
                    selectProps={{
                        isClearable: true,
                        isMulti: true,
                        options: defaultExamples,
                        onChange: onChangeSchema,
                        value: selectedSchemas,
                        menuPosition: 'fixed',
                    }}
                    type='creatable'
                />
                <Dropdown
                    helpText='You can select more than one values'
                    label='Node Labels'
                    selectProps={{
                        isClearable: true,
                        isMulti: true,
                        options: nodeLabelOptions,
                        onChange: onChangeNodes,
                        value: selectedNodes,
                        classNamePrefix: 'node_label',
                    }}
                    type='creatable'
                />
                <Dropdown
                    helpText='You can select more than one values'
                    label='Relationship Types'
                    selectProps={{
                        isClearable: true,
                        isMulti: true,
                        options: relationshipTypeOptions,
                        onChange: onChangeRels,
                        value: selectedRels,
                        classNamePrefix: 'relationship_label',
                    }}
                    type='creatable'
                />
                <Dialog.Actions className='!mt-4 flex items-center'>
                    <Checkbox
                        label="Set Schema for all files"
                        onChange={(e) => {
                            setIsSchema(e.target.checked);
                        }}
                        checked={isSchema}
                    />
                    <ButtonWithToolTip
                        loading={loading}
                        text={
                            !nodeLabelOptions.length && !relationshipTypeOptions.length
                                ? `No Labels Found in the Database`
                                : tooltips.useExistingSchema
                        }
                        disabled={!nodeLabelOptions.length && !relationshipTypeOptions.length}
                        onClick={clickHandler}
                        label='Use Existing Schema'
                        placement='top'
                    >
                        Use Existing Schema
                    </ButtonWithToolTip>
                    <ButtonWithToolTip
                        text={tooltips.createSchema}
                        placement='top'
                        onClick={() => {
                            onClose();
                            opneTextSchema();
                        }}
                        label='Get Existing Schema From Text'
                    >
                        Get Schema From Text
                    </ButtonWithToolTip>
                    {isSchema && (
                        <ButtonWithToolTip
                            text={tooltips.continue}
                            placement='top'
                            onClick={() => {
                                console.log('continue');
                            }}
                            label='Continue to extract'
                        >
                            Continue
                        </ButtonWithToolTip>
                    )}
                </Dialog.Actions>
            </Dialog.Content>
        </Dialog>,
        document.getElementById('root')!
    );
    return { settingsModal, defaultSettings };
};
export default useSettingsModal;