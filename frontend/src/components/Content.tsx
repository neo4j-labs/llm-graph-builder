import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../services/FileAPI';
import { ContentProps } from '../types';

const Content: React.FC<ContentProps> = ({ isExpanded }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData, setModel, model } = useFileContext();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!init) {
      let session = localStorage.getItem('neo4j.connection');
      if (session) {
        let neo4jConnection = JSON.parse(session);
        setUserCredentials({
          uri: neo4jConnection.uri,
          userName: neo4jConnection.user,
          password: neo4jConnection.password,
        });
        setDriver(neo4jConnection.uri, neo4jConnection.user, neo4jConnection.password).then((isSuccessful: boolean) => {
          setConnectionStatus(isSuccessful);
        });
      } else {
        setOpenConnection(true);
      }
      setInit(true);
    }
  }, []);

  useEffect(() => {
    setFilesData((prevfiles) => {
      return prevfiles.map((curfile) => {
        return { ...curfile, model: curfile.status === 'New' ? model : curfile.model };
      });
    });
  }, [model]);

  const disableCheck = !files.length;

  const handleDropdownChange = (option: any) => {
    setModel(option.value);
  };

  const extractData = async (file: File, uid: number) => {
    if (filesData[uid]?.status == 'New') {
      const apirequests = [];
      try {
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Processing',
              };
            }
            return curfile;
          })
        );
        const apiResponse = await extractAPI(
          file,
          filesData[uid].model,
          userCredentials,
          filesData[uid].s3url,
          localStorage.getItem('accesskey'),
          localStorage.getItem('secretkey')
        );
        apirequests.push(apiResponse);
        Promise.allSettled(apirequests)
          .then((r) => {
            r.forEach((apiRes) => {
              if (apiRes.status === 'fulfilled' && apiRes.value) {
                if (apiRes?.value?.status === 'Failed') {
                  setShowAlert(true);
                  setErrorMessage('Unexpected Error');
                  setFilesData((prevfiles) =>
                    prevfiles.map((curfile, idx) => {
                      if (idx == uid) {
                        return {
                          ...curfile,
                          status: 'Failed',
                        };
                      }
                      return curfile;
                    })
                  );
                  throw new Error('API Failure');
                } else {
                  setFilesData((prevfiles) => {
                    return prevfiles.map((curfile, idx) => {
                      if (idx == uid) {
                        const apiResponse = apiRes?.value?.data;
                        return {
                          ...curfile,
                          processing: apiResponse?.processingTime?.toFixed(2),
                          status: apiResponse?.status,
                          NodesCount: apiResponse?.nodeCount,
                          relationshipCount: apiResponse?.relationshipCount,
                          model: apiResponse?.model,
                        };
                      }
                      return curfile;
                    });
                  });
                }
              }
            });
          })
          .catch((err) => {
            console.log(err);
          });
      } catch (err: any) {
        console.log(err);
        setShowAlert(true);
        setErrorMessage(err.message);
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Failed',
              };
            }
            return curfile;
          })
        );
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGenerateGraph = () => {
    setIsLoading(true);
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i].status === 'New') {
          extractData(files[i], i);
        }
      }
    }
  };

  const handleClose = () => {
    setShowAlert(false);
  };

  const classNameCheck = isExpanded ? 'fileTableWithExpansion' : 'fileTableNoExpansion';
  return (
    <>
      <CustomAlert open={showAlert} handleClose={handleClose} alertMessage={errorMessage} />
      <div
        className={`n-bg-palette-neutral-bg-default ${classNameCheck}`}
      >
        <Flex className='w-full' alignItems='center' justifyContent='space-between' style={{ flexFlow: 'row' }}>
          <ConnectionModal
            open={openConnection}
            setOpenConnection={setOpenConnection}
            setConnectionStatus={setConnectionStatus}
          />
          <Typography
            variant='body-medium'
            style={{ display: 'flex', padding: '20px', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant='body-medium'>
              {!connectionStatus ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
            </Typography>
            Neo4j connection
          </Typography>
          {!connectionStatus ? (
            <Button className='mr-2.5' onClick={() => setOpenConnection(true)}>
              Connect to Neo4j
            </Button>
          ) : (
            <Button className='mr-2.5' onClick={() => disconnect().then(() => setConnectionStatus(false))}>
              Disconnect
            </Button>
          )}
        </Flex>
        <FileTable></FileTable>
        <Flex
          className='w-full p-2.5 absolute bottom-4'
          justifyContent='space-between'
          style={{ flexFlow: 'row', marginTop: '5px' }}
        >
          <LlmDropdown onSelect={handleDropdownChange} isDisabled={disableCheck} />
          <Button loading={isLoading} disabled={disableCheck} onClick={handleGenerateGraph} className='mr-0.5'>
            Generate Graph
          </Button>
        </Flex>
      </div>
    </>
  );
}

export default Content;