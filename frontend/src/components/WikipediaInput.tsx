import { TextInput } from '@neo4j-ndl/react';
import { useState } from 'react';
import { wikiValidation } from '../utils/Utils';

export default function WikipediaInput() {
  const [wikiQuery, setwikiQuery] = useState<string>('');
  const [isValid, setisValid] = useState<boolean>(false);
  const [isFocused, setisFocused] = useState<boolean>(false);

  return (
    <div className='w-full inline-block'>
      <TextInput
        type='url'
        id='keyword'
        value={wikiQuery}
        disabled={false}
        label='Wikipedia Link'
        aria-label='Wikipedia Link'
        placeholder='https://en.wikipedia.org/wiki/Albert_Einstein'
        autoFocus
        fluid
        required
        onBlur={() => setisValid(wikiValidation(wikiQuery) && isFocused)}
        errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
        onChange={(e) => {
          setisFocused(true);
          if (e.target.value.includes('https://en.wikipedia.org/wiki/')) {
            setisValid(wikiValidation(e.target.value));
          }
          setwikiQuery(e.target.value);
        }}
      />
    </div>
  );
}
