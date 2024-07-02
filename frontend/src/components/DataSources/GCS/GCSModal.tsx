import { TextInput } from '@neo4j-ndl/react';
import { useCallback, useEffect, useState } from 'react';
import { useCredentials } from '../../../context/UserCredentials';
import { useFileContext } from '../../../context/UsersFiles';
import { urlScanAPI } from '../../../services/URLScan';
import { CustomFileBase, GCSModalProps, fileName, nonoautherror } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../../../HOC/CustomModal';
import { useGoogleLogin } from '@react-oauth/google';
import { useAlertContext } from '../../../context/Alert';
import { buttonCaptions } from '../../../utils/Constants';

const GCSModal: React.FC<GCSModalProps> = ({ hideModal, open, openGCSModal }) => {
  const [bucketName, setbucketName] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [projectId, setprojectId] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { userCredentials } = useCredentials();
  const { showAlert } = useAlertContext();

  const { setFilesData, model, filesData } = useFileContext();

  const defaultValues: CustomFileBase = {
    processing: 0,
    status: 'New',
    NodesCount: 0,
    relationshipCount: 0,
    type: 'TEXT',
    model: model,
    fileSource: 'gcs bucket',
    processingProgress: undefined,
  };

  const reset = () => {
    setbucketName('');
    setFolderName('');
    setprojectId('');
  };

  useEffect(() => {
    if (status != 'unknown') {
      setTimeout(() => {
        setStatusMessage('');
        setStatus('unknown');
        reset();
        hideModal();
      }, 5000);
    }
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setStatus('info');
        setStatusMessage('Loading...');
        openGCSModal();
        const apiResponse = await urlScanAPI({
          userCredentials,
          model,
          accessKey: '',
          secretKey: '',
          gcs_bucket_name: bucketName,
          gcs_bucket_folder: folderName,
          source_type: 'gcs bucket',
          gcs_project_id: projectId,
          access_token: codeResponse.access_token,
        });
        if (apiResponse.data.status == 'Failed' || !apiResponse.data) {
          showAlert('error', apiResponse?.data?.message);
          setTimeout(() => {
            setStatus('unknown');
            reset();
            hideModal();
          }, 5000);
          return;
        }
        const apiResCheck = apiResponse?.data?.success_count && apiResponse.data.failed_count;
        if (apiResCheck) {
          showAlert(
            'info',
            `Successfully Created Source Nodes for ${apiResponse.data.success_count} and Failed for ${apiResponse.data.failed_count} Files`
          );
        } else if (apiResponse?.data?.success_count) {
          showAlert('info', `Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        } else if (apiResponse.data.failed_count) {
          showAlert('error', `Failed to Created Source Node for ${apiResponse.data.failed_count} Files`);
        } else {
          showAlert('error', `Invalid Folder Name`);
        }
        const copiedFilesData = [...filesData];
        apiResponse?.data?.file_name?.forEach((item: fileName) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize ?? 0,
              gcsBucket: item.gcsBucketName,
              gcsBucketFolder: item.gcsBucketFolder,
              google_project_id: item.gcsProjectId,
              // total_pages: 'N/A',
              id: uuidv4(),
              access_token: codeResponse.access_token,
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
              access_token: codeResponse.access_token,
              // total_pages: 'N/A',
            });
          }
        });
        setFilesData(copiedFilesData);
        reset();
      } catch (error) {
        if (showAlert != undefined) {
          showAlert('error', 'Some Error Occurred or Please Check your Instance Connection');
        }
      }
      setTimeout(() => {
        setStatus('unknown');
        hideModal();
      }, 500);
    },
    onError: (errorResponse) => {
      showAlert(
        'error',
        errorResponse.error_description ?? 'Some Error Occurred or Please try signin with your google account'
      );
    },
    scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    onNonOAuthError: (error: nonoautherror) => {
      console.log(error);
      showAlert('info', error.message as string);
    },
  });

  const submitHandler = async () => {
    if (bucketName.trim() === '' || projectId.trim() === '') {
      setStatus('danger');
      setStatusMessage('Please Fill the Credentials');
      setTimeout(() => {
        setStatus('unknown');
      }, 5000);
    } else {
      googleLogin();
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
      submitLabel={buttonCaptions.submit}
    >
      <div className='w-full inline-block'>
        <TextInput
          id='project id'
          value={projectId}
          disabled={false}
          label='Project ID'
          aria-label='Project ID'
          placeholder=''
          autoFocus
          fluid
          required
          onChange={(e) => {
            setprojectId(e.target.value);
          }}
        ></TextInput>
        <TextInput
          id='bucketname'
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
          id='foldername'
          value={folderName}
          disabled={false}
          label='Folder Name'
          aria-label='Folder Name'
          helpText='Optional'
          placeholder=''
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
