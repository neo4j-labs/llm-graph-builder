import { TextInput } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { useFileContext } from '../../../context/UsersFiles';
import { urlScanAPI } from '../../../services/URLScan';
import { CustomFileBase, GCSModalProps, fileName, nonoautherror } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../../../HOC/CustomModal';
import { useGoogleLogin } from '@react-oauth/google';
import { useAlertContext } from '../../../context/Alert';
import { buttonCaptions } from '../../../utils/Constants';
import { showErrorToast, showNormalToast } from '../../../utils/Toasts';

const GCSModal: React.FC<GCSModalProps> = ({ hideModal, open, openGCSModal }) => {
  const [bucketName, setBucketName] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
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
    chunkNodeCount: 0,
    chunkRelCount: 0,
    entityNodeCount: 0,
    entityEntityRelCount: 0,
    communityNodeCount: 0,
    communityRelCount: 0,
  };

  const reset = () => {
    setBucketName('');
    setFolderName('');
    setProjectId('');
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setStatus('info');
        setStatusMessage('Loading...');
        openGCSModal();
        const apiResponse = await urlScanAPI({
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
            htmlAttributes={{
              id: 'project id',
              autoFocus: true,
              onKeyDown: handleKeyPress,
              'aria-label': 'Project ID',
              placeholder: '',
            }}
            value={projectId}
            isDisabled={false}
            label='Project ID'
            isFluid={true}
            isRequired={true}
            onChange={(e) => {
              setProjectId(e.target.value);
            }}
          ></TextInput>
          <TextInput
            htmlAttributes={{
              id: 'bucketname',
              autoFocus: true,
              onKeyDown: handleKeyPress,
              'aria-label': 'Bucket Name',
              placeholder: '',
            }}
            value={bucketName}
            isDisabled={false}
            label='Bucket Name'
            isFluid={true}
            isRequired={true}
            onChange={(e) => {
              setBucketName(e.target.value);
            }}
          />
          <TextInput
            htmlAttributes={{
              id: 'foldername',
              autoFocus: true,
              onKeyDown: handleKeyPress,
              'aria-label': 'Folder Name',
              placeholder: '',
            }}
            value={folderName}
            isDisabled={false}
            label='Folder Name'
            helpText='Optional'
            isFluid={true}
            onChange={(e) => {
              setFolderName(e.target.value);
            }}
          />
        </form>
      </div>
    </CustomModal>
  );
};
export default GCSModal;
