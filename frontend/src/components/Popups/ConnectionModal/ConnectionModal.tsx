import { Button, Dialog, TextInput, Select, Banner, Dropzone, Typography, TextLink, Flex } from '@neo4j-ndl/react';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { connectAPI } from '../../../services/ConnectAPI';
import { useCredentials } from '../../../context/UserCredentials';
import { useSearchParams } from 'react-router-dom';
import { buttonCaptions } from '../../../utils/Constants';
import { createVectorIndex } from '../../../services/VectorIndexCreation';
import { ConnectionModalProps, Message, UserCredentials } from '../../../types';
import VectorIndexMisMatchAlert from './VectorIndexMisMatchAlert';
import { useAuth0 } from '@auth0/auth0-react';
import { createDefaultFormData } from '../../../API/Index';

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
  const { user } = useAuth0();
  const {
    setUserCredentials,
    userCredentials,
    setGdsActive,
    setIsReadOnlyUser,
    errorMessage,
    setIsGCSActive,
    setShowDisconnectButton,
    // setChunksToBeProces,
  } = useCredentials();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [userDbVectorIndex, setUserDbVectorIndex] = useState<number | undefined>(initialuserdbvectorindex ?? undefined);
  const [vectorIndexLoading, setVectorIndexLoading] = useState<boolean>(false);

  const connectRef = useRef<HTMLButtonElement>(null);
  const uriRef = useRef<HTMLInputElement>(null);
  const databaseRef = useRef<HTMLInputElement>(null);
  const userNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

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
    async (isNewVectorIndex: boolean, usercredential: UserCredentials) => {
      if (usercredential != null && Object.values(usercredential).length) {
        try {
          setVectorIndexLoading(true);
          const response = await createVectorIndex(isNewVectorIndex);
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
                uri: usercredential?.uri,
                userName: usercredential?.userName,
                password: btoa(usercredential.password ?? ''),
                database: usercredential?.database,
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
      }
    },
    [userCredentials, userDbVectorIndex]
  );
  useEffect(() => {
    if (isVectorIndexMatch || chunksExistsWithoutEmbedding) {
      setMessage({
        type: 'danger',
        content: (
          <VectorIndexMisMatchAlert
            recreateVectorIndex={() =>
              recreateVectorIndex(chunksExistsWithDifferentEmbedding, userCredentials as UserCredentials)
            }
            isVectorIndexAlreadyExists={chunksExistsWithDifferentEmbedding || isVectorIndexMatch}
            userVectorIndexDimension={JSON.parse(localStorage.getItem('neo4j.connection') ?? 'null').userDbVectorIndex}
            chunksExists={chunksExistsWithoutEmbedding}
          />
        ),
      });
    }
  }, [isVectorIndexMatch, chunksExistsWithDifferentEmbedding, chunksExistsWithoutEmbedding, userCredentials]);

  useEffect(() => {
    if (errorMessage) {
      setMessage({ type: 'warning', content: errorMessage });
    }
  }, [errorMessage]);

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
        console.log({ err });
        setMessage({ type: 'danger', content: err.message });
      }
    }
    setIsLoading(false);
  };

  const submitConnection = async (email: string) => {
    const connectionURI = `${protocol}://${URI}${URI.split(':')[1] ? '' : `:${port}`}`;
    const credential = {
      uri: connectionURI,
      userName: username,
      password: password,
      database: database,
      port: port,
      email,
    };
    setUserCredentials(credential);
    createDefaultFormData(credential);
    setIsLoading(true);
    try {
      const response = await connectAPI();
      setIsLoading(false);
      if (response?.data?.status !== 'Success') {
        throw new Error(response.data.error);
      } else {
        const isgdsActive = response.data.data.gds_status;
        const isReadOnlyUser = !response.data.data.write_access;
        const isGCSActive = response.data.data.gcs_file_cache === 'True';
        const chunksTobeProcess = parseInt(response.data.data.chunk_to_be_created);
        setIsGCSActive(isGCSActive);
        setGdsActive(isgdsActive);
        setIsReadOnlyUser(isReadOnlyUser);
        // setChunksToBeProces(chunksTobeProcess);
        localStorage.setItem(
          'neo4j.connection',
          JSON.stringify({
            uri: connectionURI,
            userName: username,
            password: btoa(password),
            database: database,
            userDbVectorIndex,
            isgdsActive,
            isReadOnlyUser,
            isGCSActive,
            chunksTobeProcess,
            email: user?.email ?? '',
            connection: 'connectAPI',
          })
        );
        setUserDbVectorIndex(response.data.data.db_vector_dimension);
        if (
          (response.data.data.application_dimension === response.data.data.db_vector_dimension ||
            response.data.data.db_vector_dimension == 0) &&
          !response.data.data.chunks_exists
        ) {
          setConnectionStatus(true);
          setShowDisconnectButton(true);
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
                recreateVectorIndex={() => recreateVectorIndex(false, credential)}
                isVectorIndexAlreadyExists={response.data.data.db_vector_dimension != 0}
                chunksExists={true}
              />
            ),
          });
          return;
        } else {
          setMessage({
            type: 'danger',
            content: (
              <VectorIndexMisMatchAlert
                recreateVectorIndex={() => recreateVectorIndex(true, credential)}
                isVectorIndexAlreadyExists={
                  response.data.data.db_vector_dimension != 0 &&
                  response.data.data.db_vector_dimension != response.data.data.application_dimension
                }
                chunksExists={true}
                userVectorIndexDimension={response.data.data.db_vector_dimension}
              />
            ),
          });
          return;
        }
      }
    } catch (error) {
      console.log({ error });
      setIsLoading(false);
      if (error instanceof Error) {
        setMessage({ type: 'danger', content: error.message });
        setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
        setPassword('');
        setConnectionStatus(false);
      }
    }
    setTimeout(() => {
      if (connectionMessage?.type != 'danger') {
        setMessage({ type: 'unknown', content: '' });
      }
      setPassword('');
    }, 3000);
  };

  const onClose = useCallback(() => {
    setMessage({ type: 'unknown', content: '' });
  }, []);

  const handleKeyPress =
    (email: string) => (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement>) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        // @ts-ignore
        const { form } = e.target;
        if (form) {
          const index = Array.prototype.indexOf.call(form, e.target);
          if (index + 1 < form.elements.length) {
            form.elements[index + 1].focus();
          } else {
            submitConnection(email);
          }
        } else {
          nextRef?.current?.focus();
        }
      }
    };

  const isDisabled = useMemo(() => !username || !URI || !password, [username, URI, password]);

  return (
    <>
      <Dialog
        size='small'
        isOpen={open}
        onClose={() => {
          setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
          setMessage({ type: 'unknown', content: '' });
        }}
        hasDisabledCloseButton={vectorIndexLoading}
        htmlAttributes={{
          'aria-labelledby': 'form-dialog-title',
        }}
      >
        <Dialog.Header htmlAttributes={{ id: 'form-dialog-title' }}>Connect to Neo4j</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          <Typography variant='body-medium' className='mb-4'>
            <TextLink isExternalLink href='https://console.neo4j.io/'>
              Don't have a Neo4j instance? Start for free today
            </TextLink>
          </Typography>
          {connectionMessage?.type !== 'unknown' &&
            (vectorIndexLoading ? (
              <Banner
                name='Connection Modal'
                isCloseable={false}
                type={connectionMessage?.type}
                description={connectionMessage?.content}
                usage='inline'
              ></Banner>
            ) : (
              <Banner
                name='Connection Modal'
                isCloseable
                onClose={onClose}
                type={connectionMessage?.type}
                description={connectionMessage?.content}
                usage='inline'
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
            <Select
              label='Protocol'
              type='select'
              size='medium'
              isDisabled={false}
              selectProps={{
                onChange: (newValue) => newValue && setProtocol(newValue.value),
                options: protocols.map((option) => ({ label: option, value: option })),
                value: { label: protocol, value: protocol },
              }}
              className='w-1/4 inline-block'
              isFluid
              htmlAttributes={{
                id: 'protocol',
              }}
            />
            <div className='ml-[5%] w-[70%] inline-block'>
              <TextInput
                ref={uriRef}
                htmlAttributes={{
                  id: 'url',
                  autoFocus: true,
                  onPaste: (e) => handleHostPasteChange(e),
                  onKeyDown: (e) => handleKeyPress(user?.email ?? '')(e, databaseRef),
                  'aria-label': 'Connection URI',
                }}
                value={URI}
                isDisabled={false}
                label='URI'
                isFluid={true}
                onChange={(e) => setURI(e.target.value)}
              />
            </div>
          </div>
          <form>
            <TextInput
              ref={databaseRef}
              htmlAttributes={{
                id: 'database',
                onKeyDown: handleKeyPress(user?.email ?? ''),
                'aria-label': 'Database',
                placeholder: 'neo4j',
              }}
              value={database}
              isDisabled={false}
              label='Database'
              isFluid={true}
              isRequired={true}
              onChange={(e) => setDatabase(e.target.value)}
              className='w-full'
            />
            <div className='n-flex n-flex-row n-flex-wrap mb-2'>
              <div className='w-[48.5%] mr-1.5 inline-block'>
                <TextInput
                  ref={userNameRef}
                  htmlAttributes={{
                    id: 'username',
                    onKeyDown: handleKeyPress(user?.email ?? ''),
                    'aria-label': 'Username',
                    placeholder: 'neo4j',
                  }}
                  value={username}
                  isDisabled={false}
                  label='Username'
                  isFluid={true}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className='w-[48.5%] ml-[1.5%] inline-block'>
                <TextInput
                  ref={passwordRef}
                  htmlAttributes={{
                    id: 'password',
                    onKeyDown: handleKeyPress(user?.email ?? ''),
                    type: 'password',
                    'aria-label': 'Password',
                    placeholder: 'password',
                    autoComplete: 'current-password',
                  }}
                  value={password}
                  isDisabled={false}
                  label='Password'
                  isFluid={true}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </form>
          <Flex flexDirection='row' justifyContent='flex-end'>
            <Button
              isLoading={isLoading}
              isDisabled={isDisabled}
              onClick={() => submitConnection(user?.email ?? '')}
              ref={connectRef}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  submitConnection(user?.email ?? '');
                }
              }}
            >
              {buttonCaptions.connect}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
