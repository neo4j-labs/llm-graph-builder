import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';

const LlmDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = ['Diffbot', 'OpenAI GPT 3.5', 'OpenAI GPT 4'];
  return (
    <>
      <div style={{ width: '150px' }}>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label: option, value: option })),
            placeholder: 'Select Model',
            defaultValue: { label: 'Diffbot', value: 'Diffbot' },
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
