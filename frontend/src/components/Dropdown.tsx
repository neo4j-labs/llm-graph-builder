import { Dropdown, Tip, useMediaQuery } from '@neo4j-ndl/react';
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
  };
  const allOptions = useMemo(() => options, [options]);
  return (
    <>
      <div className={view === 'ContentView' ? 'w-[150px]' : ''}>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          label='LLM Models'
          helpText={<div className='!w-max'> LLM Model used for Extraction & Chat</div>}
          selectProps={{
            onChange: handleChange,
            // @ts-ignore
            options: allOptions?.map((option) => {
              const label = typeof option === 'string' ? capitalizeWithUnderscore(option) : capitalize(option.label);
              const value = typeof option === 'string' ? option : option.value;
              const isModelSupported = !isProdEnv || prodllms?.includes(value);
              return {
                label: !isModelSupported ? (
                  <Tip allowedPlacements={isLargeDesktop ? ['left'] : ['right']}>
                    <Tip.Trigger>
                      <span>{label}</span>
                    </Tip.Trigger>
                    <Tip.Content>Available In Development Version</Tip.Content>
                  </Tip>
                ) : (
                  <span>{label}</span>
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
          fluid
        />
        {children}
      </div>
    </>
  );
};
export default memo(DropdownComponent);
