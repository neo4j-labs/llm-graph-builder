import { TextInput } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { urlScanAPI } from '../services/URLScan';
import { CustomFileBase, S3ModalProps } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';
import { buttonCaptions } from '../utils/Constants';

const YoutubeModal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [youtubeURL, setYoutubeURL] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const { setFilesData, model, filesData } = useFileContext();
  const submitHandler = async () => {
    const defaultValues: CustomFileBase = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      relationshipCount: 0,
      type: 'TEXT',
      model: model,
      fileSource: 'youtube',
      processingProgress: undefined,
    };
    if (!youtubeURL) {
      setStatus('danger');
      setStatusMessage('Please Fill the Valid YouTube link');
      setTimeout(() => {
        setStatus('unknown');
      }, 5000);
    } else {
      try {
        setStatus('info');
        setStatusMessage('Loading...');
        const apiResponse = await urlScanAPI({
          urlParam: youtubeURL.trim(),
          userCredentials,
          model,
          accessKey: '',
          secretKey: '',
          source_type: 'youtube',
        });
        if (apiResponse.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage(apiResponse?.data.message);
          setTimeout(() => {
            setStatus('unknown');
            setYoutubeURL('');
            hideModal();
          }, 5000);
          return;
        }
        setStatus('success');
        setStatusMessage(`Successfully Created Source Nodes for Link`);
        const copiedFilesData = [...filesData];
        apiResponse?.data?.file_name?.forEach((item) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize ?? 0,
              source_url: item.url,
              // total_pages: 1,
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
            });
          }
        });
        setFilesData(copiedFilesData);
        setYoutubeURL('');
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred or Please Check your Instance Connection');
      }
    }
    setTimeout(() => {
      setStatus('unknown');
      hideModal();
    }, 500);
  };
  const onClose = useCallback(() => {
    setYoutubeURL('');
    hideModal();
    setStatus('unknown');
  }, []);

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      statusMessage={statusMessage}
      setStatus={setStatus}
      submitHandler={submitHandler}
      status={status}
      submitLabel={buttonCaptions.submit}
    >
      <div className='w-full inline-block'>
        <TextInput
          id='url'
          value={youtubeURL}
          disabled={false}
          label='Youtube Link'
          aria-label='Youtube Link'
          placeholder='https://www.youtube.com/watch?v=2W9HM1xBibo'
          autoFocus
          fluid
          required
          onChange={(e) => {
            setYoutubeURL(e.target.value);
          }}
        />
      </div>
    </CustomModal>
  );
};
export default YoutubeModal;
