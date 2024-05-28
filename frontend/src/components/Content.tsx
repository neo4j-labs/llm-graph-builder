import { useEffect, useState, useMemo } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator } from '@neo4j-ndl/react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps, CustomFile, OptionType, UserCredentials, alertStateType } from '../types';
import { updateGraphAPI } from '../services/UpdateGraph';
import GraphViewModal from './GraphViewModal';
import { initialiseDriver } from '../utils/Driver';
import Driver from 'neo4j-driver/types/driver';
import deleteAPI from '../services/deleteFiles';
import DeletePopUp from './DeletePopUp';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { useSearchParams } from 'react-router-dom';

const Content: React.FC<ContentProps> = ({ isExpanded, showChatBot, openChatBot }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials, driver, setDriver } = useCredentials();
  const { filesData, setFilesData, setModel, model, selectedNodes, selectedRels, selectedRows } = useFileContext();
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView'>('tableView');
  const [showDeletePopUp, setshowDeletePopUp] = useState<boolean>(false);
  const [deleteLoading, setdeleteLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const { updateStatusForLargeFiles } = useServerSideEvent(
    (min, fileName) => {
      setalertDetails({
        showAlert: true,
        alertType: 'info',
        alertMessage: `${fileName} will take approx ${min} Min`,
      });
      localStorage.setItem('alertShown', JSON.stringify(true));
    },
    (fileName) => {
      setalertDetails({
        showAlert: true,
        alertType: 'error',
        alertMessage: `${fileName} Failed to process`,
      });
    }
  );

  useEffect(() => {
    if (!init && !searchParams.has('connectURL')) {
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
            localStorage.setItem('alertShown', JSON.stringify(false));
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
    } else {
      setOpenConnection(true);
    }
  }, []);

  useEffect(() => {
    setFilesData((prevfiles) => {
      return prevfiles.map((curfile) => {
        return { ...curfile, model: curfile.status === 'New' ? model : curfile.model };
      });
    });
  }, [model]);

  const handleDropdownChange = (option: OptionType | null | void) => {
    if (option?.value) {
      setModel(option?.value);
    }
  };

  const extractData = async (uid: string, isselectedRows = false) => {
    if (!isselectedRows) {
      const fileItem = filesData.find((f) => f.id == uid);
      if (fileItem) {
        await extractHandler(fileItem, uid);
      }
    } else {
      const fileItem = selectedRows.find((f) => JSON.parse(f).id == uid);
      if (fileItem) {
        await extractHandler(JSON.parse(fileItem), uid);
      }
    }
  };

  const extractHandler = async (fileItem: CustomFile, uid: string) => {
    try {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.id === uid) {
            return {
              ...curfile,
              status: 'Processing',
            };
          }
          return curfile;
        })
      );

      if (fileItem.name != undefined && userCredentials != null) {
        const name = fileItem.name;
        triggerStatusUpdateAPI(
          name as string,
          userCredentials?.uri,
          userCredentials?.userName,
          userCredentials?.password,
          userCredentials?.database,
          updateStatusForLargeFiles
        );
      }

      const apiResponse = await extractAPI(
        fileItem.model,
        userCredentials as UserCredentials,
        fileItem.fileSource,
        fileItem.source_url,
        localStorage.getItem('accesskey'),
        localStorage.getItem('secretkey'),
        fileItem.name ?? '',
        fileItem.gcsBucket ?? '',
        fileItem.gcsBucketFolder ?? '',
        selectedNodes.map((l) => l.value),
        selectedRels.map((t) => t.value),
        fileItem.google_project_id
      );

      if (apiResponse?.status === 'Failed') {
        let errorobj = { error: apiResponse.error, message: apiResponse.message, fileName: apiResponse.file_name };
        throw new Error(JSON.stringify(errorobj));
      } else if (fileItem.size != undefined && fileItem.size < 10000000) {
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
  };

  const handleGenerateGraph = () => {
    const data = [];
    if (selectedfileslength) {
      for (let i = 0; i < selectedfileslength; i++) {
        const row = JSON.parse(selectedRows[i]);
        if (row.status === 'New') {
          data.push(extractData(row.id, true));
        }
      }
      Promise.allSettled(data).then(async (_) => {
        await updateGraphAPI(userCredentials as UserCredentials);
      });
    } else if (filesData.length > 0) {
      for (let i = 0; i < filesData.length; i++) {
        if (filesData[i]?.status === 'New') {
          data.push(extractData(filesData[i].id as string));
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

  const selectedfileslength = useMemo(() => selectedRows.length, [selectedRows]);

  const newFilecheck = useMemo(() => selectedRows.filter((f) => JSON.parse(f).status === 'New').length, [selectedRows]);

  const completedfileNo = useMemo(
    () => selectedRows.filter((f) => JSON.parse(f).status === 'Completed').length,
    [selectedRows]
  );

  const dropdowncheck = useMemo(() => !filesData.some((f) => f.status === 'New'), [filesData]);

  const disableCheck = useMemo(
    () => (!selectedfileslength ? dropdowncheck : !newFilecheck),
    [selectedfileslength, filesData, newFilecheck]
  );

  const showGraphCheck = useMemo(
    () => (selectedfileslength ? completedfileNo === 0 : true),
    [selectedfileslength, completedfileNo]
  );

  const deleteFileClickHandler: React.MouseEventHandler<HTMLButtonElement> = () => {
    setshowDeletePopUp(true);
  };

  const handleDeleteFiles = async (deleteEntities: boolean) => {
    try {
      setdeleteLoading(true);
      const response = await deleteAPI(userCredentials as UserCredentials, selectedRows, deleteEntities);
      setdeleteLoading(false);
      if (response.data.status == 'Success') {
        setalertDetails({
          showAlert: true,
          alertMessage: response.data.message,
          alertType: 'success',
        });
        const filenames = selectedRows.map((str) => JSON.parse(str).name);
        filenames.forEach((name) => {
          setFilesData((prev) => prev.filter((f) => f.name != name));
        });
      } else {
        let errorobj = { error: response.data.error, message: response.data.message };
        throw new Error(JSON.stringify(errorobj));
      }
      setshowDeletePopUp(false);
    } catch (err) {
      if (err instanceof Error) {
        const error = JSON.parse(err.message);
        const { message } = error;
        setalertDetails({
          showAlert: true,
          alertType: 'error',
          alertMessage: message,
        });
        console.log(err);
      }
    }
    setshowDeletePopUp(false);
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
      {showDeletePopUp && (
        <DeletePopUp
          open={showDeletePopUp}
          no_of_files={selectedfileslength}
          deleteHandler={(delentities: boolean) => handleDeleteFiles(delentities)}
          deleteCloseHandler={() => setshowDeletePopUp(false)}
          loading={deleteLoading}
        ></DeletePopUp>
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
          <LlmDropdown onSelect={handleDropdownChange} isDisabled={dropdowncheck} />
          <Flex flexDirection='row' gap='4' className='self-end'>
            <Button disabled={disableCheck} onClick={handleGenerateGraph} className='mr-0.5'>
              Generate Graph {selectedfileslength && !disableCheck && newFilecheck ? `(${newFilecheck})` : ''}
            </Button>
            <Button
              title='only completed files will be processed for graph visualization'
              disabled={showGraphCheck}
              onClick={handleGraphView}
              className='mr-0.5'
            >
              Show Graph {selectedfileslength && completedfileNo ? `(${completedfileNo})` : ''}
            </Button>
            <Button
              onClick={handleOpenGraphClick}
              disabled={!filesData.some((f) => f?.status === 'Completed')}
              className='ml-0.5'
            >
              Open Graph with Bloom
            </Button>
            <Button
              onClick={deleteFileClickHandler}
              className='ml-0.5'
              title={!selectedfileslength ? 'please select a file' : 'File is still under process'}
              disabled={!selectedfileslength}
            >
              Delete Files {selectedfileslength > 0 && `(${selectedfileslength})`}
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
