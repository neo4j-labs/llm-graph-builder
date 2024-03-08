import { TextInput } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { S3ModalProps, SourceNode } from '../types';
import { urlScanAPI } from '../services/URLScan';
import { useCredentials } from '../context/UserCredentials';
import { getSourceNodes } from '../services/GetFiles';
import { getFileFromLocal, validation } from '../utils/Utils';
import { useFileContext } from '../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';

const S3Modal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketUrl, setBucketUrl] = useState<string>('');
  const [accessKey, setAccessKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isFocused, setisFocused] = useState<boolean>(false);
  const [isValid, setValid] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const { setFiles, setFilesData, model } = useFileContext();

  const changeHandler = (e: any) => {
    setBucketUrl(e.target.value);
  };
  const reset = () => {
    setBucketUrl('');
    setAccessKey('');
    setSecretKey('');
    setValid(false);
    setisFocused(false);
  };

  const submitHandler = async (url: string) => {
    if (url && url[url.length - 1] != '/') {
      setBucketUrl((prev) => {
        return prev + '/';
      });
      setValid(validation(bucketUrl) && isFocused);
    }
    if (accessKey.length) {
      localStorage.setItem('accesskey', accessKey);
    }
    if (accessKey.length) {
      localStorage.setItem('secretkey', secretKey);
    }
    if (isValid && accessKey.trim() != '' && secretKey.trim() != '') {
      try {
        setStatus('info');
        setStatusMessage('Scanning...');
        const apiResponse = await urlScanAPI({
          urlParam: url,
          userCredentials: userCredentials,
          model: model,
          accessKey: accessKey,
          secretKey: secretKey,
        });
        console.log('response', apiResponse);
        setStatus('success');
        if (apiResponse?.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage('Please Fill The Valid Credentials' ?? apiResponse?.message);
          setTimeout(() => {
            hideModal();
            setStatus('unknown');
            reset();
          }, 2000);
          return;
        }
        setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        reset();
        const res: any = await getSourceNodes(userCredentials);
        if (res.data.status !== 'Failed') {
          const prefiles: any[] = [];
          if (res.data.data.length) {
            res.data.data.forEach((item: SourceNode) => {
              if (item.fileName != undefined) {
                prefiles.push({
                  name: item.fileName,
                  size: item.fileSize ?? 0,
                  type: item?.fileType?.toUpperCase() ?? 'None',
                  NodesCount: item?.nodeCount ?? 0,
                  processing: item?.processingTime ?? 'None',
                  relationshipCount: item?.relationshipCount ?? 0,
                  status:
                    item.fileSource == 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                      ? item.status
                      : item.fileSource === 'youtube'
                      ? item.status
                      : getFileFromLocal(`${item.fileName}`) != null
                      ? item.status
                      : 'N/A',
                  model: item?.model ?? model,
                  id: uuidv4(),
                  source_url: item.url != 'None' && item?.url != '' ? item.url : '',
                  fileSource: item.fileSource ?? 'None',
                });
              }
            });
          }
          setFilesData(prefiles);
          const prefetchedFiles: any[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (item.fileName != undefined) {
              if (localFile != null) {
                prefetchedFiles.push(localFile);
              } else {
                prefetchedFiles.push(null);
              }
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
    setTimeout(() => {
      hideModal();
    }, 2000);
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
      submitHandler={() => submitHandler(bucketUrl)}
      status={status}
      setStatus={setStatus}
      submitLabel='Submit'
    >
      <div style={{ width: '100%', display: 'inline-block' }}>
        <TextInput
          id='url'
          value={bucketUrl}
          disabled={false}
          label='Bucket URL'
          placeholder='s3://data.neo4j.com/pdf/'
          autoFocus
          fluid
          required
          errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
          onBlur={() => setValid(validation(bucketUrl) && isFocused)}
          onChange={(e) => {
            setisFocused(true);
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
