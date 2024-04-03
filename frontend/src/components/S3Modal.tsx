import { TextInput } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { CustomFile, S3ModalProps, UserCredentials } from '../types';
import { urlScanAPI } from '../services/URLScan';
import { useCredentials } from '../context/UserCredentials';
import { getFileFromLocal, validation } from '../utils/Utils';
import { useFileContext } from '../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';
interface S3File {
  fileName: string;
  fileSize: number;
  url: string;
}
const S3Modal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketUrl, setBucketUrl] = useState<string>('');
  const [accessKey, setAccessKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isFocused, setisFocused] = useState<boolean>(false);
  const [isValid, setValid] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const { setFiles, setFilesData, model, filesData, files } = useFileContext();

  const reset = () => {
    setBucketUrl('');
    setAccessKey('');
    setSecretKey('');
    setValid(false);
    setisFocused(false);
  };

  const submitHandler = async (url: string) => {
    const defaultValues: CustomFile = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      id: uuidv4(),
      relationshipCount: 0,
      type: 'PDF',
      model: model,
      fileSource: 's3 bucket',
    };
    if (url && url[url.length - 1] != '/') {
      setBucketUrl((prev) => {
        return `${prev}/`;
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
          userCredentials: userCredentials as UserCredentials,
          model: model,
          accessKey: accessKey,
          secretKey: secretKey,
        });
        console.log('response', apiResponse);
        setStatus('success');
        if (apiResponse?.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage('Please Fill The Valid Credentials');
          setTimeout(() => {
            hideModal();
            setStatus('unknown');
            reset();
          }, 5000);
          return;
        }
        setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        const copiedFilesData: CustomFile[] = [...filesData];
        const copiedFiles: (File | null)[] = [...files];
        apiResponse?.data?.file_name?.forEach((item: S3File) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          const fileIndex = copiedFiles.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize,
              source_url: item.url,
              ...defaultValues,
            });
          } else {
            const tempFileData = copiedFilesData[filedataIndex];
            copiedFilesData.splice(filedataIndex, 1);
            copiedFilesData.unshift({
              ...tempFileData,
              status: defaultValues.status,
              NodesCount: defaultValues.NodesCount,
              relationshipCount: defaultValues.relationshipCount,
              processing: defaultValues.processing,
              model: defaultValues.model,
              fileSource: defaultValues.fileSource,
            });
          }
          if (fileIndex == -1) {
            copiedFiles.unshift(null);
          } else {
            const tempFile = copiedFiles[filedataIndex];
            copiedFiles.splice(fileIndex, 1);
            if (tempFile) {
              copiedFiles.unshift(getFileFromLocal(tempFile.name) ?? tempFile);
            }
          }
        });
        setFilesData(copiedFilesData);
        setFiles(copiedFiles);
        reset();
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred or Please Check your Instance Connection');
      }
    } else {
      setStatus('warning');
      setStatusMessage('Please Fill The Valid Credentials');
      setTimeout(() => {
        setStatus('unknown');
      }, 5000);
      return;
    }
    setTimeout(() => {
      setStatus('unknown');
      hideModal();
    }, 5000);
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
      <div className='w-full inline-block'>
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
            setBucketUrl(e.target.value);
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
