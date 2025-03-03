import { Tooltip, useMediaQuery, Select } from '@neo4j-ndl/react';
import { OptionType, ReusableDropdownProps } from '../types';
import { memo, useMemo } from 'react';
import { capitalize, capitalizeWithUnderscore } from '../utils/Utils';
import { prodllms } from '../utils/Constants';

const DropdownComponent: React.FC<ReusableDropdownProps> = ({
  options,
  placeholder,
  defaultValue,
  onSelect,
  children,
  view,
  isDisabled,
  value,
}) => {
  const isProdEnv = process.env.VITE_ENV === 'PROD';
  const isLargeDesktop = useMediaQuery(`(min-width:1440px )`);
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
    const existingModel = localStorage.getItem('selectedModel');
    if (existingModel != selectedOption?.value) {
      localStorage.setItem('selectedModel', selectedOption?.value ?? '');
    }
  };
  const allOptions = useMemo(() => options, [options]);
  return (
    <>
      <div className={view === 'ContentView' ? 'w-[150px]' : ''}>
        <Select
          type='select'
          aria-label='llm-dropdown'
          label={
            <div className='w-max! flex! gap-1 items-center'>
              <span>LLM Model for Processing & Chat</span>
            </div>
          }
          selectProps={{
            onChange: handleChange,
            // @ts-ignore
            options: allOptions?.map((option) => {
              const label = typeof option === 'string' ? capitalizeWithUnderscore(option) : capitalize(option.label);
              const value = typeof option === 'string' ? option : option.value;
              const isModelSupported = !isProdEnv || prodllms?.includes(value);
              return {
                label: !isModelSupported ? (
                  <Tooltip type='simple' placement={isLargeDesktop ? 'left' : 'right'}>
                    <Tooltip.Trigger>
                      <span className='text-nowrap'>{label}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Available In Development Version</Tooltip.Content>
                  </Tooltip>
                ) : (
                  <span className='text-nowrap'>{label}</span>
                ),
                value,
                isDisabled: !isModelSupported,
              };
            }),
            placeholder: placeholder || 'Select an option',
            defaultValue: defaultValue
              ? { label: capitalizeWithUnderscore(defaultValue), value: defaultValue }
              : undefined,
            menuPlacement: 'auto',
            isDisabled: isDisabled,
            value: value,
          }}
          size='medium'
          isFluid
          htmlAttributes={{
            'aria-label': 'A selection dropdown',
          }}
        />
        {children}
      </div>
    </>
  );
};
export default memo(DropdownComponent);
