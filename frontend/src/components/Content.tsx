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
import deleteAPI from '../services/deleteFiles';
import DeletePopUp from './DeletePopUp';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { useSearchParams } from 'react-router-dom';
import ConfirmationDialog from './ConfirmationDialog';
import { buttonCaptions, largeFileSize, tooltips } from '../utils/Constants';
import ButtonWithToolTip from './ButtonWithToolTip';
import connectAPI from '../services/ConnectAPI';

const Content: React.FC<ContentProps> = ({ isLeftExpanded, isRightExpanded }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const [showConfirmationModal, setshowConfirmationModal] = useState<boolean>(false);
  const [extractLoading, setextractLoading] = useState<boolean>(false);

  const {
    filesData,
    setFilesData,
    setModel,
    model,
    selectedNodes,
    selectedRels,
    selectedRows,
    setSelectedNodes,
    setRowSelection,
    setSelectedRels,
  } = useFileContext();
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView' | 'chatInfoView'>('tableView');
  const [showDeletePopUp, setshowDeletePopUp] = useState<boolean>(false);
  const [deleteLoading, setdeleteLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const { updateStatusForLargeFiles } = useServerSideEvent(
    (inMinutes, time, fileName) => {
      setalertDetails({
        showAlert: true,
        alertType: 'info',
        alertMessage: `${fileName} will take approx ${time} ${inMinutes ? 'Min' : 'Sec'}`,
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
        setextractLoading(true);
        await extractHandler(fileItem, uid);
      }
    } else {
      const fileItem = selectedRows.find((f) => JSON.parse(f).id == uid);
      if (fileItem) {
        setextractLoading(true);
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
      setRowSelection((prev) => {
        const copiedobj = { ...prev };
        for (const key in copiedobj) {
          if (JSON.parse(key).id == uid) {
            copiedobj[key] = false;
          }
        }
        return copiedobj;
      });
      if (fileItem.name != undefined && userCredentials != null) {
        const { name } = fileItem;
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
        fileItem.google_project_id,
        fileItem.language,
        fileItem.access_token
      );

      if (apiResponse?.status === 'Failed') {
        let errorobj = { error: apiResponse.error, message: apiResponse.message, fileName: apiResponse.file_name };
        throw new Error(JSON.stringify(errorobj));
      } else if (fileItem.size != undefined && fileItem.size < largeFileSize) {
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

  const handleGenerateGraph = (allowLargeFiles: boolean, selectedFilesFromAllfiles: CustomFile[]) => {
    const data = [];
    if (selectedfileslength && allowLargeFiles) {
      for (let i = 0; i < selectedfileslength; i++) {
        const row = JSON.parse(selectedRows[i]);
        if (row.status === 'New') {
          data.push(extractData(row.id, true));
        }
      }
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
        await updateGraphAPI(userCredentials as UserCredentials);
      });
    } else if (selectedFilesFromAllfiles.length && allowLargeFiles) {
      // @ts-ignore
      for (let i = 0; i < selectedFilesFromAllfiles.length; i++) {
        if (selectedFilesFromAllfiles[i]?.status === 'New') {
          data.push(extractData(selectedFilesFromAllfiles[i].id as string));
        }
      }
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
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
    isLeftExpanded && isRightExpanded
      ? 'contentWithExpansion'
      : isRightExpanded
      ? 'contentWithChatBot'
      : !isLeftExpanded && !isRightExpanded
      ? 'w-[calc(100%-128px)]'
      : 'contentWithDropzoneExpansion';

  const handleGraphView = () => {
    setOpenGraphView(true);
    setViewPoint('showGraphView');
  };

  const disconnect = () => {
    setConnectionStatus(false);
    localStorage.removeItem('password');
    setUserCredentials({ uri: '', password: '', userName: '', database: '' });
    setSelectedNodes([]);
    setSelectedRels([]);
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

  const filesForProcessing = useMemo(() => {
    let newstatusfiles: CustomFile[] = [];
    if (selectedRows.length) {
      selectedRows.forEach((f) => {
        const parsedFile: CustomFile = JSON.parse(f);
        if (parsedFile.status === 'New') {
          newstatusfiles.push(parsedFile);
        }
      });
    } else if (filesData.length) {
      newstatusfiles = filesData.filter((f) => f.status === 'New');
    }
    return newstatusfiles;
  }, [filesData, selectedRows]);

  const handleDeleteFiles = async (deleteEntities: boolean) => {
    try {
      setdeleteLoading(true);
      const response = await deleteAPI(userCredentials as UserCredentials, selectedRows, deleteEntities);
      setRowSelection({});
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
  useEffect(() => {
    const connection = localStorage.getItem('neo4j.connection');
    if (connection != null) {
      (async () => {
        const parsedData = JSON.parse(connection);
        console.log(parsedData.uri);
        const response = await connectAPI(parsedData.uri, parsedData.user, parsedData.password, parsedData.database);
        if (response?.data?.status === 'Success') {
          setConnectionStatus(true);
          setOpenConnection(false);
        } else {
          setOpenConnection(true);
          setConnectionStatus(false);
        }
      })();
    }
  }, []);

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
      {showConfirmationModal && filesForProcessing.length && (
        <ConfirmationDialog
          open={showConfirmationModal}
          largeFiles={filesForProcessing}
          extractHandler={handleGenerateGraph}
          onClose={() => setshowConfirmationModal(false)}
          loading={extractLoading}
        ></ConfirmationDialog>
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
              {buttonCaptions.connectToNeo4j}
            </Button>
          ) : (
            <Button className='mr-2.5' onClick={disconnect}>
              {buttonCaptions.disconnect}
            </Button>
          )}
        </Flex>
        <FileTable
          isExpanded={isLeftExpanded && isRightExpanded}
          connectionStatus={connectionStatus}
          setConnectionStatus={setConnectionStatus}
          onInspect={(name) => {
            setInspectedName(name);
            setOpenGraphView(true);
            setViewPoint('tableView');
          }}
        ></FileTable>
        <Flex
          className={`${
            !isLeftExpanded && !isRightExpanded ? 'w-[calc(100%-128px)]' : 'w-full'
          } p-2.5 absolute bottom-4 mt-1.5 self-start`}
          justifyContent='space-between'
          flexDirection='row'
        >
          <LlmDropdown onSelect={handleDropdownChange}  />
          <Flex flexDirection='row' gap='4' className='self-end'>
            <ButtonWithToolTip
              text={tooltips.generateGraph}
              placement='top'
              label='generate graph'
              onClick={() => {
                if (selectedRows.length) {
                  let selectedLargeFiles: CustomFile[] = [];
                  selectedRows.forEach((f) => {
                    const parsedData: CustomFile = JSON.parse(f);
                    if (parsedData.fileSource === 'local file') {
                      if (
                        typeof parsedData.size === 'number' &&
                        parsedData.status === 'New' &&
                        parsedData.size > largeFileSize
                      ) {
                        selectedLargeFiles.push(parsedData);
                      }
                    }
                  });
                  // @ts-ignore
                  if (selectedLargeFiles.length) {
                    setshowConfirmationModal(true);
                    handleGenerateGraph(false, []);
                  } else {
                    handleGenerateGraph(true, filesData);
                  }
                } else if (filesData.length) {
                  const largefiles = filesData.filter((f) => {
                    if (typeof f.size === 'number' && f.status === 'New' && f.size > largeFileSize) {
                      return true;
                    }
                    return false;
                  });
                  const selectAllNewFiles = filesData.filter((f) => f.status === 'New');
                  const stringified = selectAllNewFiles.reduce((accu, f) => {
                    const key = JSON.stringify(f);
                    // @ts-ignore
                    accu[key] = true;
                    return accu;
                  }, {});
                  setRowSelection(stringified);
                  if (largefiles.length) {
                    setshowConfirmationModal(true);
                    handleGenerateGraph(false, []);
                  } else {
                    handleGenerateGraph(true, filesData);
                  }
                }
              }}
              disabled={disableCheck}
              className='mr-0.5'
            >
              {buttonCaptions.generateGraph}{' '}
              {selectedfileslength && !disableCheck && newFilecheck ? `(${newFilecheck})` : ''}
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.showGraph}
              placement='top'
              onClick={handleGraphView}
              disabled={showGraphCheck}
              className='mr-0.5'
              label='show graph'
            >
              {buttonCaptions.showPreviewGraph} {selectedfileslength && completedfileNo ? `(${completedfileNo})` : ''}
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.bloomGraph}
              placement='top'
              onClick={handleOpenGraphClick}
              disabled={!filesData.some((f) => f?.status === 'Completed')}
              className='ml-0.5'
              label='Open Graph with Bloom'
            >
              {buttonCaptions.exploreGraphWithBloom}
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={
                !selectedfileslength ? tooltips.deleteFile : `${selectedfileslength} ${tooltips.deleteSelectedFiles}`
              }
              placement='top'
              onClick={() => setshowDeletePopUp(true)}
              disabled={!selectedfileslength}
              className='ml-0.5'
              label='Delete Files'
            >
              {buttonCaptions.deleteFiles}
              {selectedfileslength > 0 && `(${selectedfileslength})`}
            </ButtonWithToolTip>
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
