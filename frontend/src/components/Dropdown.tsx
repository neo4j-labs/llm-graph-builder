import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';
import { useMemo } from 'react';

const LlmDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = useMemo(() => ['Diffbot', 'Gemini Pro','OpenAI GPT 3.5','OpenAI GPT 4'], []);
  return (
    <>
      <div className='w-[150px]'>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label:  option, value: option })),
            placeholder: 'Select LLM Model',
            defaultValue: { label: 'OpenAI GPT 4', value: 'OpenAI GPT 4' },
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
