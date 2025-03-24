import React from 'react';
import { Select, Tag } from '@neo4j-ndl/react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { OptionType, TupleCreationProps } from '../../../../types';
import { appLabels } from '../../../../utils/Constants';
type PatternOption = {
  label: string;
  value: string;
};
// const availablePatterns: string[] = [
//     '(:Person)-[:KNOWS]->(:Person)',
//     '(:Person)-[:WORKS_FOR]->(:Company)',
//     '(:Company)-[:OWNS]->(:Product)',
//     '(:Person)-[:MANAGES]->(:Project)',
// ];
const sourceOptions: PatternOption[] = [
  { label: 'Person', value: 'Person' },
];
const typeOptions: PatternOption[] = [
  { label: 'WORKS_FOR', value: 'WORKS_FOR' },
];
const targetOptions: PatternOption[] = [
  { label: 'Company', value: 'Company' },
];
const TupleCreation: React.FC<TupleCreationProps> = ({
  defaultExamples,
  onChangeSchema,
  selectedSchemas,
  selectedSource,
  selectedType,
  selectedTarget,
  onPatternChange,
  selectedPatterns,
  onAddPattern,
  onRemovePattern,
}) => {
  return (
    <div className='bg-white rounded-lg shadow-md'>
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
            onChange: (selected) => onPatternChange(selected as OptionType, selectedType, selectedTarget),
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
            onChange: (selected) => onPatternChange(selectedSource, selected as OptionType, selectedTarget),
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
            onChange: (selected) => onPatternChange(selectedSource, selectedType, selected as OptionType),
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
          disabled={!selectedSource || !selectedType || !selectedTarget}
        >
          + Add
        </ButtonWithToolTip>
      </div>
      {selectedPatterns.length > 0 && (
        <div className='h-full'>
          <div className='flex align-self-center justify-center border'>
            <h5>{appLabels.selectedPatterns}</h5>
          </div>
          <div className='flex flex-wrap gap-2 mt-4'>
            {selectedPatterns.map((pattern) => (
              <Tag
                key={pattern}
                onRemove={() => onRemovePattern(pattern)}
                isRemovable={true}
                type='default'
                size='medium'
                className='rounded-full px-4 py-1 shadow-sm'
              >
                {pattern}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default TupleCreation;
