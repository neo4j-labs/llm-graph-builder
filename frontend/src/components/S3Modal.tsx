import { TextInput } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { S3ModalProps, SourceNode } from '../types';
import { urlScanAPI } from '../services/URLScan';
import { useCredentials } from '../context/UserCredentials';
import { getSourceNodes } from '../services/GetFiles';
import { getFileFromLocal } from '../utils/utils';
import { useFileContext } from '../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';

const S3Modal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketUrl, setBucketUrl] = useState<string>('');
  const [accessKey, setAccessKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const { setFiles, setFilesData } = useFileContext();

  const changeHandler = (e: any) => {
    setBucketUrl(e.target.value);
  };
  const reset = () => {
    setBucketUrl('');
    setAccessKey('');
    setSecretKey('');
  };
  const validation = () => {
    return (
      bucketUrl.trim() != '' &&
      secretKey.trim() != '' &&
      accessKey.trim() != '' &&
      /^s3:\/\/([^/]+)\/$/.test(bucketUrl) != false
    );
  };
  const submitHandler = async () => {
    if (bucketUrl && bucketUrl[bucketUrl.length - 1] != '/') {
      setBucketUrl((prev) => prev + '/');
    }
    if (accessKey.length) {
      localStorage.setItem('accesskey', accessKey);
    }
    if (accessKey.length) {
      localStorage.setItem('secretkey', secretKey);
    }
    if (validation()) {
      try {
        setStatus('info');
        setStatusMessage('Scaning...');
        const apiResponse = await urlScanAPI(bucketUrl, userCredentials, accessKey, secretKey);
        console.log('response', apiResponse);
        setStatus('success');
        if (apiResponse.data.status == 'Failed') {
          setStatus('danger');
          setStatusMessage(apiResponse.data.message);
        } else {
          setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        }
        reset();
        const res: any = await getSourceNodes();
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) => ({
            name: item.fileName,
            size: item.fileSize ?? 0,
            type: item?.fileType?.toUpperCase() ?? 'None',
            NodesCount: item?.nodeCount ?? 0,
            processing: item?.processingTime ?? 'None',
            relationshipCount: item?.relationshipCount ?? 0,
            status:
              item.fileSource == 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                ? item.status
                : getFileFromLocal(`${item.fileName}`) != null
                ? item.status
                : 'N/A',
            model: item?.model ?? 'Diffbot',
            id: uuidv4(),
            source_url: item.url ?? '',
            fileSource: item.fileSource ?? 'None',
          }));
          setFilesData(prefiles);
          const prefetchedFiles: any[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (localFile != null) {
              prefetchedFiles.push(localFile);
            } else {
              prefetchedFiles.push(null);
            }
          });
          setFiles(prefetchedFiles);
        }
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred');
      }
    } else {
      setStatus('warning');
      setStatusMessage('Please Fill The Valid Credentials');
      setTimeout(() => {
        setStatus('unknown');
      }, 2000);
      return;
    }
    setStatus('unknown');
  };

  const onClose = () => {
    hideModal();
    reset();
    setStatus('unknown');
  };

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      statusMessage={statusMessage}
      submitHandler={submitHandler}
      status={status}
      setStatus={setStatus}
      submitLabel='Submit'
    >
      <div style={{ width: '100%', marginRight: '2.5%', display: 'inline-block' }}>
        <TextInput
          id='url'
          value={bucketUrl}
          disabled={false}
          label='Bucket URL'
          placeholder='s3://data.neo4j.com/pdf/'
          autoFocus
          fluid
          required
          onChange={(e) => {
            changeHandler(e);
          }}
        />
      </div>
      <div className='flex justify-between items-center w-full gap-4 mt-3'>
        <TextInput
          id='url'
          value={accessKey}
          disabled={false}
          label='Access Key'
          className='w-full'
          placeholder=''
          fluid
          required
          type={'password'}
          onChange={(e) => {
            setAccessKey(e.target.value);
          }}
        />
        <TextInput
          id='url'
          value={secretKey}
          disabled={false}
          label='Secret Key'
          className='w-full'
          placeholder=''
          fluid
          required
          type={'password'}
          onChange={(e) => {
            setSecretKey(e.target.value);
          }}
        />
      </div>
    </CustomModal>
  );
};
export default S3Modal;
