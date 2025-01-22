import { TextInput } from '@neo4j-ndl/react';
import React, { useState } from 'react';
import { CustomFile, CustomFileBase, S3File, S3ModalProps } from '../../../types';
import { urlScanAPI } from '../../../services/URLScan';
import { validation } from '../../../utils/Utils';
import { useFileContext } from '../../../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../../../HOC/CustomModal';
import { buttonCaptions } from '../../../utils/Constants';

const S3Modal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketUrl, setBucketUrl] = useState<string>('');
  const [accessKey, setAccessKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isValid, setValid] = useState<boolean>(false);
  const { setFilesData, model, filesData } = useFileContext();

  const reset = () => {
    setBucketUrl('');
    setAccessKey('');
    setSecretKey('');
    setValid(false);
    setIsFocused(false);
  };

  const submitHandler = async (url: string) => {
    const defaultValues: CustomFileBase = {
      processingTotalTime: 0,
      status: 'New',
      nodesCount: 0,
      relationshipsCount: 0,
      type: 'PDF',
      model: model,
      fileSource: 's3 bucket',
      processingProgress: undefined,
      retryOption: '',
      retryOptionStatus: false,
      chunkNodeCount: 0,
      chunkRelCount: 0,
      entityNodeCount: 0,
      entityEntityRelCount: 0,
      communityNodeCount: 0,
      communityRelCount: 0,
    };
    if (url) {
      setValid(validation(bucketUrl) && isFocused);
    }
    if (accessKey.length) {
      localStorage.setItem('accesskey', accessKey);
    }
    if (accessKey.length) {
      localStorage.setItem('secretkey', btoa(secretKey));
    }
    if (isValid && accessKey.trim() != '' && secretKey.trim() != '') {
      try {
        setStatus('info');
        setStatusMessage('Scanning...');
        const apiResponse = await urlScanAPI({
          urlParam: url.trim(),
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
              sourceUrl: item.url,
              uploadProgress: 100,
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
              nodesCount: defaultValues.nodesCount,
              relationshipsCount: defaultValues.relationshipsCount,
              processingTotalTime: defaultValues.processingTotalTime,
              model: defaultValues.model,
              fileSource: defaultValues.fileSource,
              processingProgress: defaultValues.processingProgress,
              uploadProgress: 100,
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
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.code === 'Enter') {
      e.preventDefault(); //
      // @ts-ignore
      const { form } = e.target;
      const index = Array.prototype.indexOf.call(form, e.target);
      if (index + 1 < form.elements.length) {
        form.elements[index + 1].focus();
      } else {
        submitHandler(bucketUrl);
      }
    }
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
        <form>
          <TextInput
            htmlAttributes={{
              id: 'url',
              autoFocus: true,
              onBlur: () => setValid(validation(bucketUrl) && isFocused),
              onKeyDown: handleKeyDown,
              'aria-label': 'Bucket URL',
              placeholder: 's3://data.neo4j.com/pdf/',
            }}
            value={bucketUrl}
            isDisabled={false}
            label='Bucket URL'
            isFluid={true}
            isRequired={true}
            errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
            onChange={(e) => {
              setIsFocused(true);
              setBucketUrl(e.target.value);
            }}
          />
          <div className='flex justify-between items-center w-full gap-4 mt-3'>
            <TextInput
              htmlAttributes={{
                id: 'access key',
                type: 'password',
                onKeyDown: handleKeyDown,
                'aria-label': 'Access Key',
                placeholder: '',
              }}
              value={accessKey}
              isDisabled={false}
              label='Access Key'
              className='w-full'
              isFluid={true}
              isRequired={true}
              onChange={(e) => {
                setAccessKey(e.target.value);
              }}
            />
            <TextInput
              htmlAttributes={{
                id: 'secret key',
                type: 'password',
                onKeyDown: handleKeyDown,
                'aria-label': 'Secret Key',
                placeholder: '',
              }}
              value={secretKey}
              isDisabled={false}
              label='Secret Key'
              className='w-full'
              isFluid={true}
              isRequired={true}
              onChange={(e) => {
                setSecretKey(e.target.value);
              }}
            />
          </div>
        </form>
      </div>
    </CustomModal>
  );
};
export default S3Modal;
