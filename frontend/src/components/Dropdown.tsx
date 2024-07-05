import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';
import { useMemo } from 'react';
import { capitalize } from '../utils/Utils';

interface ReusableDropdownProps extends DropdownProps {
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  view?: 'ContentView' | 'GraphView';
  isDisabled: boolean;
}
const DropdownComponent: React.FC<ReusableDropdownProps> = ({
  options,
  placeholder,
  defaultValue,
  onSelect,
  children,
  view,
  isDisabled,
}) => {
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
          selectProps={{
            onChange: handleChange,
            options: allOptions?.map((option) => ({
              label: option.includes('LLM_MODEL_CONFIG_')
                ? capitalize(option.split('LLM_MODEL_CONFIG_').at(-1) as string)
                : capitalize(option),
              value: option,
            })),
            placeholder: placeholder || 'Select an option',
            defaultValue: defaultValue ? { label: capitalize(defaultValue), value: defaultValue } : undefined,
            menuPlacement: 'auto',
            isDisabled: isDisabled,
          }}
          size='medium'
          fluid
        />
        {children}
      </div>
    </>
  );
};
export default DropdownComponent;
