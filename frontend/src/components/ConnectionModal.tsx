import { Button, Dialog, TextInput, Dropdown } from '@neo4j-ndl/react';
import { useState } from 'react';
import { setDriver } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { ConnectionModalProps } from '../types';

const ConnectionModal: React.FunctionComponent<ConnectionModalProps> = ({
  open,
  setOpenConnection,
  setConnectionStatus,
}) => {
  const protocols = ['neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc'];
  const [selectedProtocol, setSelectedProtocol] = useState<string>('neo4j');
  const [hostname, setHostname] = useState<string>(localStorage.getItem('hostname') ?? '');
  const [port, setPort] = useState<string>(localStorage.getItem('port') ?? '');
  const [database, setDatabase] = useState<string>(localStorage.getItem('database') ?? 'neo4j');
  const [username, setUsername] = useState<string>(localStorage.getItem('username') ?? '');
  const [password, setPassword] = useState<string>('');
  const { setUserCredentials } = useCredentials();

  function submitConnection() {
    const connectionURI = `${selectedProtocol}://${hostname}:${port}`;
    setUserCredentials({ uri: hostname, userName: username, password:password, database: database, selectedProtocol:selectedProtocol });
    localStorage.setItem('username', username);
    localStorage.setItem('hostname', hostname);
    localStorage.setItem('port', `${port}`);
    localStorage.setItem('database', database);
    localStorage.setItem('selectedProtocol',selectedProtocol);
    setDriver(connectionURI, username, password, database,selectedProtocol).then((isSuccessful) => {
      setConnectionStatus(isSuccessful);
    });
    setOpenConnection(false);
  }
  const isDisabled = !username || !hostname || !password || !port;
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
                onChange={(e) => setPort(e.target.value)}
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
          <Dialog.Actions className='mt-6 mb-2'>
            <Button
              color='neutral'
              fill='outlined'
              onClick={() => {
                setOpenConnection(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={isDisabled} onClick={() => submitConnection()}>
              Submit
            </Button>
          </Dialog.Actions>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
export default ConnectionModal;
