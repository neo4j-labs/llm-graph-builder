import { Button, Dialog, TextInput, Dropdown } from '@neo4j-ndl/react';
import { useState } from 'react';
import { setDriver } from '../utils/Driver';

export default function ConnectionModal({ open, setOpenConnection, setConnectionStatus }) {
  const protocols = ['neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc'];
  const [selectedProtocol, setSelectedProtocol] = useState<string>('neo4j');
  const [hostname, setHostname] = useState<string>('demo.neo4jlabs.com');
  const [port, setPort] = useState<number>(7687);
  const [database, setDatabase] = useState<string>('recommendations');
  const [username, setUsername] = useState<string>('recommendations');
  const [password, setPassword] = useState<string>('recommendations');

  function submitConnection() {
    const connectionURI = `${selectedProtocol}://${hostname}:${port}`;
    setDriver(connectionURI, username, password).then((isSuccessful) => {
      setConnectionStatus(isSuccessful);
    });
    setOpenConnection(false);
  }

  return (
    <>
      <Dialog size='small' open={open} aria-labelledby='form-dialog-title' disableCloseButton>
        <Dialog.Header id='form-dialog-title'>Connect to Neo4j</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <div className='n-flex n-flex-row n-flex-wrap'>
            <Dropdown
              id='protocol'
              label='Protocol'
              type='select'
              disabled={false}
              selectProps={{
                onChange: (newValue) => newValue && setSelectedProtocol(newValue.value),
                options: protocols.map((option) => ({ label: option, value: option })),
                value: { label: selectedProtocol, value: selectedProtocol },
              }}
              style={{ width: '25%', display: 'inline-block' }}
              fluid
            />
            <div style={{ marginLeft: '2.5%', width: '55%', marginRight: '2.5%', display: 'inline-block' }}>
              <TextInput
                id='url'
                value={hostname}
                disabled={false}
                label='Hostname'
                placeholder='localhost'
                autoFocus
                fluid
                onChange={(e) => setHostname(e.target.value)}
              />
            </div>
            <div style={{ width: '15%', display: 'inline-block' }}>
              <TextInput
                id='port'
                value={port}
                disabled={false}
                label='Port'
                placeholder='7687'
                fluid
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </div>
          </div>
          <TextInput
            id='database'
            value={database}
            disabled={false}
            label='Database (optional)'
            placeholder='neo4j'
            fluid
            onChange={(e) => setDatabase(e.target.value)}
          />
          <div className='n-flex n-flex-row n-flex-wrap'>
            <div style={{ width: '48.5%', marginRight: '1.5%', display: 'inline-block' }}>
              <TextInput
                id='username'
                value={username}
                disabled={false}
                label='Username'
                placeholder='neo4j'
                fluid
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div style={{ width: '48.5%', marginLeft: '1.5%', display: 'inline-block' }}>
              <TextInput
                id='password'
                value={password}
                disabled={false}
                label='Password'
                placeholder='password'
                type='password'
                fluid
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => submitConnection()}>Submit</Button>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
