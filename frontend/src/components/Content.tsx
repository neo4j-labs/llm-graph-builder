import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import DropZone from './DropZone';
import { useCredentials } from '../context/UserCredentials';

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
        height: 'calc(100dvh - 58px)',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Flex
        flexDirection='column'
        style={{
          padding: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginTop: '10px',
        }}
      >
        <DropZone />
      </Flex>
    </div>
  );
}
