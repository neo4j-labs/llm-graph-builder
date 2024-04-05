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
import { ContentProps, OptionType, UserCredentials } from '../types';
import { updateGraphAPI } from '../services/UpdateGraph';
import GraphViewModal from './GraphViewModal';

const Content: React.FC<ContentProps> = ({ isExpanded, showChatBot, openChatBot }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData, setModel, model } = useFileContext();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView'>('tableView');

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

  const handleDropdownChange = (option: OptionType | null | void) => {
    if (option?.value) {
      setModel(option?.value);
    }
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
          userCredentials as UserCredentials,
          filesData[uid].fileSource,
          filesData[uid].source_url,
          localStorage.getItem('accesskey'),
          localStorage.getItem('secretkey'),
          filesData[uid].name ?? '',
          filesData[uid].gcsBucket ?? '',
          filesData[uid].gcsBucketFolder ?? ''
        );
        if (apiResponse?.status === 'Failed') {
          setShowAlert(true);
          setErrorMessage(apiResponse?.message);
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
          throw new Error(`message:${apiResponse.message},fileName:${apiResponse.file_name}`);
        } else {
          setFilesData((prevfiles) => {
            return prevfiles.map((curfile) => {
              if (curfile.name == apiResponse?.data?.fileName) {
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
        const errorMessage = err.message;
        const messageMatch = errorMessage.match(/message:(.*),fileName:(.*)/);
        if (err?.name === 'AxiosError') {
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
        } else {
          const message = messageMatch[1].trim();
          const fileName = messageMatch[2].trim();
          setShowAlert(true);
          setErrorMessage(message);
          setFilesData((prevfiles) =>
            prevfiles.map((curfile) => {
              if (curfile.name == fileName) {
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
    }
  };

  const handleGenerateGraph = () => {
    const data = [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i]?.status === 'New') {
          data.push(extractData(files[i] as File, i));
        }
      }
      Promise.allSettled(data).then(async (_) => {
        await updateGraphAPI(userCredentials as UserCredentials);
      });
    }
  };

  const handleClose = () => {
    setShowAlert(false);
  };

  const handleOpenGraphClick = () => {
    const bloomUrl = process.env.BLOOM_URL;
    const connectURL = `${userCredentials?.userName}@${localStorage.getItem('hostname')}%3A${
      localStorage.getItem('port') ?? '7687'
    }`;
    const encodedURL = encodeURIComponent(connectURL);
    const replacedUrl = bloomUrl?.replace('{CONNECT_URL}', encodedURL);
    window.open(replacedUrl, '_blank');
  };

  const classNameCheck =
    isExpanded && showChatBot
      ? 'contentWithBothDrawers'
      : isExpanded
      ? 'contentWithExpansion'
      : showChatBot
      ? 'contentWithChatBot'
      : 'contentWithNoExpansion';

  const handleGraphView = () => {
    setOpenGraphView(true);
    setViewPoint('showGraphView');
  };

  return (
    <>
      <CustomAlert open={showAlert} handleClose={handleClose} alertMessage={errorMessage} />

      <div className={`n-bg-palette-neutral-bg-default ${classNameCheck}`}>
        <Flex className='w-full' alignItems='center' justifyContent='space-between' flexDirection='row'>
          <ConnectionModal
            open={openConnection}
            setOpenConnection={setOpenConnection}
            setConnectionStatus={setConnectionStatus}
          />
          <Typography variant='body-medium' className='connectionstatus__container'>
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
          onInspect={(name) => {
            setInspectedName(name);
            setOpenGraphView(true);
            setViewPoint('tableView');
          }}
        ></FileTable>
        <Flex
          className='w-full p-2.5 absolute bottom-4 mt-1.5 self-start'
          justifyContent='space-between'
          flexDirection='row'
        >
          <LlmDropdown onSelect={handleDropdownChange} isDisabled={disableCheck} />
          <Flex flexDirection='row' gap='4' className='self-end'>
            <Button
              loading={filesData.some((f) => f?.status === 'Processing')}
              disabled={disableCheck}
              onClick={handleGenerateGraph}
              className='mr-0.5'
            >
              Generate Graph
            </Button>
            <Button
              disabled={disableCheckGraph || !filesData.some((f) => f?.status === 'Completed')}
              onClick={handleGraphView}
              className='mr-0.5'
            >
              Show Graph
            </Button>
            <Button
              onClick={handleOpenGraphClick}
              disabled={disableCheckGraph || !filesData.some((f) => f?.status === 'Completed')}
              className='ml-0.5'
            >
              Open Graph
            </Button>
            <Button
              onClick={() => {
                openChatBot();
              }}
            >
              Q&A Chat
            </Button>
          </Flex>
        </Flex>
      </div>
      <GraphViewModal
        inspectedName={inspectedName}
        open={openGraphView}
        setGraphViewOpen={setOpenGraphView}
        viewPoint={viewPoint}
      />
    </>
  );
};

export default Content;
