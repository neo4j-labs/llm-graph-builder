import React from 'react';
import { Select } from '@neo4j-ndl/react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { OptionType, TupleCreationProps } from '../../../../types';
import { appLabels } from '../../../../utils/Constants';
type PatternOption = {
    label: string;
    value: string;
};
const sourceOptions: PatternOption[] = [
    { label: 'Person', value: 'Person' },
];
const typeOptions: PatternOption[] = [
    { label: 'WORKS_FOR', value: 'WORKS_FOR' },
];
const targetOptions: PatternOption[] = [
    { label: 'Company', value: 'Company' },
];
const GraphPattern: React.FC<TupleCreationProps> = ({
    selectedSource,
    selectedType,
    selectedTarget,
    onPatternChange,
    onAddPattern,
}) => {
    return (
        <div className='bg-white rounded-lg shadow-md'>
            <div className='flex align-self-center justify-center'>
                <h5>{appLabels.graphPatternTuple}</h5>
            </div>
            <div className='flex gap-4 items-end mb-6 mt-3 justify-between'>
                <Select
                    label='Select Source'
                    size='medium'
                    selectProps={{
                        isClearable: true,
                        isMulti: false,
                        options: sourceOptions,
                        onChange: (selected) => onPatternChange(selected as OptionType, selectedType as OptionType, selectedTarget as OptionType),
                        value: selectedSource,
                    }}
                    type='creatable'
                    className='w-1/4'
                />
                <Select
                    label='Select Type'
                    size='medium'
                    selectProps={{
                        isClearable: true,
                        isMulti: false,
                        options: typeOptions,
                        onChange: (selected) => onPatternChange(selectedSource as OptionType, selected as OptionType, selectedTarget as OptionType),
                        value: selectedType,
                    }}
                    type='creatable'
                    className='w-1/4'
                />
                <Select
                    label='Select Target'
                    size='medium'
                    selectProps={{
                        isClearable: true,
                        isMulti: false,
                        options: targetOptions,
                        onChange: (selected) => onPatternChange(selectedSource as OptionType, selectedType as OptionType, selected as OptionType),
                        value: selectedTarget,
                    }}
                    type='creatable'
                    className='w-1/4'
                />
                <ButtonWithToolTip
                    text='Add'
                    placement='top'
                    onClick={onAddPattern}
                    label='Add Values'
                    size='medium'
                    disabled={selectedSource?.value.length === 0 || selectedType?.value.length === 0 || selectedTarget?.value.length === 0}
                >
                    + Add
                </ButtonWithToolTip>
            </div>
        </div>
    );
};
export default GraphPattern;