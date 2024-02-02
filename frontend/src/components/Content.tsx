import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import LlmDropdown from './Dropdown';
import { useCredentials } from '../context/UserCredentials';
import FileTable from './FileTable';

export default function Content() {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials } = useCredentials();

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
          <LlmDropdown />
          <Button onClick={() => console.log('hello')}>Generate Graph</Button>
        </div>
      </Flex>
    </div>
  );
}
