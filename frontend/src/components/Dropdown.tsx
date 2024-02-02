import { Dropdown } from '@neo4j-ndl/react';
import { useState } from 'react';

export default function LlmDropdown() {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const allOptions = ['Diffbot', 'OpenAI GPT'];
  console.log('selctedValue', selectedValue);
  return (
    <>
      <div style={{ width: '150px' }}>
        <Dropdown
          type='select'
          selectProps={{
            onChange: (newValue) => newValue && setSelectedValue(newValue.value),
            options: allOptions.map((option) => ({ label: option, value: option })),
            value: { label: selectedValue, value: selectedValue },
            placeholder: 'Your',
          }}
          size='medium'
          fluid
        />
      </div>
    </>
  );
}
