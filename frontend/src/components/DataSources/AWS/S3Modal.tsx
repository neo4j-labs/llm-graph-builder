import { TextInput } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { CustomFile, CustomFileBase, S3ModalProps, UserCredentials } from '../../../types';
import { urlScanAPI } from '../../../services/URLScan';
import { useCredentials } from '../../../context/UserCredentials';
import { validation } from '../../../utils/Utils';
import { useFileContext } from '../../../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../../../HOC/CustomModal';
import { buttonCaptions } from '../../../utils/Constants';
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
  const { setFilesData, model, filesData } = useFileContext();

  const reset = () => {
    setBucketUrl('');
    setAccessKey('');
    setSecretKey('');
    setValid(false);
    setisFocused(false);
  };

  const submitHandler = async (url: string) => {
    const defaultValues: CustomFileBase = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      relationshipCount: 0,
      type: 'PDF',
      model: model,
      fileSource: 's3 bucket',
      processingProgress: undefined,
    };
    if (url) {
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
          urlParam: url.trim(),
          userCredentials: userCredentials as UserCredentials,
          model: model,
          accessKey: accessKey.trim(),
          secretKey: secretKey.trim(),
          source_type: 's3 bucket',
        });
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
        apiResponse?.data?.file_name?.forEach((item: S3File) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize,
              source_url: item.url,
              // total_pages: 'N/A',
              id: uuidv4(),
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
              processingProgress: defaultValues.processingProgress,
              // total_pages: 'N/A',
            });
          }
        });
        setFilesData(copiedFilesData);
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
    }, 500);
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
      submitLabel={buttonCaptions.submit}
    >
      <div className='w-full inline-block'>
        <TextInput
          id='url'
          value={bucketUrl}
          disabled={false}
          label='Bucket URL'
          aria-label='Bucket URL'
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
          id='access key'
          value={accessKey}
          disabled={false}
          label='Access Key'
          aria-label='Access Key'
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
          id='secret key'
          value={secretKey}
          disabled={false}
          label='Secret Key'
          aria-label='Secret Key'
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
