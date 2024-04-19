import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator } from '@neo4j-ndl/react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps, OptionType, UserCredentials } from '../types';
import { updateGraphAPI } from '../services/UpdateGraph';
import GraphViewModal from './GraphViewModal';
import { initialiseDriver } from '../utils/Driver';
import Driver from 'neo4j-driver/types/driver';

const Content: React.FC<ContentProps> = ({ isExpanded, showChatBot, openChatBot }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials, driver, setDriver } = useCredentials();
  const { filesData, setFilesData, setModel, model } = useFileContext();
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
          port: neo4jConnection.uri.split(':')[2],
        });
        initialiseDriver(
          neo4jConnection.uri,
          neo4jConnection.user,
          neo4jConnection.password,
          neo4jConnection.database
        ).then((driver: Driver) => {
          if (driver) {
            setConnectionStatus(true);
            setDriver(driver);
          } else {
            setConnectionStatus(false);
          }
        });
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

  const disableCheck = !filesData.some((f) => f.status === 'New');

  const handleDropdownChange = (option: OptionType | null | void) => {
    if (option?.value) {
      setModel(option?.value);
    }
  };

  const extractData = async (uid: number) => {
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
          throw new Error(
            `error:${apiResponse.message},message:${apiResponse.message},fileName:${apiResponse.file_name}`
          );
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
        const messageMatch = errorMessage.match(/message:(.*),fileName:(.*),error:(.*)/);
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
          const errorMessage = messageMatch[3].trim();
          setShowAlert(true);
          setErrorMessage(message);
          setFilesData((prevfiles) =>
            prevfiles.map((curfile) => {
              if (curfile.name == fileName) {
                return {
                  ...curfile,
                  status: 'Failed',
                  errorMessage,
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
    if (filesData.length > 0) {
      for (let i = 0; i < filesData.length; i++) {
        if (filesData[i]?.status === 'New') {
          data.push(extractData(i));
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
    const connectURL = `${userCredentials?.userName}@${userCredentials?.uri}%3A${userCredentials?.port ?? '7687'}`;
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

  const disconnect = () => {
    driver?.close();
    setConnectionStatus(false);
    localStorage.removeItem('password');
    setUserCredentials({ uri: '', password: '', userName: '', database: '' });
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
            <Button className='mr-2.5' onClick={disconnect}>
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
              // loading={filesData.some((f) => f?.status === 'Processing')}
              disabled={disableCheck}
              onClick={handleGenerateGraph}
              className='mr-0.5'
            >
              Generate Graph
            </Button>
            <Button
              disabled={!filesData.some((f) => f?.status === 'Completed')}
              onClick={handleGraphView}
              className='mr-0.5'
            >
              Show Graph
            </Button>
            <Button
              onClick={handleOpenGraphClick}
              disabled={!filesData.some((f) => f?.status === 'Completed')}
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
