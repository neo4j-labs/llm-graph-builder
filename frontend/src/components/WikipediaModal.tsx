import { useState } from 'react';
import CustomModal from '../HOC/CustomModal';
import { TextInput } from '@neo4j-ndl/react';
import { WikipediaModalTypes } from '../types';

const WikipediaModal: React.FC<WikipediaModalTypes> = ({ hideModal, open }) => {
  const [wikiQuery, setwikiQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');

  const onClose = () => {
    hideModal();
    reset();
    setStatus('unknown');
  };
  const reset = () => {
    setwikiQuery('');
  };
  const submitHandler = () => {};
  return (
    <CustomModal
      open={open}
      onClose={onClose}
      statusMessage={statusMessage}
      setStatus={setStatus}
      submitHandler={submitHandler}
      status={status}
      submitLabel='Submit'
    >
      <div style={{ width: '100%', display: 'inline-block' }}>
        <TextInput
          id='url'
          value={wikiQuery}
          disabled={false}
          label='Wikipedia Source'
          placeholder='neo4j , gemini'
          autoFocus
          fluid
          required
          onChange={(e) => {
            setwikiQuery(e.target.value);
          }}
        />
      </div>
    </CustomModal>
  );
};
export default WikipediaModal;
