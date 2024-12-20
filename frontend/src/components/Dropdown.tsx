import { useMediaQuery, Select, Tooltip } from '@neo4j-ndl/react'; // Added Tooltip import
import { memo } from 'react';
import { capitalizeWithUnderscore } from '../utils/Utils';
import { DropdownComponentProps, OptionType } from '../types';

const DropdownComponent: React.FC<DropdownComponentProps> = ({
  options,
  placeholder,
  defaultValue,
  onChange,
  children,
  view,
  isDisabled,
  value,
  label,
  helpText,
  size,
  mapOptions,
  customTooltip,
}) => {
  const isLargeDesktop = useMediaQuery('(min-width:1440px)');
  const dropdownOptions = options.map((option) => {
    const mappedOption = mapOptions ? mapOptions(option) : option;
    const labelText =
      typeof mappedOption.label === 'string' ? capitalizeWithUnderscore(mappedOption.label) : mappedOption.label;
    const tooltipContent = customTooltip?.(mappedOption);
    return {
      label: tooltipContent ? (
        <Tooltip type='simple' placement={isLargeDesktop ? 'left' : 'right'}>
          <Tooltip.Trigger>
            <span>{labelText}</span>
          </Tooltip.Trigger>
          <Tooltip.Content>{tooltipContent}</Tooltip.Content>
        </Tooltip>
      ) : (
        <span>{labelText}</span>
      ),
      value: mappedOption.value,
      isDisabled: mappedOption.isDisabled || false,
    };
  });
  return (
    <div className={view === 'ContentView' ? 'w-[150px]' : ''}>
      <Select
        type='select'
        label={label}
        helpText={<div className='!w-max'>{helpText}</div>}
        selectProps={{
          onChange: (selectedOption) => {
            if (selectedOption && typeof selectedOption === 'object' && 'value' in selectedOption) {
              onChange(selectedOption as OptionType);
            } else {
              onChange(null);
            }
          },
          options: dropdownOptions,
          placeholder: placeholder || 'Select an option',
          defaultValue: defaultValue
            ? {
                label:
                  typeof defaultValue.label === 'string'
                    ? capitalizeWithUnderscore(defaultValue.label)
                    : String(defaultValue.label),
                value: defaultValue.value,
              }
            : undefined,
          menuPlacement: 'auto',
          isDisabled,
          value,
        }}
        size={size}
        isFluid
        htmlAttributes={{
          'aria-label': 'A selection dropdown',
        }}
      />
      {children}
    </div>
  );
};
export default memo(DropdownComponent);
