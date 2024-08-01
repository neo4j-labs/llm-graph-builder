import { CloudArrowUpIconSolid } from '@neo4j-ndl/react/icons';
import { useDropzone } from 'react-dropzone';
import { useFileContext } from '../../../context/UsersFiles';
import { useEffect, useState } from 'react';
import { useCredentials } from '../../../context/UserCredentials';
import { alertStateType, CustomFile, CustomFileBase, UserCredentials } from '../../../types';
import { chunkSize } from '../../../utils/Constants';
import { uploadAPI } from '../../../utils/FileAPI';
import CustomAlert from '../../UI/Alert';
import { v4 as uuidv4 } from 'uuid';
import { LoadingSpinner } from '@neo4j-ndl/react';

export default function DropZoneForSmallLayouts() {
  const { filesData, setFilesData, model } = useFileContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  useEffect(() => {
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file, uid) => {
        if (filesData[uid]?.status == 'None' && isClicked) {
          uploadFileInChunks(file);
        }
      });
    }
  }, [selectedFiles]);
  const handleClose = () => {
    setalertDetails((prev) => ({ ...prev, showAlert: false, alertMessage: '' }));
  };
  const uploadFileInChunks = (file: File) => {
    const totalChunks = Math.ceil(file.size / chunkSize);
    const chunkProgressIncrement = 100 / totalChunks;
    let chunkNumber = 1;
    let start = 0;
    let end = chunkSize;
    const uploadNextChunk = async () => {
      if (chunkNumber <= totalChunks) {
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkNumber', chunkNumber.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('originalname', file.name);
        formData.append('model', model);
        for (const key in userCredentials) {
          formData.append(key, userCredentials[key]);
        }
        setIsLoading(true);
        setFilesData((prevfiles) =>
          prevfiles.map((curfile) => {
            if (curfile.name == file.name) {
              return {
                ...curfile,
                status: 'Uploading',
              };
            }
            return curfile;
          })
        );
        try {
          const apiResponse = await uploadAPI(
            chunk,
            userCredentials as UserCredentials,
            model,
            chunkNumber,
            totalChunks,
            file.name
          );
          if (apiResponse?.status === 'Failed') {
            throw new Error(`message:${apiResponse.data.message},fileName:${apiResponse.data.file_name}`);
          } else {
            if (apiResponse.data) {
              setFilesData((prevfiles) =>
                prevfiles.map((curfile) => {
                  if (curfile.name == file.name) {
                    return {
                      ...curfile,
                      uploadprogess: chunkNumber * chunkProgressIncrement,
                    };
                  }
                  return curfile;
                })
              );
            }
            setFilesData((prevfiles) =>
              prevfiles.map((curfile) => {
                if (curfile.name == file.name) {
                  return {
                    ...curfile,
                    uploadprogess: chunkNumber * chunkProgressIncrement,
                  };
                }
                return curfile;
              })
            );
            chunkNumber++;
            start = end;
            if (start + chunkSize < file.size) {
              end = start + chunkSize;
            } else {
              end = file.size + 1;
            }
            uploadNextChunk();
          }
        } catch (error) {
          setIsLoading(false);
          setalertDetails({
            showAlert: true,
            alertType: 'error',
            alertMessage: 'Error  Occurred',
          });
          setFilesData((prevfiles) =>
            prevfiles.map((curfile) => {
              if (curfile.name == file.name) {
                return {
                  ...curfile,
                  status: 'Failed',
                  type: `${file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length).toUpperCase()}`,
                };
              }
              return curfile;
            })
          );
        }
      } else {
        setFilesData((prevfiles) =>
          prevfiles.map((curfile) => {
            if (curfile.name == file.name) {
              return {
                ...curfile,
                status: 'New',
                uploadprogess: 100,
              };
            }
            return curfile;
          })
        );
        setIsClicked(false);
        setIsLoading(false);
        setalertDetails({
          showAlert: true,
          alertType: 'success',
          alertMessage: `${file.name} uploaded successfully`,
        });
      }
    };

    uploadNextChunk();
  };
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.svg'],
      'text/html': ['.html'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-powerpoint': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/markdown': ['.md'],
    },
    onDrop: (f: Partial<globalThis.File>[]) => {
      onDropHandler(f);
    },
    onDropRejected: (e) => {
      if (e.length) {
        setalertDetails({
          showAlert: true,
          alertType: 'error',
          alertMessage: 'Failed To Upload, Unsupported file extention',
        });
      }
    },
    disabled: isLoading,
  });

  const onDropHandler = (f: Partial<globalThis.File>[]) => {
    setIsClicked(true);
    setSelectedFiles(f.map((f) => f as File));
    setIsLoading(false);
    if (f.length) {
      const defaultValues: CustomFileBase = {
        processing: 0,
        status: 'None',
        NodesCount: 0,
        relationshipCount: 0,
        model: model,
        fileSource: 'local file',
        uploadprogess: 0,
        processingProgress: undefined,
      };

      const copiedFilesData: CustomFile[] = [...filesData];

      f.forEach((file) => {
        const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === file?.name);
        if (filedataIndex == -1) {
          copiedFilesData.unshift({
            name: file.name,
            // @ts-ignore
            type: `${file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length).toUpperCase()}`,
            size: file.size,
            uploadprogess: file.size && file?.size < chunkSize ? 100 : 0,
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
    }
  };
  console.log(acceptedFiles);
  return (
    <>
      {alertDetails.showAlert && (
        <CustomAlert
          open={alertDetails.showAlert}
          handleClose={handleClose}
          severity={alertDetails.alertType}
          alertMessage={alertDetails.alertMessage}
        />
      )}
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        {isLoading ? <LoadingSpinner size='medium' /> : <CloudArrowUpIconSolid />}
      </div>
    </>
  );
}
