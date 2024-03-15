import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps } from '../types';
import { updateGraphAPI } from '../services/UpdateGraph';

const Content: React.FC<ContentProps> = ({ isExpanded }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData, setModel, model } = useFileContext();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);

  useEffect(() => {
    if (!init) {
      let session = localStorage.getItem('neo4j.connection');
      if (session) {
        let neo4jConnection = JSON.parse(session);
        setUserCredentials({
          uri: neo4jConnection.uri,
          userName: neo4jConnection.user,
          password: neo4jConnection.password,
          database: neo4jConnection.database,
        });
        setDriver(neo4jConnection.uri, neo4jConnection.user, neo4jConnection.password, neo4jConnection.database).then(
          (isSuccessful: boolean) => {
            setConnectionStatus(isSuccessful);
          }
        );
      } else {
        setOpenConnection(true);
      }
      setInit(true);
    }
  }, []);

  useEffect(() => {
    setFilesData((prevfiles) => {
      return prevfiles.map((curfile) => {
        return { ...curfile, model: curfile.status === 'New' ? model : curfile.model };
      });
    });
  }, [model]);

  const disableCheck = !files.length || !filesData.some((f) => f.status === 'New');

  const disableCheckGraph = !files.length;

  const handleDropdownChange = (option: any) => {
    setModel(option.value);
  };

  const extractData = async (file: File, uid: number) => {
    if (filesData[uid]?.status == 'New') {
      try {
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Processing',
              };
            }
            return curfile;
          })
        );
        const apiResponse = await extractAPI(
          file,
          filesData[uid].model,
          userCredentials,
          filesData[uid].source_url,
          localStorage.getItem('accesskey'),
          localStorage.getItem('secretkey'),
          filesData[uid].max_sources,
          filesData[uid].wiki_query ?? ''
        );
        if (apiResponse?.data?.status === 'Failed') {
          setShowAlert(true);
          setErrorMessage(apiResponse?.data?.message);
          setFilesData((prevfiles) =>
            prevfiles.map((curfile, idx) => {
              if (idx == uid) {
                return {
                  ...curfile,
                  status: 'Failed',
                };
              }
              return curfile;
            })
          );
          throw new Error(apiResponse?.data?.message);
        } else {
          setFilesData((prevfiles) => {
            return prevfiles.map((curfile, idx) => {
              if (idx == uid) {
                const apiRes = apiResponse?.data;
                return {
                  ...curfile,
                  processing: apiRes?.processingTime?.toFixed(2),
                  status: apiRes?.status,
                  NodesCount: apiRes?.nodeCount,
                  relationshipCount: apiRes?.relationshipCount,
                  model: apiRes?.model,
                };
              }
              return curfile;
            });
          });
        }
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
            }
            return curfile;
          })
        );
      }
    }
  };

  const handleGenerateGraph = async () => {
    const data = [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i]?.status === 'New') {
          data.push(extractData(files[i], i));
        }
      }
      Promise.allSettled(data).then(async (_) => {
        await updateGraphAPI(userCredentials);
      });
    }
  };

  const handleClose = () => {
    setShowAlert(false);
  };

  const openGraphUrl = ` https://bloom-latest.s3.eu-west-2.amazonaws.com/assets/index.html?connectURL=${userCredentials?.userName}@${localStorage.getItem('hostname')}%3A${localStorage.getItem('port') ?? '7687'
    }&search=Show+me+a+graph`;

  const classNameCheck = isExpanded ? 'contentWithExpansion' : 'contentWithNoExpansion';
  return (
    <>
      <CustomAlert open={showAlert} handleClose={handleClose} alertMessage={errorMessage} />
      <div className={`n-bg-palette-neutral-bg-default ${classNameCheck}`}>
        <Flex className='w-full' alignItems='center' justifyContent='space-between' style={{ flexFlow: 'row' }}>
          <ConnectionModal
            open={openConnection}
            setOpenConnection={setOpenConnection}
            setConnectionStatus={setConnectionStatus}
          />
          <Typography
            variant='body-medium'
            style={{ display: 'flex', padding: '20px', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant='body-medium'>
              {!connectionStatus ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
            </Typography>
            Neo4j connection
          </Typography>
          {!connectionStatus ? (
            <Button className='mr-2.5' onClick={() => setOpenConnection(true)}>
              Connect to Neo4j
            </Button>
          ) : (
            <Button
              className='mr-2.5'
              onClick={() =>
                disconnect().then(() => {
                  setConnectionStatus(false);
                  localStorage.removeItem('neo4j.connection');
                  setUserCredentials({ uri: '', password: '', userName: '', database: '' });
                })
              }
            >
              Disconnect
            </Button>
          )}
        </Flex>
        <FileTable
          isExpanded={isExpanded}
          connectionStatus={connectionStatus}
          setConnectionStatus={setConnectionStatus}
        ></FileTable>
        <Flex
          className='w-full p-2.5 absolute bottom-4'
          justifyContent='space-between'
          style={{ flexFlow: 'row', marginTop: '5px', alignSelf: 'flex-start' }}
        >
          <LlmDropdown onSelect={handleDropdownChange} isDisabled={disableCheck} />
          <Flex flexDirection='row' gap='2' style={{ alignSelf: 'flex-end' }}>
            <Button
              loading={filesData.some((f) => f?.status === 'Processing')}
              disabled={disableCheck}
              onClick={handleGenerateGraph}
              className='mr-0.5'
            >
              Generate Graph
            </Button>
            <Button href={openGraphUrl} target='_blank' disabled={disableCheckGraph} className='ml-0.5'>
              Open Graph
            </Button>
          </Flex>
        </Flex>
      </div>
    </>
  );
};

export default Content;
