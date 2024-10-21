import { Dropdown, Tip } from '@neo4j-ndl/react';
import { OptionType, ReusableDropdownProps } from '../types';
import { memo, useMemo, useReducer } from 'react';
import { capitalize, capitalizeWithUnderscore } from '../utils/Utils';

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
  const [disableTooltip, toggleDisableState] = useReducer((state) => !state, false);
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = useMemo(() => options, [options]);
  return (
    <>
      <div className={view === 'ContentView' ? 'w-[150px]' : ''}>
        <Tip allowedPlacements={['top']} isDisabled={disableTooltip}>
          <Tip.Trigger>
            <Dropdown
              type='select'
              aria-label='A selection dropdown'
              label='LLM Models'
              selectProps={{
                onChange: handleChange,
                options: allOptions?.map((option) => {
                  const label =
                    typeof option === 'string' ? capitalizeWithUnderscore(option) : capitalize(option.label);
                  const value = typeof option === 'string' ? option : option.value;
                  return {
                    label,
                    value,
                  };
                }),
                placeholder: placeholder || 'Select an option',
                defaultValue: defaultValue
                  ? { label: capitalizeWithUnderscore(defaultValue), value: defaultValue }
                  : undefined,
                menuPlacement: 'auto',
                isDisabled: isDisabled,
                value: value,
                onMenuOpen: () => {
                  toggleDisableState();
                },
                onMenuClose: () => {
                  toggleDisableState();
                },
              }}
              size='medium'
              fluid
            />
          </Tip.Trigger>
          <Tip.Content>LLM Model used for Extraction & Chat</Tip.Content>
        </Tip>
        {children}
      </div>
    </>
  );
};
export default memo(DropdownComponent);
