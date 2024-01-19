import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useBrowseCardVisibility } from '../context/BrowseToggle';
import DropZone from './DropZone';

export default function Content() {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { showBrowseCard } = useBrowseCardVisibility()
  useEffect(() => {
    if (!init) {
      let session = localStorage.getItem('neo4j.connection');
      if (session) {
        let neo4jConnection = JSON.parse(session);
        setDriver(neo4jConnection.uri, neo4jConnection.user, neo4jConnection.password).then((isSuccessful: boolean) => {
          setConnectionStatus(isSuccessful);
        });
      }
      setInit(true);
    }
  });

  return (
    <>
      <div

        style={{
          width: '100%',
          padding: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <div className='n-bg-palette-neutral-bg-default' style={{
          width: '100%',
          padding: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}>
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
            <Button onClick={() => setOpenConnection(true)}>Connect to Neo4j</Button>
          ) : (
            <Button onClick={() => disconnect().then(() => setConnectionStatus(false))}>Disconnect</Button>
          )}
        </div>
        {connectionStatus && <Flex
          borderRadius="xl"
          flexDirection="column"
          style={{
            border: '1px solid rgb(var(--theme-palette-neutral-border-weak))',
            padding: '12px',
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            marginTop: "10px"
          }}
        >
          <DropZone />
        </Flex>}

      </div>

    </>
  );
}
