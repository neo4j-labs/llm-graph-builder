import { Dropzone, Flex, Typography } from '@neo4j-ndl/react';
import { useState, FunctionComponent, useEffect } from 'react';
import Loader from '../../../utils/Loader';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../../../context/UserCredentials';
import { useFileContext } from '../../../context/UsersFiles';
import { CustomFile, CustomFileBase } from '../../../types';
import { buttonCaptions, chunkSize } from '../../../utils/Constants';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { IconButtonWithToolTip } from '../../UI/IconButtonToolTip';
import { uploadAPI } from '../../../utils/FileAPI';
import { showErrorToast, showSuccessToast } from '../../../utils/Toasts';

const DropZone: FunctionComponent = () => {
  const { filesData, setFilesData, model } = useFileContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDropHandler = (f: Partial<globalThis.File>[]) => {
    setIsClicked(true);
    setSelectedFiles(f.map((f) => f as File));
    setIsLoading(false);
    if (f.length) {
      const defaultValues: CustomFileBase = {
        processingTotalTime: 0,
        status: 'None',
        nodesCount: 0,
        relationshipsCount: 0,
        model: model,
        fileSource: 'local file',
        uploadProgress: 0,
        processingProgress: undefined,
        retryOptionStatus: false,
        retryOption: '',
        chunkNodeCount: 0,
        chunkRelCount: 0,
        entityNodeCount: 0,
        entityEntityRelCount: 0,
        communityNodeCount: 0,
        communityRelCount: 0,
        createdAt: new Date(),
      };

      const copiedFilesData: CustomFile[] = [...filesData];
      for (let index = 0; index < f.length; index++) {
        const file = f[index];
        const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === file?.name);
        if (filedataIndex == -1) {
          copiedFilesData.unshift({
            name: file.name,
            // @ts-ignore
            type: `${file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length).toUpperCase()}`,
            size: file.size,
            uploadProgress: file.size && file?.size < chunkSize ? 100 : 0,
            id: uuidv4(),
            ...defaultValues,
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
          });
        }
      }
      setFilesData(copiedFilesData);
    }
  };
  useEffect(() => {
    if (selectedFiles.length > 0) {
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        if (filesData[index]?.status == 'None' && isClicked) {
          uploadFileInChunks(file);
        }
      }
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
          const apiResponse = await uploadAPI(chunk, model, chunkNumber, totalChunks, file.name);
          if (apiResponse?.status === 'Failed') {
            throw new Error(`message:${apiResponse.data.message},fileName:${apiResponse.data.file_name}`);
          } else {
            if (apiResponse.data) {
              setFilesData((prevfiles) =>
                prevfiles.map((curfile) => {
                  if (curfile.name == file.name) {
                    return {
                      ...curfile,
                      uploadProgress: chunkNumber * chunkProgressIncrement,
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
                    uploadProgress: chunkNumber * chunkProgressIncrement,
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
          if (error instanceof Error) {
            showErrorToast(`Error Occurred: ${error.message}`, true);
          }
          setFilesData((prevfiles) =>
            prevfiles.map((curfile) => {
              if (curfile.name == file.name) {
                return {
                  ...curfile,
                  status: 'Upload Failed',
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
                uploadProgress: 100,
                createdAt: new Date(),
              };
            }
            return curfile;
          })
        );
        setIsClicked(false);
        setIsLoading(false);
        showSuccessToast(`${file.name} uploaded successfully`);
      }
    };

    uploadNextChunk();
  };

  return (
    <>
      <Dropzone
        loadingComponent={isLoading && <Loader title='Uploading' />}
        isTesting={true}
        className='bg-none! dropzoneContainer'
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
                        <span>Microsoft Office (.docx, .pptx, .xls, .xlsx)</span>
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
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
          onDrop: (f: Partial<globalThis.File>[]) => {
            onDropHandler(f);
          },
          onDropRejected: (e) => {
            if (e.length) {
              showErrorToast('Failed To Upload, Unsupported file extention');
            }
          },
        }}
      />
    </>
  );
};

export default DropZone;
