import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';


const LlmDropdown: React.FC<DropdownProps> = ({ onSelect, }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  }
  const allOptions = ['Diffbot', 'OpenAI GPT'];
  return (
    <>
      <div style={{ width: '150px' }}>
        <Dropdown
          type='select'
          aria-label="A selection dropdown"
          defaultValue={"Diffbot"}
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label: option, value: option })),
            placeholder: 'Select LLM',
          }}
          size='medium'
          fluid
        />
      </div>
    </>
  );
}

export default LlmDropdown;