import { TextInput } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { urlScanAPI } from '../services/URLScan';
import { CustomFile, S3ModalProps, fileName } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';

const GCSModal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [bucketName, setbucketName] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const { setFilesData, model, filesData } = useFileContext();
  const reset = () => {
    setbucketName('');
    setFolderName('');
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
      fileSource: 'gcs bucket',
    };

    if (!bucketName) {
      setStatus('danger');
      setStatusMessage('Please Fill the Bucket Name');
      setTimeout(() => {
        setStatus('unknown');
      }, 5000);
    } else {
      try {
        setStatus('info');
        setStatusMessage('Loading...');
        const apiResponse = await urlScanAPI({
          userCredentials,
          model,
          accessKey: '',
          secretKey: '',
          gcs_bucket_name: bucketName,
          gcs_bucket_folder: folderName,
          source_type: 'gcs bucket',
        });
        if (apiResponse.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage(apiResponse?.data?.message);
          setTimeout(() => {
            setStatus('unknown');
            reset();
            hideModal();
          }, 5000);
          return;
        } else {
          setStatus('success');
          setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
          const copiedFilesData = [...filesData];
          apiResponse?.data?.file_name?.forEach((item: fileName) => {
            const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item.fileName);
            if (filedataIndex == -1) {
              copiedFilesData.unshift({
                name: item.fileName,
                size: item.fileSize ?? 0,
                gcsBucket: item.gcsBucket,
                gcsBucketFolder: item.gcsBucketFolder,
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
          reset();
        }
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
    hideModal();
    reset();
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
      submitLabel='Submit'
    >
      <div className='w-full inline-block'>
        <TextInput
          id='url'
          value={bucketName}
          disabled={false}
          label='Bucket Name'
          aria-label='Bucket Name'
          placeholder=''
          autoFocus
          fluid
          required
          onChange={(e) => {
            setbucketName(e.target.value);
          }}
        />
        <TextInput
          id='url'
          value={folderName}
          disabled={false}
          label='Folder Name'
          aria-label='Folder Name'
          placeholder=''
          isOptional={true}
          fluid
          onChange={(e) => {
            setFolderName(e.target.value);
          }}
        />
      </div>
    </CustomModal>
  );
};
export default GCSModal;
