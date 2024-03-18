import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';

const GraphDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = ['Pure Document','Document and Entities', 'Entities'];
  return (
    <>
      <div style={{ width: '150px' }}>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label: option, value: option })),
            placeholder: 'Select Graph Type',
            defaultValue: { label: 'Pure Document', value: 'Pure Document' },
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

export default GraphDropdown;
