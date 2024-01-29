import { Dropzone, Box, Label, Typography } from '@neo4j-ndl/react';
import { useState, useEffect } from 'react';
import FileTable from './FileTable';
import Loader from '../utils/Loader';
import { uploadAPI } from '../services/Upload';
import { healthStatus } from '../services/HealthStatus';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';

interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
}

export default function DropZone() {
  const [filesdata, setFilesdata] = useState<CustomFile[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const { userCredentials } = useCredentials();

  const fileUpload = async (file: File, uid: string) => {
    try {
      setIsLoading(true);
      setFilesdata((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.id == uid) {
            return {
              ...curfile,
              status: 'Processing',
            };
          } else {
            return curfile;
          }
        })
      );

      const apiResponse = await uploadAPI(file, userCredentials);

      if (apiResponse.data != 'Failure') {
        setFilesdata((prevfiles) =>
          prevfiles.map((curfile) => {
            if (curfile.id == uid) {
              return {
                ...curfile,
                processing: apiResponse?.data.processingTime.toFixed(2),
                status: apiResponse?.data?.status,
                NodesCount: apiResponse?.data?.nodeCount,
              };
            } else {
              return curfile;
            }
          })
        );
        setIsLoading(false);
      } else {
        throw new Error('API Failure');
      }
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      setFilesdata((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.id == uid) {
            return {
              ...curfile,
              status: 'Failed',
            };
          } else {
            return curfile;
          }
        })
      );
    }
  };

  useEffect(() => {
    async function getHealthStatus() {
      try {
        const response = await healthStatus();
        setIsBackendConnected(response.data.healthy);
      } catch (error) {
        setIsBackendConnected(false);
      }
    }
    getHealthStatus();
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      fileUpload(files[files.length - 1], filesdata[filesdata.length - 1].id);
    }
  }, [files]);

  return (
    <>
      <Box
        borderRadius='xl'
        className=' n-border n-border-palette-primary-border-strong'
        style={{
          width: '100%',
          padding: '0.8em',
        }}
      >
        <Typography variant='body-medium' style={{ display: 'flex', marginBlock: '10px', marginLeft: '5px' }}>
          Backend connection Status:
          <Typography variant='body-medium' style={{ marginLeft: '10px' }}>
            {!isBackendConnected ? (
              <Label color='danger'>Not connected</Label>
            ) : (
              <Label color='success'>Connected</Label>
            )}
          </Typography>
        </Typography>
        {isBackendConnected && (
          <Dropzone
            loadingComponent={isLoading && <Loader />}
            isTesting={true}
            dropZoneOptions={{
              accept: { 'application/pdf': ['.pdf'] },
              onDrop: (f: Partial<globalThis.File>[]) => {
                setIsLoading(false);
                if (f.length) {
                  const defaultValues: CustomFile = {
                    processing: 'None',
                    status: 'None',
                    NodesCount: 0,
                    id: uuidv4(),
                  };
                  const updatedFiles: CustomFile[] = f.map((file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    ...defaultValues,
                  }));
                  setFiles((prevfiles) => [...prevfiles, ...(f as File[])]);
                  setFilesdata((prevfilesdata) => [...prevfilesdata, ...updatedFiles]);
                }
              },
            }}
          />
        )}
      </Box>
      <div style={{ marginTop: '15px', width: '100%' }}>
        <div>{filesdata.length > 0 && <FileTable files={filesdata} />}</div>
      </div>
    </>
  );
}
