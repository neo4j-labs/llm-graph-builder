import { TextInput } from '@neo4j-ndl/react';
import { useState } from 'react';
import { webLinkValidation } from '../utils/Utils';

export default function WebInput() {
  const [webLink, setwebLink] = useState<string>('');
  const [isValid, setisValid] = useState<boolean>(false);
  const [isFocused, setisFocused] = useState<boolean>(false);
  return (
    <div className='w-full inline-block'>
      <TextInput
        type='url'
        id='keyword'
        value={webLink}
        disabled={false}
        label='Website Link'
        aria-label='Website Link'
        placeholder='https://www.espn.com/'
        autoFocus
        fluid
        required
        onBlur={() => setisValid(webLinkValidation(webLink) && isFocused)}
        errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
        onChange={(e) => {
          setisFocused(true);
          setwebLink(e.target.value);
        }}
      />
    </div>
  );
}
