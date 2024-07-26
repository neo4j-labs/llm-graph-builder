import { Dropzone, Flex, Typography } from '@neo4j-ndl/react';
import React, { useState, useEffect, FunctionComponent } from 'react';
import Loader from '../../../utils/Loader';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../../../context/UserCredentials';
import { useFileContext } from '../../../context/UsersFiles';
import CustomAlert from '../../UI/Alert';
import { CustomFile, CustomFileBase, UserCredentials, alertStateType } from '../../../types';
import { buttonCaptions, chunkSize } from '../../../utils/Constants';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import IconButtonWithToolTip from '../../UI/IconButtonToolTip';
import { uploadAPI } from '../../../utils/FileAPI';

const DropZone: FunctionComponent = () => {
  const { filesData, setFilesData, model } = useFileContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [alertDetails, setalertDetails] = React.useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleClose = () => {
    setalertDetails((prev) => ({ ...prev, showAlert: false, alertMessage: '' }));
  };

  useEffect(() => {
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file, uid) => {
        if (filesData[uid]?.status == 'None' && isClicked) {
          uploadFileInChunks(file);
        }
      });
    }
  }, [selectedFiles]);
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

      <Dropzone
        loadingComponent={isLoading && <Loader title='Uploading' />}
        isTesting={true}
        className='!bg-none dropzoneContainer'
        supportedFilesDescription={
          <Typography variant='body-small'>
            <Flex>
              <span>{buttonCaptions.dropzoneSpan}</span>
              <div className='align-self-center'>
                <IconButtonWithToolTip
                  label='Source info'
                  clean
                  text={
                    <Typography variant='body-small'>
                      <Flex gap='3' alignItems='flex-start'>
                        <span>Microsoft Office (.docx, .pptx, .xls)</span>
                        <span>PDF (.pdf)</span>
                        <span>Images (.jpeg, .jpg, .png, .svg)</span>
                        <span>Text (.html, .txt , .md)</span>
                      </Flex>
                    </Typography>
                  }
                >
                  <InformationCircleIconOutline className='w-[22px] h-[22px]' />
                </IconButtonWithToolTip>
              </div>
            </Flex>
          </Typography>
        }
        dropZoneOptions={{
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
        }}
      />
    </>
  );
};

export default DropZone;
