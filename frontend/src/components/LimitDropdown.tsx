import { Dropdown } from '@neo4j-ndl/react';
import { DropdownProps, OptionType } from '../types';
import { useFileContext } from '../context/UsersFiles';

const LimitDropdown: React.FC<DropdownProps> = ({ onSelect, isDisabled }) => {
  const { filesData } = useFileContext();
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = filesData.filter((f) => f.status === 'Completed').length;
  console.log('all', allOptions);
  const dropdownOptions = (min: number, max: number) => {
    const values: string[] = [];
    for (let i = min; i <= max; i += 5) {
      values.push(i.toString());
    }
    console.log(values);
    return values;
  };
  const optionsVal = dropdownOptions(5, allOptions);

  console.log('hello', optionsVal);
  return (
    <>
      <div>
        <Dropdown
          type='select'
          aria-label='A selection dropdown'
          selectProps={{
            onChange: handleChange,
            options: optionsVal.map((option) => ({ label: option, value: option })),
            placeholder: 'Select Document Limit',
            defaultValue: { label: '5', value: '5' },
            menuPlacement: 'auto',
            isDisabled,
          }}
          size='small'
          fluid
        />
      </div>
    </>
  );
};

export default LimitDropdown;
