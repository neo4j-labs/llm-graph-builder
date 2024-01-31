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
  relationshipCount: number;
}

export default function DropZone() {
  const [filesdata, setFilesdata] = useState<CustomFile[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const { userCredentials } = useCredentials();

  const fileUpload = async (file: File, uid: number) => {
    if (filesdata[uid].status == 'None') {
      const apirequests = [];
      try {
        setIsLoading(true);
        setFilesdata((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
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
        apirequests.push(apiResponse);
        Promise.allSettled(apirequests)
          .then((r) => {
            r.forEach((apiRes) => {
              if (apiRes.status === 'fulfilled' && apiRes.value) {
                if (apiRes?.value?.data != 'Unexpected Error') {
                  setFilesdata((prevfiles) =>
                    prevfiles.map((curfile, idx) => {
                      if (idx == uid) {
                        return {
                          ...curfile,
                          processing: apiRes?.value?.data?.processingTime?.toFixed(2),
                          status: apiRes?.value?.data?.status,
                          NodesCount: apiRes?.value?.data?.nodeCount,
                          relationshipCount: apiRes?.value?.data?.relationshipCount,
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
              }
            });
          })
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
        setIsLoading(false);
        setFilesdata((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
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
      for (let i = 0; i < files.length; i++) {
        fileUpload(files[i], i);
      }
    }
  }, [files]);

  return (
    <>
      <Box
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
                    relationshipCount: 0,
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
