import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { extractAPI } from '../services/Extract';

export default function Content() {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData } = useFileContext();
  const [selectedOption, setSelectedOption] = useState<string>('');

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
  });

  const handleDropdownChange = (option: any) => {
    setSelectedOption(option.value);
  }

  const fileUpload = async (file: File, uid: number) => {
    if (filesData[uid].status == 'Failed') {
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
        const apiResponse = await extractAPI(file, selectedOption, userCredentials);
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
                          processing: apiRes?.value?.data?.data?.processingTime?.toFixed(2),
                          status: apiRes?.value?.data?.data?.status,
                          NodesCount: apiRes?.value?.data?.data?.nodeCount,
                          relationshipCount: apiRes?.value?.data?.data?.relationshipCount,
                        };
                      } else {
                        return curfile;
                      }
                    })
                  );
                } else {
                  throw new Error('API Failure');
                }
              }
            });
          })
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
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
    };
  }

  const handleGenerateGraph = async () => {
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i].status === 'Failed') {
          fileUpload(files[i], i);
        }
      }
    }
  }
  return (
    <div
      className='n-bg-palette-neutral-bg-default'
      style={{
        width: '100%',
        height: 'calc(100dvh - 67px)',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
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
            {!connectionStatus ? <Label color='danger'>Not connected</Label> : <Label color='success'>Connected</Label>}
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
      <Flex
        flexDirection='column'
        style={{
          padding: '12px',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          width: '100%',
          marginTop: '10px',
          height: '100%',
        }}
      >
        <FileTable></FileTable>
        <div style={{ marginTop: '15px', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <LlmDropdown onSelect={handleDropdownChange} />
          <Button disabled={files.length > 0 ? false : true} onClick={handleGenerateGraph}>Generate Graph</Button>
        </div>
      </Flex>
    </div>
  );
}
