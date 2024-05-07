import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator } from '@neo4j-ndl/react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps, OptionType, UserCredentials, alertState } from '../types';
import { updateGraphAPI } from '../services/UpdateGraph';
import GraphViewModal from './GraphViewModal';
import { initialiseDriver } from '../utils/Driver';
import Driver from 'neo4j-driver/types/driver';
import { url } from '../utils/Utils';

const Content: React.FC<ContentProps> = ({ isExpanded, showChatBot, openChatBot }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials, driver, setDriver } = useCredentials();
  const { filesData, setFilesData, setModel, model, selectedNodes, selectedRels } = useFileContext();
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView'>('tableView');
  const [alertDetails, setalertDetails] = useState<alertState>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });

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
  const perchunksecond = parseInt(process.env.TIME_PER_CHUNK as string);
  useEffect(() => {
    const pendingfilesstr = localStorage.getItem('pendingfiles');
    const neo4jconnection = localStorage.getItem('neo4j.connection');
    if (pendingfilesstr && neo4jconnection) {
      const pendingfiles = JSON.parse(pendingfilesstr);
      const credentials = JSON.parse(neo4jconnection);
      if (pendingfiles.length) {
        pendingfiles.forEach((element: string) => {
          let encodedstr;
          if (credentials?.password) {
            encodedstr = btoa(credentials?.password);
          }
          let alertShown = false;
          const eventSource = new EventSource(
            `${url()}/update_extract_status/${element}?url=${credentials?.uri}&userName=${
              credentials?.user
            }&password=${encodedstr}&database=${credentials?.database}`
          );
          eventSource.onmessage = (event) => {
            const eventResponse = JSON.parse(event.data);
            if (eventResponse.status === 'Completed') {
              setFilesData((prevfiles) => {
                return prevfiles.map((curfile) => {
                  if (curfile.name == eventResponse.fileName) {
                    return {
                      ...curfile,
                      status: eventResponse.status,
                      NodesCount: eventResponse?.nodeCount,
                      relationshipCount: eventResponse?.relationshipCount,
                      model: eventResponse?.model,
                      processing: eventResponse?.processingTime?.toFixed(2),
                    };
                  }
                  return curfile;
                });
              });
              const pendingfilesstr = localStorage.getItem('pendingfiles');
              if (pendingfilesstr) {
                const pendingfiles: string[] = JSON.parse(pendingfilesstr);
                for (let index = 0; index < pendingfiles.length; index++) {
                  if (pendingfiles[index] === eventResponse.fileName) {
                    console.log(pendingfiles[index]);
                    pendingfiles.splice(index, 1);
                  }
                }
                localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
              }
              eventSource.close();
            } else {
              const minutes = Math.floor((perchunksecond * eventResponse.total_chunks) / 60);
              if (eventResponse.status === 'Processing' && !alertShown) {
                setalertDetails({
                  showAlert: true,
                  alertType: 'info',
                  alertMessage: `${eventResponse.fileName} will take approx ${minutes} Min`,
                });
                alertShown = true;
              }
              const pendingfilestr = localStorage.getItem('pendingfiles');
              if (pendingfilestr) {
                const pendingfiles = JSON.parse(pendingfilestr);
                const isfilepresent = pendingfiles.findIndex((a: string) => a === eventResponse.fileName);
                if (isfilepresent == -1) {
                  pendingfiles.push(eventResponse.fileName);
                  localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
                }
              } else {
                const pendingfiles = [eventResponse.fileName];
                localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
              }
            }
          };
        });
      }
    }
  }, []);

  const disableCheck = !filesData.some((f) => f.status === 'New');

  const handleDropdownChange = (option: OptionType | null | void) => {
    if (option?.value) {
      setModel(option?.value);
    }
  };

  const extractData = async (uid: number) => {
    if (filesData[uid]?.status == 'New') {
      const filesize = filesData[uid].size;
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

        if (filesize != undefined && filesize > 10000000) {
          let encodedstr;
          if (userCredentials?.password) {
            encodedstr = btoa(userCredentials?.password);
          }
          let alertShowed = false;
          const eventSource = new EventSource(
            `${url()}/update_extract_status/${filesData[uid].name}?url=${userCredentials?.uri}&userName=${
              userCredentials?.userName
            }&password=${encodedstr}&database=${userCredentials?.database}`
          );
          eventSource.onmessage = (event) => {
            const eventResponse = JSON.parse(event.data);
            if (eventResponse.status === 'Completed') {
              setFilesData((prevfiles) => {
                return prevfiles.map((curfile) => {
                  if (curfile.name == eventResponse.fileName) {
                    return {
                      ...curfile,
                      status: eventResponse.status,
                      NodesCount: eventResponse?.nodeCount,
                      relationshipCount: eventResponse?.relationshipCount,
                      model: eventResponse?.model,
                      processing: eventResponse?.processingTime?.toFixed(2),
                    };
                  }
                  return curfile;
                });
              });
              const pendingfilesstr = localStorage.getItem('pendingfiles');
              if (pendingfilesstr) {
                const pendingfiles = JSON.parse(pendingfilesstr);
                for (let index = 0; index < pendingfiles.length; index++) {
                  if (pendingfiles[index] === eventResponse.fileName) {
                    pendingfiles.splice(index, 1);
                  }
                }
                localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
              }
              eventSource.close();
            } else {
              const minutes = Math.floor((perchunksecond * eventResponse.total_chunks) / 60);
              if (eventResponse.status === 'Processing' && !alertShowed) {
                setalertDetails({
                  showAlert: true,
                  alertType: 'info',
                  alertMessage: `${eventResponse.fileName} will take approx ${minutes} Min`,
                });
                alertShowed = true;
              }
              const pendingfilestr = localStorage.getItem('pendingfiles');
              if (pendingfilestr) {
                const pendingfiles = JSON.parse(pendingfilestr);
                const isfilepresent = pendingfiles.findIndex((a: string) => a === eventResponse.fileName);
                if (isfilepresent == -1) {
                  pendingfiles.push(eventResponse.fileName);
                  localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
                }
              } else {
                const pendingfiles = [eventResponse.fileName];
                localStorage.setItem('pendingfiles', JSON.stringify(pendingfiles));
              }
            }
          };
        }

        const apiResponse = await extractAPI(
          filesData[uid].model,
          userCredentials as UserCredentials,
          filesData[uid].fileSource,
          filesData[uid].source_url,
          localStorage.getItem('accesskey'),
          localStorage.getItem('secretkey'),
          filesData[uid].name ?? '',
          filesData[uid].gcsBucket ?? '',
          filesData[uid].gcsBucketFolder ?? '',
          selectedNodes.map((l) => l.value),
          selectedRels.map((t) => t.value)
        );

        if (apiResponse?.status === 'Failed') {
          let errorobj = { error: apiResponse.error, message: apiResponse.message, fileName: apiResponse.file_name };
          throw new Error(JSON.stringify(errorobj));
        } else if (filesize != undefined && filesize < 10000000) {
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
        const error = JSON.parse(err.message);
        if (Object.keys(error).includes('fileName')) {
          const { message } = error;
          const { fileName } = error;
          const errorMessage = error.message;
          console.log({ message, fileName, errorMessage });
          setalertDetails({
            showAlert: true,
            alertType: 'error',
            alertMessage: message,
          });
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
    setalertDetails({
      showAlert: false,
      alertType: 'info',
      alertMessage: '',
    });
  };

  const handleOpenGraphClick = () => {
    const bloomUrl = process.env.BLOOM_URL;
    const uriCoded = userCredentials?.uri.replace(/:\d+$/, '');
    const connectURL = `${uriCoded?.split('//')[0]}//${userCredentials?.userName}@${uriCoded?.split('//')[1]}:${
      userCredentials?.port ?? '7687'
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

  const disconnect = () => {
    driver?.close();
    setConnectionStatus(false);
    localStorage.removeItem('password');
    setUserCredentials({ uri: '', password: '', userName: '', database: '' });
  };

  return (
    <>
      {alertDetails.showAlert && (
        <CustomAlert
          severity={alertDetails.alertType}
          open={alertDetails.showAlert}
          handleClose={handleClose}
          alertMessage={alertDetails.alertMessage}
        />
      )}
      <div className={`n-bg-palette-neutral-bg-default ${classNameCheck}`}>
        <Flex className='w-full' alignItems='center' justifyContent='space-between' flexDirection='row'>
          <ConnectionModal
            open={openConnection}
            setOpenConnection={setOpenConnection}
            setConnectionStatus={setConnectionStatus}
          />
          <div className='connectionstatus__container'>
            <span className='h6 px-1'>Neo4j connection</span>
            <Typography variant='body-medium'>
              {!connectionStatus ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
              {connectionStatus ? (
                <span className='n-body-small'>{userCredentials?.uri}</span>
              ) : (
                <span className='n-body-small'>Not Connected</span>
              )}
            </Typography>
          </div>

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
              Open Graph with Bloom
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
