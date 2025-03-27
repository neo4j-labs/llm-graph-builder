import { Select } from '@neo4j-ndl/react';
import { OptionType } from '../../../../types';
import { OnChangeValue, ActionMeta } from 'react-select';
import { appLabels } from '../../../../utils/Constants';

interface SchemaSelectorProps {
    nodeLabelOptions: readonly OptionType[];
    relationshipTypeOptions:readonly OptionType[];
    selectedNodes: readonly OptionType[];
    selectedRels: readonly OptionType[];
    loading: boolean;
    relationshipMode: 'list' | 'tuple';
    onChangenodes: (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => void;
    onChangerels: (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => void;
    isTablet: boolean;
    defaultExamples:OptionType[];
    onChangeSchema: (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => void;
    selectedSchemas: readonly OptionType[];
}
const PreDefineSchema = ({
    nodeLabelOptions,
    relationshipTypeOptions,
    selectedNodes,
    selectedRels,
    loading,
    relationshipMode,
    onChangenodes,
    onChangerels,
    isTablet,
    defaultExamples,
    onChangeSchema,
    selectedSchemas
}: SchemaSelectorProps) => {
    return (
        <>
            <div className='mt-4'>
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
                        value: selectedSchemas,
                        menuPosition: 'fixed',
                    }}
                    type='select'
                />
                <div className='flex align-self-center justify-center'>
                    <h5>{appLabels.ownSchema}</h5>
                </div>
                <Select
                    helpText='You can select more than one values'
                    label='Node Labels'
                    size='medium'
                    selectProps={{
                        isClearable: true,
                        isMulti: true,
                        options: relationshipMode === 'list' ? nodeLabelOptions : [],
                        onChange: onChangenodes,
                        value: selectedNodes,
                        isDisabled: loading,
                        classNamePrefix: `${isTablet ? 'tablet_entity_extraction_Tab_node_label' : 'entity_extraction_Tab_node_label'
                            }`,
                    }}
                    type='select'
                />
                <Select
                    helpText='You can select or add relationship types'
                    label='Relationship Types'
                    size='medium'
                    selectProps={{
                        isClearable: true,
                        isMulti: true,
                        options: relationshipMode === 'list' ? relationshipTypeOptions : [],
                        onChange: onChangerels,
                        value: selectedRels,
                        isDisabled: loading,
                        classNamePrefix: `${isTablet ? 'tablet_entity_extraction_Tab_relationship_label' : 'entity_extraction_Tab_relationship_label'
                            }`,
                    }}
                    type='select'
                />
            </div>
        </>
    );
};
export default PreDefineSchema;