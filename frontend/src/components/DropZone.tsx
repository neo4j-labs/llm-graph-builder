import { Dropzone } from '@neo4j-ndl/react';
import { useState, useEffect, FunctionComponent } from 'react';
import Loader from '../utils/Loader';
import { uploadAPI } from '../services/Upload';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { saveFileToLocal } from '../utils/utils';
interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
}

const DropZone: FunctionComponent<{ isBackendConnected: Boolean }> = (props) => {
  const { files, filesData, setFiles, setFilesData } = useFileContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const { userCredentials } = useCredentials();

  const fileUpload = async (file: File, uid: number) => {
    if (filesData[uid].status == 'None' && isClicked) {
      const apirequests = [];
      try {
        setIsLoading(true);
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Processing',
                type: curfile.type?.split('/')[1].toUpperCase(),
              };
            } else {
              return curfile;
            }
          })
        );
        console.log('Before API CALL', file);
        const apiResponse = await uploadAPI(file, userCredentials);
        apirequests.push(apiResponse);
        Promise.allSettled(apirequests)
          .then((r) => {
            r.forEach((apiRes) => {
              if (apiRes.status === 'fulfilled' && apiRes.value) {
                if (apiRes?.value?.data != 'Unexpected Error') {
                  setFilesData((prevfiles) =>
                    prevfiles.map((curfile, idx) => {
                      if (idx == uid) {
                        return {
                          ...curfile,
                          status: 'New',
                          type: 'PDF',
                        };
                      } else {
                        return curfile;
                      }
                    })
                  );
                  setIsClicked(false);
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
        setIsClicked(false);
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Failed',
                type: curfile.type?.split('/')[1].toUpperCase(),
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
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        fileUpload(files[i], i);
      }
    }
  }, [files]);

  return (
    <>
      {props.isBackendConnected && (
        <Dropzone
          loadingComponent={isLoading && <Loader />}
          isTesting={true}
          className='w-full h-full'
          dropZoneOptions={{
            accept: { 'application/pdf': ['.pdf'] },
            onDrop: (f: Partial<globalThis.File>[]) => {
              setIsClicked(true);
              f.forEach((i) => saveFileToLocal(i));
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
                setFilesData((prevfilesdata) => [...prevfilesdata, ...updatedFiles]);
              }
            },
          }}
        />
      )}
    </>
  );
};

export default DropZone;
