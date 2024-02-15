import { TextInput, Button, Dialog } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { S3ModalProps } from '../types';
import { bucketScanAPI } from '../services/BucketScan';
import { useCredentials } from '../context/UserCredentials';

const S3Modal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketUrl, setBucketUrl] = useState<string>('');
  const { userCredentials } = useCredentials();

  const changeHandler = (e: any) => {
    setBucketUrl(e.target.value);
  };
  const submitHandler = async (bucketUrl: string) => {
    // console.log(/^(https?:\/\/)?s3:\/\/[a-zA-Z0-9.\-]+\/?$/.test(bucketUrl));
    const apiResponse = await bucketScanAPI(bucketUrl, userCredentials);
    console.log('response', apiResponse);
    hideModal();
    alert('url stored');
  };
  return (
    <Dialog size='small' open={open} disableCloseButton>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <div className='n-flex n-flex-row n-flex-wrap'>
          <div style={{ width: '100%', marginRight: '2.5%', display: 'inline-block' }}>
            <TextInput
              id='url'
              value={bucketUrl}
              disabled={false}
              label='Bucket URL'
              placeholder='s3://data.neo4j.com/pdf/'
              autoFocus
              fluid
              onChange={(e) => {
                changeHandler(e);
              }}
            />
          </div>
        </div>
        <Dialog.Actions className='mt-6 mb-2'>
          <Button
            color='neutral'
            fill='outlined'
            onClick={() => {
              hideModal();
            }}
            size='large'
          >
            Cancel
          </Button>
          <Button onClick={() => submitHandler(bucketUrl)} size='large'>
            Continue
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};
export default S3Modal;