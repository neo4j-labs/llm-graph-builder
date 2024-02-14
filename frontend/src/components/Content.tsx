import React, { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { extractAPI } from '../services/Extract';
import CustomAlert from './Alert';
export default function Content() {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData, setModel, model } = useFileContext();
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [showAlert, setShowAlert] = React.useState<boolean>(false);
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
      }
      setInit(true);
    }
  }, []);

  useEffect(() => {
    setFilesData((prevfiles) => {
      return prevfiles.map((curfile) => {
        return { ...curfile, model: curfile.status === "New" ? model : curfile.model }
      })
    })
  }, [model])

  const disableCheck = (!files.length || !filesData.some((f)=>f.status === 'New'));
  const handleDropdownChange = (option: any) => {
    setModel(option.value);
  };

  const extractData = async (file: File, uid: number) => {
    if (filesData[uid].status == 'Failed' || filesData[uid].status == 'New') {
      const apirequests = [];
      try {
        setFilesData((prevfiles) =>
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
        const apiResponse = await extractAPI(file, filesData[uid].model, userCredentials);
        apirequests.push(apiResponse);
        Promise.allSettled(apirequests)
          .then((r) => {
            r.forEach((apiRes) => {
              if (apiRes.status === 'fulfilled' && apiRes.value) {
                if (apiRes?.value?.data.status != 'Unexpected Error') {
                  setFilesData((prevfiles) =>
                    prevfiles.map((curfile, idx) => {
                      if (idx == uid) {
                        return {
                          ...curfile,
                          processing: apiRes?.value?.data?.data?.processingTime?.toFixed(2),
                          status: apiRes?.value?.data?.data?.status,
                          NodesCount: apiRes?.value?.data?.data?.nodeCount,
                          relationshipCount: apiRes?.value?.data?.data?.relationshipCount,
                          model: apiRes?.value?.data?.data?.model,
                        };
                      } else {
                        return curfile;
                      }
                    })
                  );
                } else {
                  setShowAlert(true);
                  setErrorMessage('Unexpected Error');
                  throw new Error('API Failure');
                }
              }
            });
          })
          .catch((err) => console.log(err));
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
            } else {
              return curfile;
            }
          })
        );
      }
    }
  };

  const handleGenerateGraph = async () => {
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
  return (
    <>
      <CustomAlert open={showAlert} handleClose={handleClose} alertMessage={errorMessage} />
      <div
        className='n-bg-palette-neutral-bg-default'
        style={{
          width: 'calc(-342px + 100dvw)',
          height: 'calc(100dvh - 70px)',
          padding: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          position: 'relative',
        }}
      >
        <Flex className='w-full' alignItems='center' justifyContent='space-between' style={{ flexFlow: 'row' }}>
          <ConnectionModal
            open={openConnection}
            setOpenConnection={setOpenConnection}
            setConnectionStatus={setConnectionStatus}
          />
          <Typography variant='body-medium' style={{ display: 'flex', padding: '20px' }}>
            Neo4j connection Status:
            <Typography variant='body-medium' style={{ marginLeft: '10px' }}>
              {!connectionStatus ? (
                <Label color='danger'>Not connected</Label>
              ) : (
                <Label color='success'>Connected</Label>
              )}
            </Typography>
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
          <LlmDropdown onSelect={handleDropdownChange} isDisabled= {disableCheck} />
          <Button disabled={disableCheck} onClick={handleGenerateGraph} className='mr-0.5'>
            Generate Graph
          </Button>
        </Flex>
      </div>
    </>
  );
}
