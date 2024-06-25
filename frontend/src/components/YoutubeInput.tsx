import { TextInput } from '@neo4j-ndl/react';
import { useState } from 'react';

export default function YoutubeInput() {
  const [youtubeURL, setYoutubeURL] = useState<string>('');
  return (
    <div className='w-full inline-block'>
      <TextInput
        id='url'
        value={youtubeURL}
        disabled={false}
        label='Youtube Link'
        aria-label='Youtube Link'
        placeholder='https://www.youtube.com/watch?v=2W9HM1xBibo'
        autoFocus
        fluid
        required
        onChange={(e) => {
          setYoutubeURL(e.target.value);
        }}
      />
    </div>
  );
}
