import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';
import { useMemo } from 'react';
import { capitalize } from '../utils/Utils';
interface ReusableDropdownProps extends DropdownProps {
  options: string[] | OptionType[];
  placeholder?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  view?: 'ContentView' | 'GraphView';
  isDisabled: boolean;
  value?: OptionType;
}
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
            options: allOptions?.map((option) => {
              const label =
                typeof option === 'string'
                  ? (option.includes('LLM_MODEL_CONFIG_')
                      ? capitalize(option.split('LLM_MODEL_CONFIG_').at(-1) as string)
                      : capitalize(option)
                    )
                      .split('_')
                      .join(' ')
                  : capitalize(option.label);
              const value = typeof option === 'string' ? option : option.value;
              return {
                label,
                value,
              };
            }),
            placeholder: placeholder || 'Select an option',
            defaultValue: defaultValue ? { label: capitalize(defaultValue), value: defaultValue } : undefined,
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
export default DropdownComponent;
