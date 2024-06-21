import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';
import { useMemo } from 'react';
import { defaultLLM, llms } from '../utils/Constants';
import { capitalize } from '../utils/Utils';

const LlmDropdown: React.FC<DropdownProps> = ({ onSelect }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = useMemo(() => llms, []);

  return (
    <>
      <div className='w-[150px]'>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions?.map((option) => ({
              label: capitalize(option),
              value: option,
            })),
            placeholder: 'Select LLM Model',
            defaultValue: { label: capitalize(defaultLLM), value: defaultLLM },
            menuPlacement: 'auto',
          }}
          size='medium'
          fluid
        />
      </div>
    </>
  );
};

export default LlmDropdown;
