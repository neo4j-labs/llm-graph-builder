import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';

const LlmDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = ['LLM Model', 'Diffbot'];
  return (
    <>
      <div style={{ width: '170px' }}>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label: option, value: option })),
            placeholder: 'Select LLM Model',
            defaultValue: { label: 'LLM Model', value: 'LLM Model' },
            menuPlacement: 'auto',
            isDisabled,
          }}
          size='medium'
          fluid
        />
      </div>
    </>
  );
};

export default LlmDropdown;
