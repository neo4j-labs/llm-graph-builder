import React, { useState, useRef, useEffect } from 'react';
import { Select } from '@neo4j-ndl/react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { OptionType, TupleCreationProps } from '../../../../types';
import {
  appLabels,
  LOCAL_KEYS,
  sourceOptions as initialSourceOptions,
  targetOptions as initialTargetOptions,
  typeOptions as initialTypeOptions,
} from '../../../../utils/Constants';
interface IErrorState {
  showError: boolean;
  errorMessage: string;
}
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
  const [showWarning, setShowWarning] = useState<Record<'source' | 'type' | 'target', IErrorState>>({
    source: { showError: false, errorMessage: '' },
    type: { showError: false, errorMessage: '' },
    target: { showError: false, errorMessage: '' },
  });
  const sourceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedSources = JSON.parse(localStorage.getItem('customSourceOptions') ?? 'null');
    const savedTypes = JSON.parse(localStorage.getItem('customTypeOptions') ?? 'null');
    const savedTargets = JSON.parse(localStorage.getItem('customTargetOptions') ?? 'null');
    if (savedSources) {
      setSourceOptions(savedSources);
    }
    if (savedTypes) {
      setTypeOptions(savedTypes);
    }
    if (savedTargets) {
      setTargetOptions(savedTargets);
    }
  }, []);

  const handleNewValue = (newValue: string, type: 'source' | 'type' | 'target') => {
    const regex = /^[^,]*$/;
    if (!newValue.trim()) {
      setShowWarning((old) => ({ ...old, [type]: { showError: true, errorMessage: 'Value Must Not Be Empty' } }));
      return;
    }
    if (!regex.test(newValue)) {
      setShowWarning((old) => ({
        ...old,
        [type]: {
          showError: true,
          errorMessage: 'Please enter text without commas. Commas are not allowed in this field',
        },
      }));
    } else {
      setShowWarning((old) => ({ ...old, [type]: { showError: false, errorMessage: '' } }));
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
    }
  };

  const handleInputChange = (newValue: string, type: 'source' | 'type' | 'target') => {
    setInputValues((prev) => ({ ...prev, [type]: newValue }));
  };

  const handleAddPattern = () => {
    onAddPattern();
    localStorage.setItem(LOCAL_KEYS.source, JSON.stringify(sourceOptions));
    localStorage.setItem(LOCAL_KEYS.type, JSON.stringify(typeOptions));
    localStorage.setItem(LOCAL_KEYS.target, JSON.stringify(targetOptions));
    setTimeout(() => {
      const selectInput = sourceRef.current?.querySelector('input');
      selectInput?.focus();
    }, 100);
  };

  const handleBlurPattern = (value: string, type: 'source' | 'type' | 'target') => {
    const regex = /^[^,]*$/;
    if (!regex.test(value)) {
      setShowWarning((old) => ({
        ...old,
        [type]: {
          showError: true,
          errorMessage: 'Please enter text without commas. Commas are not allowed in this field',
        },
      }));
    } else {
      setShowWarning((old) => ({ ...old, [type]: { showError: false, errorMessage: '' } }));
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
            errorText={showWarning.source.showError ? showWarning.source.errorMessage : ''}
            helpText='Create/Select Source label without using commas Ex: Person'
            selectProps={{
              isClearable: true,
              options: sourceOptions,
              onChange: (selected) => {
                if (!selected) {
                  onPatternChange(null, selectedType, selectedTarget);
                } else {
                  handleNewValue(selected.value, 'source');
                }
              },
              value: selectedSource,
              inputValue: inputValues.source,
              onInputChange: (newValue) => handleInputChange(newValue, 'source'),
              onCreateOption: (newOption) => handleNewValue(newOption, 'source'),
              onBlur: (e) => {
                handleBlurPattern(e.target.value, 'source');
              },
            }}
            type='creatable'
          />
        </div>
        <Select
          label='Select/Create Type'
          size='medium'
          helpText='Create/Select Type label without using commas Ex: WORKS_FOR'
          errorText={showWarning.type.showError ? showWarning.type.errorMessage : ''}
          selectProps={{
            isClearable: true,
            options: typeOptions,
            onChange: (selected) => {
              if (!selected) {
                onPatternChange(selectedSource, null, selectedTarget);
              } else {
                handleNewValue(selected.value, 'type');
              }
            },
            value: selectedType,
            inputValue: inputValues.type,
            onInputChange: (newValue) => handleInputChange(newValue, 'type'),
            onCreateOption: (newOption) => handleNewValue(newOption, 'type'),
            onBlur: (e) => {
              handleBlurPattern(e.target.value, 'type');
            },
          }}
          type='creatable'
          className='w-1/4'
        />
        <Select
          label='Select/Create Target'
          helpText='Create/Select Target label without using commas Ex: Company'
          errorText={showWarning.target.showError ? showWarning.target.errorMessage : ''}
          size='medium'
          selectProps={{
            isClearable: true,
            options: targetOptions,
            onChange: (selected) => {
              if (!selected) {
                onPatternChange(selectedSource, selectedType, null);
              } else {
                handleNewValue(selected.value, 'target');
              }
            },
            value: selectedTarget,
            inputValue: inputValues.target,
            onInputChange: (newValue) => handleInputChange(newValue, 'target'),
            onCreateOption: (newOption) => handleNewValue(newOption, 'target'),
            onBlur: (e) => {
              handleBlurPattern(e.target.value, 'target');
            },
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
