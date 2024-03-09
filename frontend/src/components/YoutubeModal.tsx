import { Checkbox, TextInput } from '@neo4j-ndl/react';
import { useState } from 'react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { urlScanAPI } from '../services/URLScan';
import { CustomFile, S3ModalProps } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';
import { getFileFromLocal } from '../utils/Utils';

const YoutubeModal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [youtubeURL, setYoutubeURL] = useState<string>('');
  const [sourceLimit, setSourceLimit] = useState<number>(5);
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [showSourceLimitInput, setshowSourceLimitInput] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [querySource, setQuerySource] = useState<string>('');
  const { userCredentials } = useCredentials();
  const { setFiles, setFilesData, model, filesData, files } = useFileContext();
  const reset = () => {
    setYoutubeURL('');
    setQuerySource('');
    setshowSourceLimitInput(false);
  };
  const submitHandler = async () => {
    const defaultValues: CustomFile = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      id: uuidv4(),
      relationshipCount: 0,
      type: 'TEXT',
      model: model,
      fileSource: 'youtube',
    };
    if(showSourceLimitInput){
      defaultValues['max_sources']=sourceLimit
    }
    if (querySource.length) {
      defaultValues['wiki_query']=querySource
    }
    if (!youtubeURL) {
      setStatus('danger');
      setStatusMessage('Please Fill the Valid YouTube link');
      setTimeout(() => {
        setStatus('unknown');
      }, 2000);
    } else {
      try {
        setStatus('info');
        setStatusMessage('Loading...');
        const apiResponse = await urlScanAPI({
          urlParam: youtubeURL,
          userCredentials,
          model,
          accessKey: '',
          secretKey: '',
          max_limit: showSourceLimitInput?sourceLimit:0,
          query_source: querySource,
        });
        setStatus('success');
        if (apiResponse.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage(apiResponse.data.data ?? apiResponse?.message);
          setTimeout(() => {
            setStatus('unknown');
            reset();
            hideModal();
          }, 2000);
          return;
        }
        setStatusMessage(`Successfully Created Source Nodes for Link`);
        reset();
        const copiedFilesData = [...filesData];
        const copiedFiles = [...files];
        const filedataIndex = copiedFilesData.findIndex(
          (filedataitem) => filedataitem?.name === apiResponse.data.file_name.fileName
        );
        const fileIndex = copiedFiles.findIndex(
          (filedataitem) => filedataitem?.name === apiResponse.data.file_name.fileName
        );
        if (filedataIndex == -1) {
          copiedFilesData.unshift({
            name: apiResponse.data.file_name.fileName,
            size: apiResponse.data.file_name.fileSize ?? 0,
            source_url: apiResponse.data.file_name.url,
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
          //@ts-ignore
          copiedFiles.unshift(null);
        } else {
          const tempFile = copiedFiles[filedataIndex];
          copiedFiles.splice(fileIndex, 1);
          copiedFiles.unshift(getFileFromLocal(tempFile.name) ?? tempFile);
        }
        setFilesData(copiedFilesData);
        setFiles(copiedFiles);
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred');
      }
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
      setStatus={setStatus}
      submitHandler={submitHandler}
      status={status}
      submitLabel='Submit'
    >
      <div style={{ width: '100%', display: 'inline-block' }}>
        <TextInput
          id='url'
          value={youtubeURL}
          disabled={false}
          label='Youtube Link'
          placeholder='https://www.youtube.com/watch?v=2W9HM1xBibo'
          autoFocus
          fluid
          required
          onChange={(e) => {
            setYoutubeURL(e.target.value);
          }}
        />
        <TextInput
          id='Query Source'
          className='my-3'
          value={querySource}
          disabled={false}
          label='Additional Wikipedia Query Sources'
          placeholder=''
          fluid
          onChange={(e) => {
            setQuerySource(e.target.value);
          }}
        />
        {showSourceLimitInput && (
          <TextInput
            id='url'
            value={sourceLimit}
            disabled={false}
            label='Max Source Limit'
            placeholder='5'
            autoFocus
            fluid
            required
            type='number'
            maxLength={3}
            max={100}
            onChange={(e) => {
              setSourceLimit(parseInt(e.target.value));
            }}
          />
        )}
        <div className='my-2'>
          <Checkbox
            label='Include Wikipedia Sources in the Knowledge Graph'
            checked={showSourceLimitInput}
            onChange={(e) => {
              if (e.target.checked) {
                setshowSourceLimitInput(true);
              } else {
                setshowSourceLimitInput(false);
              }
            }}
          />
        </div>
      </div>
    </CustomModal>
  );
};
export default YoutubeModal;
