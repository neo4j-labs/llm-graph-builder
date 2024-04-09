import { Button, Dialog, TextInput, Dropdown, Banner, Dropzone } from '@neo4j-ndl/react';
import { Dispatch, SetStateAction, useState } from 'react';
import connectAPI from '../services/ConnectAPI';
import { useCredentials } from '../context/UserCredentials';

interface Message {
  type: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  content: string;
}

interface ConnectionModalProps {
  open: boolean;
  setOpenConnection: Dispatch<SetStateAction<boolean>>;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
  message?: Message;
}

export default function ConnectionModal({
  open,
  setOpenConnection,
  setConnectionStatus,
  message,
}: ConnectionModalProps) {
  const protocols = ['neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc'];
  const [protocol, setProtocol] = useState<string>(localStorage.getItem('selectedProtocol') ?? 'neo4j+s');
  const [URI, setURI] = useState<string>(localStorage.getItem('hostname') ?? 'localhost');
  const [port, setPort] = useState<number>(7687);
  const [database, setDatabase] = useState<string>(localStorage.getItem('database') ?? 'neo4j');
  const [username, setUsername] = useState<string>(localStorage.getItem('username') ?? 'neo4j');
  const [password, setPassword] = useState<string>('');
  const [connectionMessage, setMessage] = useState<Message | null>(null);
  const { setUserCredentials } = useCredentials();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const parseAndSetURI = (uri: string) => {
    const uriParts = uri.split('://');
    const uriHost = uriParts.pop() || URI;
    setURI(uriHost);
    const uriProtocol = uriParts.pop() || protocol;
    setProtocol(uriProtocol);
    const uriPort = Number(uriParts.pop()) || port;
    setPort(uriPort);
  };

  const handleHostPasteChange: React.ClipboardEventHandler<HTMLInputElement> = (event) => {
    event.clipboardData.items[0]?.getAsString((value) => {
      parseAndSetURI(value);
    });
  };

  const onDropHandler = async (files: Partial<globalThis.File>[]) => {
    setIsLoading(true);
    if (files.length) {
      const [file] = files;

      if (file.text) {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        const configObject = lines.reduce((acc: Record<string, string>, line: string) => {
          if (line.startsWith('#') || line.trim() === '') {
            return acc;
          }

          const [key, value] = line.split('=');
          if (['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'NEO4J_DATABASE'].includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {});
        parseAndSetURI(configObject.NEO4J_URI);
        setUsername(configObject.NEO4J_USERNAME);
        setPassword(configObject.NEO4J_PASSWORD);
        setDatabase(configObject.NEO4J_DATABASE);
      }
    }
    setIsLoading(false);
  };

  const submitConnection = async () => {
    const connectionURI = `${protocol}://${URI}${URI.split(':')[1] ? '' : `:${port}`}`;
    setIsLoading(true);
    await connectAPI(connectionURI, username, password, database).then((isSuccessful: any) => {
      if (isSuccessful?.data?.status === 'Success') {
        setOpenConnection(false);
        setConnectionStatus(true);
        setMessage(isSuccessful.data.message);
      } else {
        setOpenConnection(false);
        setMessage({
          type: 'danger',
          content: 'Connection failed, please check the developer console logs for more informations',
        });
        setPassword('');
        setTimeout(() => {
          setMessage({
            type: 'neutral',
            content: '',
          });
        }, 5000);
      }
      setIsLoading(false);
    });
  };

  return (
    <>
      <Dialog size='small' open={open} aria-labelledby='form-dialog-title' disableCloseButton>
        <Dialog.Header id='form-dialog-title'>Connect to Neo4j</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          {message && <Banner type={message.type}>{message.content}</Banner>}
          {connectionMessage && <Banner type={connectionMessage.type}>{connectionMessage.content}</Banner>}
          <div className='n-flex max-h-44'>
            <Dropzone
              isTesting={false}
              customTitle={<>Drop your env file here</>}
              className='n-p-6 end-0 top-0 w-full h-full'
              acceptedFileExtensions={['.txt', '.env']}
              dropZoneOptions={{
                onDrop: (f: Partial<globalThis.File>[]) => {
                  onDropHandler(f);
                },
                maxSize: 500,
                onDropRejected: (e) => {
                  if (e.length) {
                    // eslint-disable-next-line no-console
                    console.log(`Failed To Upload, File is larger than 500 bytes`);
                  }
                },
              }}
            />
            {isLoading && <div>Loading...</div>}
          </div>
          <div className='n-flex n-flex-row n-flex-wrap'>
            <Dropdown
              id='protocol'
              label='Protocol'
              type='select'
              size='medium'
              disabled={false}
              selectProps={{
                onChange: (newValue) => newValue && setProtocol(newValue.value),
                options: protocols.map((option) => ({ label: option, value: option })),
                value: { label: protocol, value: protocol },
              }}
              className='w-1/4 inline-block'
              fluid
            />
            <div className='ml-[5%] w-[70%] inline-block'>
              <TextInput
                id='url'
                value={URI}
                disabled={false}
                label='URI'
                autoFocus
                fluid
                onChange={(e) => setURI(e.target.value)}
                onPaste={(e) => handleHostPasteChange(e)}
                aria-label='Connection hostname'
              />
            </div>
          </div>
          <TextInput
            id='database'
            value={database}
            disabled={false}
            label='Database'
            aria-label='Database'
            placeholder='neo4j'
            fluid
            required
            onChange={(e) => setDatabase(e.target.value)}
            className='w-full'
          />
          <div className='n-flex n-flex-row n-flex-wrap mb-2'>
            <div className='w-[48.5%] mr-1.5 inline-block'>
              <TextInput
                id='username'
                value={username}
                disabled={false}
                label='Username'
                aria-label='Username'
                placeholder='neo4j'
                fluid
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className='w-[48.5%] ml-[1.5%] inline-block'>
              <TextInput
                id='password'
                value={password}
                disabled={false}
                label='Password'
                aria-label='Password'
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
