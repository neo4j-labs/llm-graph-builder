import { Button, Dialog, TextInput, Dropdown, Banner, Dropzone, Typography, TextLink, Flex } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import connectAPI from '../../../services/ConnectAPI';
import { useCredentials } from '../../../context/UserCredentials';
import { useSearchParams } from 'react-router-dom';
import { buttonCaptions } from '../../../utils/Constants';
import { createVectorIndex } from '../../../services/vectorIndexCreation';
import { ConnectionModalProps, Message, UserCredentials } from '../../../types';
import VectorIndexMisMatchAlert from './VectorIndexMisMatchAlert';

export default function ConnectionModal({
  open,
  setOpenConnection,
  setConnectionStatus,
  isVectorIndexMatch,
  chunksExistsWithoutEmbedding,
  chunksExistsWithDifferentEmbedding,
}: ConnectionModalProps) {
  let prefilledconnection = localStorage.getItem('neo4j.connection');
  let initialuri;
  let initialdb;
  let initialusername;
  let initialport;
  let initialprotocol;
  let initialuserdbvectorindex;
  if (prefilledconnection) {
    let parsedcontent = JSON.parse(prefilledconnection);
    initialuserdbvectorindex = parsedcontent.userDbVectorIndex;
    let urisplit = parsedcontent?.uri?.split('://');
    initialuri = urisplit[1];
    initialdb = parsedcontent?.database;
    initialusername = parsedcontent?.user;
    initialport = initialuri.split(':')[1];
    initialprotocol = urisplit[0];
  }
  const protocols = ['neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc'];
  const [protocol, setProtocol] = useState<string>(initialprotocol ?? 'neo4j+s');
  const [URI, setURI] = useState<string>(initialuri ?? '');
  const [port, setPort] = useState<string>(initialport ?? '7687');
  const [database, setDatabase] = useState<string>(initialdb ?? 'neo4j');
  const [username, setUsername] = useState<string>(initialusername ?? 'neo4j');
  const [password, setPassword] = useState<string>('');
  const [connectionMessage, setMessage] = useState<Message | null>({ type: 'unknown', content: '' });
  const { setUserCredentials, userCredentials } = useCredentials();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [userDbVectorIndex, setUserDbVectorIndex] = useState<number | undefined>(initialuserdbvectorindex ?? undefined);
  const [vectorIndexLoading, setVectorIndexLoading] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.has('connectURL')) {
      const url = searchParams.get('connectURL');
      parseAndSetURI(url as string, true);
      searchParams.delete('connectURL');
      setSearchParams(searchParams);
    }
    return () => {
      setUserDbVectorIndex(undefined);
    };
  }, [open]);

  const recreateVectorIndex = useCallback(
    async (isNewVectorIndex: boolean) => {
      try {
        setVectorIndexLoading(true);
        const response = await createVectorIndex(userCredentials as UserCredentials, isNewVectorIndex);
        setVectorIndexLoading(false);
        if (response.data.status === 'Failed') {
          throw new Error(response.data.error);
        } else {
          setMessage({
            type: 'success',
            content: 'Successfully created the vector index',
          });
          setConnectionStatus(true);
          localStorage.setItem(
            'neo4j.connection',
            JSON.stringify({
              uri: userCredentials?.uri,
              user: userCredentials?.userName,
              password: userCredentials?.password,
              database: userCredentials?.database,
              userDbVectorIndex: 384,
            })
          );
        }
      } catch (error) {
        setVectorIndexLoading(false);
        if (error instanceof Error) {
          console.log('Error in recreating the vector index', error.message);
          setMessage({ type: 'danger', content: error.message });
        }
      }
      setTimeout(() => {
        setMessage({ type: 'unknown', content: '' });
        setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
      }, 3000);
    },
    [userCredentials, userDbVectorIndex]
  );
  useEffect(() => {
    if (isVectorIndexMatch || chunksExistsWithoutEmbedding) {
      setMessage({
        type: 'danger',
        content: (
          <VectorIndexMisMatchAlert
            vectorIndexLoading={vectorIndexLoading}
            recreateVectorIndex={() => recreateVectorIndex(chunksExistsWithDifferentEmbedding)}
            isVectorIndexAlreadyExists={chunksExistsWithDifferentEmbedding || isVectorIndexMatch}
            userVectorIndexDimension={JSON.parse(localStorage.getItem('neo4j.connection') ?? 'null').userDbVectorIndex}
            chunksExists={chunksExistsWithoutEmbedding}
          />
        ),
      });
    }
  }, [isVectorIndexMatch, vectorIndexLoading, chunksExistsWithDifferentEmbedding, chunksExistsWithoutEmbedding]);

  const parseAndSetURI = (uri: string, urlparams = false) => {
    const uriParts: string[] = uri.split('://');
    let uriHost: string[] | string;
    if (urlparams) {
      // @ts-ignore
      uriHost = uriParts.pop().split('@');
      // @ts-ignore
      const hostParts = uriHost.pop()?.split('-');
      if (hostParts != undefined) {
        if (hostParts.length == 2) {
          setURI(hostParts.pop() as string);
          setDatabase(hostParts.pop() as string);
        } else {
          setURI(hostParts.pop() as string);
          setDatabase('neo4j');
        }
      }
      const usercredentialsparts = uriHost.pop()?.split(':');
      setPassword(usercredentialsparts?.pop() as string);
      setUsername(usercredentialsparts?.pop() as string);
      setProtocol(uriParts.pop() as string);
    } else {
      uriHost = uriParts.pop() || URI;
      setURI(uriHost);
    }

    const uriProtocol = uriParts.pop() || protocol;
    setProtocol(uriProtocol);
    const uriPort = uriParts.pop() || port;
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
      try {
        if (file.text && file.size !== 0) {
          const text = await file.text();
          const lines = text.split(/\r?\n/);
          const configObject = lines.reduce((acc: Record<string, string>, line: string) => {
            if (line.startsWith('#') || line.trim() === '') {
              return acc;
            }

            const [key, value] = line.split('=');
            if (['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'NEO4J_DATABASE', 'NEO4J_PORT'].includes(key)) {
              acc[key] = value;
            }
            return acc;
          }, {});
          parseAndSetURI(configObject.NEO4J_URI);
          setUsername(configObject.NEO4J_USERNAME ?? 'neo4j');
          setPassword(configObject.NEO4J_PASSWORD ?? '');
          setDatabase(configObject.NEO4J_DATABASE ?? 'neo4j');
          setPort(configObject.NEO4J_PORT ?? '7687');
        } else {
          setMessage({ type: 'danger', content: 'Please drop a valid file' });
        }
      } catch (err: any) {
        setMessage({ type: 'danger', content: err.message });
      }
    }
    setIsLoading(false);
  };

  const submitConnection = async () => {
    const connectionURI = `${protocol}://${URI}${URI.split(':')[1] ? '' : `:${port}`}`;
    setUserCredentials({ uri: connectionURI, userName: username, password: password, database: database, port: port });
    setIsLoading(true);
    try {
      const response = await connectAPI(connectionURI, username, password, database);
      setIsLoading(false);
      if (response?.data?.status !== 'Success') {
        throw new Error(response.data.error);
      } else {
        setUserDbVectorIndex(response.data.data.db_vector_dimension);
        if (
          (response.data.data.application_dimension === response.data.data.db_vector_dimension ||
            response.data.data.db_vector_dimension == 0) &&
          !response.data.data.chunks_exists
        ) {
          setConnectionStatus(true);
          setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
          setMessage({
            type: 'success',
            content: response.data.data.message,
          });
        } else if ((response.data.data.chunks_exists ?? true) && response.data.data.db_vector_dimension == 0) {
          setMessage({
            type: 'danger',
            content: (
              <VectorIndexMisMatchAlert
                vectorIndexLoading={vectorIndexLoading}
                recreateVectorIndex={() =>
                  recreateVectorIndex(
                    !(
                      response.data.data.db_vector_dimension > 0 &&
                      response.data.data.db_vector_dimension != response.data.data.application_dimension
                    )
                  )
                }
                isVectorIndexAlreadyExists={response.data.data.db_vector_dimension != 0}
                chunksExists={true}
              />
            ),
          });
        } else {
          setMessage({
            type: 'danger',
            content: (
              <VectorIndexMisMatchAlert
                vectorIndexLoading={vectorIndexLoading}
                recreateVectorIndex={() => recreateVectorIndex(true)}
                isVectorIndexAlreadyExists={
                  response.data.data.db_vector_dimension != 0 &&
                  response.data.data.db_vector_dimension != response.data.data.application_dimension
                }
                chunksExists={true}
                userVectorIndexDimension={response.data.data.db_vector_dimension}
              />
            ),
          });
        }
        localStorage.setItem(
          'neo4j.connection',
          JSON.stringify({
            uri: connectionURI,
            user: username,
            password: password,
            database: database,
            userDbVectorIndex,
          })
        );
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        setMessage({ type: 'danger', content: error.message });
        setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
        setPassword('');
        setConnectionStatus(false);
      }
    }
    setTimeout(() => {
      setPassword('');
    }, 3000);
  };

  const onClose = useCallback(() => {
    setMessage({ type: 'unknown', content: '' });
  }, []);

  const isDisabled = useMemo(() => !username || !URI || !password, [username, URI, password]);

  return (
    <>
      <Dialog
        size='small'
        open={open}
        aria-labelledby='form-dialog-title'
        onClose={() => {
          setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
          setMessage({ type: 'unknown', content: '' });
        }}
        disableCloseButton={vectorIndexLoading}
      >
        <Dialog.Header id='form-dialog-title'>Connect to Neo4j</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <Typography variant='body-medium' className='mb-4'>
            <TextLink externalLink href='https://console.neo4j.io/'>
              Don't have a Neo4j instance? Start for free today
            </TextLink>
          </Typography>
          {connectionMessage?.type !== 'unknown' &&
            (vectorIndexLoading ? (
              <Banner
                name='Connection Modal'
                closeable={false}
                type={connectionMessage?.type}
                description={connectionMessage?.content}
              ></Banner>
            ) : (
              <Banner
                name='Connection Modal'
                closeable
                onClose={onClose}
                type={connectionMessage?.type}
                description={connectionMessage?.content}
              ></Banner>
            ))}
          <div className='n-flex max-h-44'>
            <Dropzone
              isTesting={false}
              customTitle={<>{buttonCaptions.dropYourCreds}</>}
              className='n-p-6 end-0 top-0 w-full h-full'
              acceptedFileExtensions={['.txt', '.env']}
              dropZoneOptions={{
                onDrop: (f: Partial<globalThis.File>[]) => {
                  onDropHandler(f);
                },
                maxSize: 500,
                onDropRejected: (e) => {
                  if (e.length) {
                    setMessage({ type: 'danger', content: 'Failed To Upload, File is larger than 500 bytes' });
                  }
                },
              }}
            />
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
                aria-label='Connection URI'
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
          <Flex flexDirection='row' justifyContent='flex-end'>
            <Button loading={isLoading} disabled={isDisabled} onClick={() => submitConnection()}>
              {buttonCaptions.connect}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
