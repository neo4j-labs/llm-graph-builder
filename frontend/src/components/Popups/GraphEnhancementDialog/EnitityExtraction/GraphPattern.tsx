import React, { useState, useRef } from 'react';
import { Select } from '@neo4j-ndl/react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { OptionType, TupleCreationProps } from '../../../../types';
import {
  appLabels,
  sourceOptions as initialSourceOptions,
  targetOptions as initialTargetOptions,
  typeOptions as initialTypeOptions,
} from '../../../../utils/Constants';

const GraphPattern: React.FC<TupleCreationProps> = ({
  selectedSource,
  selectedType,
  selectedTarget,
  onPatternChange,
  onAddPattern,
}) => {
  const [sourceOptions, setSourceOptions] = useState<OptionType[]>(initialSourceOptions);
  const [typeOptions, setTypeOptions] = useState<OptionType[]>(initialTypeOptions);
  const [targetOptions, setTargetOptions] = useState<OptionType[]>(initialTargetOptions);
  const [inputValues, setInputValues] = useState<{ source: string; type: string; target: string }>({
    source: '',
    type: '',
    target: '',
  });
  const sourceRef = useRef<HTMLDivElement | null>(null);

  const handleNewValue = (newValue: string, type: 'source' | 'type' | 'target') => {
    if (!newValue.trim()) {
      return;
    }
    const newOption: OptionType = { value: newValue.trim(), label: newValue.trim() };
    const checkUniqueValue = (list: OptionType[], value: OptionType) =>
      (list.some((opt) => opt.value === value.value) ? list : [...list, value]);
    switch (type) {
      case 'source':
        setSourceOptions((prev) => checkUniqueValue(prev, newOption));
        onPatternChange(newOption, selectedType as OptionType, selectedTarget as OptionType);
        break;
      case 'type':
        setTypeOptions((prev) => checkUniqueValue(prev, newOption));
        onPatternChange(selectedSource as OptionType, newOption, selectedTarget as OptionType);
        break;
      case 'target':
        setTargetOptions((prev) => checkUniqueValue(prev, newOption));
        onPatternChange(selectedSource as OptionType, selectedType as OptionType, newOption);
        break;
      default:
        console.log('wrong type added');
        break;
    }
    setInputValues((prev) => ({ ...prev, [type]: '' }));
  };

  const handleInputChange = (newValue: string, type: 'source' | 'type' | 'target') => {
    setInputValues((prev) => ({ ...prev, [type]: newValue }));
  };
  const handleKeyDown = (e: React.KeyboardEvent, type: 'source' | 'type' | 'target') => {
    if (e.key === 'Enter' && inputValues[type].trim()) {
      e.preventDefault();
      handleNewValue(inputValues[type], type);
    }
  };

  const handleAddPattern = () => {
    onAddPattern();
    setTimeout(() => {
      const selectInput = sourceRef.current?.querySelector('input');
      selectInput?.focus();
    }, 100);
  };

  const handleBlur = (type: 'source' | 'type' | 'target') => {
    if (inputValues[type].trim()) {
      handleNewValue(inputValues[type], type);
    }
  };
  const isDisabled = !selectedSource?.value.length || !selectedTarget?.value.length || !selectedType?.value.length;
  return (
    <div className='bg-white rounded-lg shadow-md'>
      <div className='flex align-self-center justify-center'>
        <h5>{appLabels.graphPatternTuple}</h5>
      </div>
      <div className='flex gap-4 items-end mb-6 mt-3 justify-between'>
        <div className='w-1/4' ref={sourceRef}>
          <Select
            label='Select/Create Source'
            size='medium'
            selectProps={{
              isClearable: true,
              isMulti: false,
              options: sourceOptions,
              onChange: (selected) => handleNewValue(selected?.value || '', 'source'),
              value: selectedSource,
              inputValue: inputValues.source,
              onInputChange: (newValue) => handleInputChange(newValue, 'source'),
              onKeyDown: (e) => handleKeyDown(e, 'source'),
              onBlur: () => handleBlur('source'),
            }}
            type='creatable'
          />
        </div>
        <Select
          label='Select/Create Type'
          size='medium'
          selectProps={{
            isClearable: true,
            isMulti: false,
            options: typeOptions,
            onChange: (selected) => handleNewValue(selected?.value || '', 'type'),
            value: selectedType,
            inputValue: inputValues.type,
            onInputChange: (newValue) => handleInputChange(newValue, 'type'),
            onKeyDown: (e) => handleKeyDown(e, 'type'),
            onBlur: () => handleBlur('type'),
          }}
          type='creatable'
          className='w-1/4'
        />
        <Select
          label='Select/Create Target'
          size='medium'
          selectProps={{
            isClearable: true,
            isMulti: false,
            options: targetOptions,
            onChange: (selected) => handleNewValue(selected?.value || '', 'target'),
            value: selectedTarget,
            inputValue: inputValues.target,
            onInputChange: (newValue) => handleInputChange(newValue, 'target'),
            onKeyDown: (e) => handleKeyDown(e, 'target'),
            onBlur: () => handleBlur('target'),
          }}
          type='creatable'
          className='w-1/4'
        />
        <div className='flex items-center' tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleAddPattern()}>
          <ButtonWithToolTip
            text='Add'
            placement='top'
            onClick={handleAddPattern}
            label='Add Values'
            size='medium'
            disabled={isDisabled}
          >
            + Add
          </ButtonWithToolTip>
        </div>
      </div>
    </div>
  );
};
export default GraphPattern;
