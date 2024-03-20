import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';

const GraphDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = ['Document Structure','Document & Knowledge Graph', 'Knowledge Graph Entities'];
  return (
    <>
      <div style={{ width: '250px' }}>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: allOptions.map((option) => ({ label: option, value: option })),
            defaultValue: { label: 'Document Structure', value: 'Document Structure' },
            menuPlacement: 'auto',
            isDisabled,
          }}
          size='large'
          fluid
        />
      </div>
    </>
  );
};

export default GraphDropdown;
