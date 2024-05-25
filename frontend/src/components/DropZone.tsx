import axios from 'axios';
import { Dropzone } from '@neo4j-ndl/react';
import React, { useState, useEffect, FunctionComponent } from 'react';
import Loader from '../utils/Loader';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { CustomFile, alertState } from '../types';
import { chunkSize } from '../utils/Constants';
import { url } from '../utils/Utils';

const DropZone: FunctionComponent = () => {
  const { filesData, setFilesData, model } = useFileContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [alertDetails, setalertDetails] = React.useState<alertState>({
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
      const defaultValues: CustomFile = {
        processing: 0,
        status: 'None',
        NodesCount: 0,
        relationshipCount: 0,
        type: 'PDF',
        model: model,
        fileSource: 'local file',
        uploadprogess: 0,
      };

      const copiedFilesData: CustomFile[] = [...filesData];

      f.forEach((file) => {
        const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === file?.name);
        if (filedataIndex == -1) {
          copiedFilesData.unshift({
            name: file.name,
            type: file.type,
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
          });
        }
      });
      setFilesData(copiedFilesData);
    }
  };

  const handleClose = () => {
    setalertDetails({
      showAlert: false,
      alertMessage: '',
      alertType: 'error',
    });
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
          const apiResponse = await axios.post(`${url()}/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          if (apiResponse?.data.status === 'Failed') {
            throw new Error(`message:${apiResponse.data.message},fileName:${apiResponse.data.file_name}`);
          } else {
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
                  type: curfile.type?.split('/')[1]?.toUpperCase() ?? 'PDF',
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
        loadingComponent={isLoading && <Loader />}
        isTesting={true}
        className='!bg-none'
        supportedFilesDescription={'Supports: PDF Files'}
        dropZoneOptions={{
          accept: { 'application/pdf': ['.pdf'] },
          onDrop: (f: Partial<globalThis.File>[]) => {
            onDropHandler(f);
          },
          onDropRejected: (e) => {
            if (e.length) {
              setalertDetails({
                showAlert: true,
                alertType: 'error',
                alertMessage: 'Failed To Upload, File is larger than 15MB',
              });
            }
          },
        }}
      />
    </>
  );
};

export default DropZone;
