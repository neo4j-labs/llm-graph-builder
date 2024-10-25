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
import { showErrorToast, showNormalToast } from '../../../utils/toasts';

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
    processingTotalTime: 0,
    status: 'New',
    nodesCount: 0,
    relationshipsCount: 0,
    type: 'TEXT',
    model: model,
    fileSource: 'gcs bucket',
    processingProgress: undefined,
    retryOption: '',
    retryOptionStatus: false,
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
          showErrorToast(apiResponse?.data?.message);
          setTimeout(() => {
            setStatus('unknown');
            reset();
            hideModal();
          }, 5000);
          return;
        }
        const apiResCheck = apiResponse?.data?.success_count && apiResponse.data.failed_count;
        if (apiResCheck) {
          showNormalToast(
            `Successfully Created Source Nodes for ${apiResponse.data.success_count} and Failed for ${apiResponse.data.failed_count} Files`
          );
        } else if (apiResponse?.data?.success_count) {
          showNormalToast(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        } else if (apiResponse.data.failed_count) {
          showErrorToast(`Failed to Created Source Node for ${apiResponse.data.failed_count} Files`);
        } else {
          showErrorToast(`Invalid Folder Name`);
        }
        const copiedFilesData = [...filesData];
        if (apiResponse?.data?.file_name?.length) {
          for (let index = 0; index < apiResponse?.data?.file_name.length; index++) {
            const item: fileName = apiResponse?.data?.file_name[index];
            const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item.fileName);
            if (filedataIndex == -1) {
              copiedFilesData.unshift({
                name: item.fileName,
                size: item.fileSize ?? 0,
                gcsBucket: item.gcsBucketName,
                gcsBucketFolder: item.gcsBucketFolder,
                googleProjectId: item.gcsProjectId,
                id: uuidv4(),
                accessToken: codeResponse.access_token,
                ...defaultValues,
                uploadProgress: 100,
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
                accessToken: codeResponse.access_token,
                uploadProgress: 100,
              });
            }
          }
        }
        setFilesData(copiedFilesData);
        reset();
      } catch (error) {
        if (showAlert != undefined) {
          showNormalToast('Some Error Occurred or Please Check your Instance Connection');
        }
      }
      setTimeout(() => {
        setStatus('unknown');
        hideModal();
      }, 500);
    },
    onError: (errorResponse) => {
      showErrorToast(
        errorResponse.error_description ?? 'Some Error Occurred or Please try signin with your google account'
      );
    },
    scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    onNonOAuthError: (error: nonoautherror) => {
      console.log(error);
      showNormalToast(error.message as string);
    },
  });

  const submitHandler = () => {
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
  const handleKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.code === 'Enter') {
      e.preventDefault(); //
      // @ts-ignore
      const { form } = e.target;
      const index = Array.prototype.indexOf.call(form, e.target);
      if (index + 1 < form.elements.length) {
        form.elements[index + 1].focus();
      } else {
        submitHandler();
      }
    }
  };
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
        <form>
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
            onKeyDown={handleKeyPress}
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
            onKeyDown={handleKeyPress}
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
            onKeyDown={handleKeyPress}
          />
        </form>
      </div>
    </CustomModal>
  );
};
export default GCSModal;
