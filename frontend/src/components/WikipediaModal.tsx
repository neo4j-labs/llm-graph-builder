import { useCallback, useState } from 'react';
import CustomModal from '../HOC/CustomModal';
import { TextInput } from '@neo4j-ndl/react';
import { CustomFile, UserCredentials, WikipediaModalTypes, fileName } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';
import { urlScanAPI } from '../services/URLScan';

const WikipediaModal: React.FC<WikipediaModalTypes> = ({ hideModal, open }) => {
  const [wikiQuery, setwikiQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const { setFilesData, model, filesData } = useFileContext();
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
          userCredentials: userCredentials as UserCredentials,
          model: model,
          wikiquery: wikiQuery.trim(),
          source_type: 'Wikipedia',
        });
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

        const apiResCheck = apiResponse?.data?.success_count && apiResponse.data.failed_count;
        if (apiResCheck) {
          setStatus('info');
          setStatusMessage(
            `Successfully Created Source Nodes for ${apiResponse.data.success_count} and Failed for ${apiResponse.data.failed_count} Wikipedia Sources`
          );
        } else if (apiResponse?.data?.success_count) {
          setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Wikipedia Sources`);
        } else {
          setStatus('danger');
          setStatusMessage(`Failed to Create Source Nodes for ${apiResponse.data.failed_count} Wikipedia Sources`);
        }

        const copiedFilesData: CustomFile[] = [...filesData];
        apiResponse?.data?.file_name?.forEach((item: fileName) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize,
              wiki_query: item.fileName,
              source_url: item.url,
              id: uuidv4(),
              language: item.language,
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
        });
        setFilesData(copiedFilesData);
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
    }, 500);
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
          id='keyword'
          value={wikiQuery}
          disabled={false}
          label='Wikipedia Keywords'
          aria-label='Wikipedia Keywords'
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
