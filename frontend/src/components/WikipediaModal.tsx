import { useCallback, useState } from 'react';
import CustomModal from '../HOC/CustomModal';
import { TextInput } from '@neo4j-ndl/react';
import { CustomFile, WikipediaModalTypes } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { getFileFromLocal } from '../utils/Utils';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';
import { urlScanAPI } from '../services/URLScan';

const WikipediaModal: React.FC<WikipediaModalTypes> = ({ hideModal, open }) => {
  const [wikiQuery, setwikiQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const { setFiles, setFilesData, model, filesData, files } = useFileContext();
  const { userCredentials } = useCredentials();
  const onClose = useCallback(() => {
    hideModal();
    setwikiQuery('');
    setStatus('unknown');
  }, []);

  const submitHandler = async () => {
    const defaultValues: CustomFile = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      id: uuidv4(),
      relationshipCount: 0,
      type: 'TEXT',
      model: model,
      fileSource: 'Wikipedia',
    };
    if (wikiQuery.length) {
      try {
        setStatus('info');
        setStatusMessage('Scanning...');
        const apiResponse = await urlScanAPI({
          userCredentials: userCredentials,
          model: model,
          wikiquery: wikiQuery,
        });
        console.log('response', apiResponse);
        setStatus('success');
        if (apiResponse?.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage(apiResponse?.data?.message);
          setTimeout(() => {
            setStatus('unknown');
            setwikiQuery('');
            hideModal();
          }, 5000);
          return;
        }
        setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Wikipedia Sources`);
        const copiedFilesData: CustomFile[] = [...filesData];
        const copiedFiles: File[] = [...files];
        apiResponse?.data?.file_name?.forEach((item: any) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          const fileIndex = copiedFiles.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize,
              wiki_query: item.fileName,
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
            //@ts-ignore
            copiedFiles.unshift(null);
          } else {
            const tempFile = copiedFiles[filedataIndex];
            copiedFiles.splice(fileIndex, 1);
            copiedFiles.unshift(getFileFromLocal(tempFile.name) ?? tempFile);
          }
        });
        setFilesData(copiedFilesData);
        setFiles(copiedFiles);
        setwikiQuery('');
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred or Please Check your Instance Connection');
      }
    } else {
      setStatus('danger');
      setStatusMessage('Please Fill the Wikipedia source');
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
      <div className='w-full inline-block'>
        <TextInput
          id='url'
          value={wikiQuery}
          disabled={false}
          label='Wikipedia Source'
          placeholder='Albert Einstein ,Isaac Newton'
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
