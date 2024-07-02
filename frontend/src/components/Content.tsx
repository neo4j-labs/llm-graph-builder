import { useEffect, useState, useMemo, useCallback } from 'react';
import ConnectionModal from './Popups/ConnectionModal/ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator, useMediaQuery } from '@neo4j-ndl/react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './UI/Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps, CustomFile, Menuitems, OptionType, UserCredentials, alertStateType } from '../types';
import deleteAPI from '../services/DeleteFiles';
import { postProcessing } from '../services/PostProcessing';
import DeletePopUp from './Popups/DeletePopUp/DeletePopUp';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { useSearchParams } from 'react-router-dom';
import ConfirmationDialog from './Popups/LargeFilePopUp/ConfirmationDialog';
import { buttonCaptions, largeFileSize, taskParam, tooltips } from '../utils/Constants';
import ButtonWithToolTip from './UI/ButtonWithToolTip';
import connectAPI from '../services/ConnectAPI';
import SettingModalHOC from '../HOC/SettingModalHOC';
import GraphViewModal from './Graph/GraphViewModal';
import CustomMenu from './UI/Menu';
import { TrashIconOutline } from '@neo4j-ndl/react/icons';

const Content: React.FC<ContentProps> = ({
  isLeftExpanded,
  isRightExpanded,
  openTextSchema,
  isSchema,
  setIsSchema,
  openOrphanNodeDeletionModal,
}) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const { setUserCredentials, userCredentials, connectionStatus, setConnectionStatus } = useCredentials();
  const [showConfirmationModal, setshowConfirmationModal] = useState<boolean>(false);
  const [extractLoading, setextractLoading] = useState<boolean>(false);
  const [isLargeFile, setIsLargeFile] = useState<boolean>(false);
  const [showSettingnModal, setshowSettingModal] = useState<boolean>(false);
  const [openDeleteMenu, setopenDeleteMenu] = useState<boolean>(false);
  const [deleteAnchor, setdeleteAnchor] = useState<HTMLElement | null>(null);

  const {
    filesData,
    setFilesData,
    setModel,
    model,
    selectedNodes,
    selectedRels,
    setSelectedNodes,
    setSelectedRels,
    postProcessingTasks,
    queue,
    processedCount,
    setProcessedCount,
  } = useFileContext();
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView' | 'chatInfoView'>('tableView');
  const [showDeletePopUp, setshowDeletePopUp] = useState<boolean>(false);
  const [deleteLoading, setdeleteLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();

  const { updateStatusForLargeFiles } = useServerSideEvent(
    (inMinutes, time, fileName) => {
      showNormalToast(`${fileName} will take approx ${time} ${inMinutes ? 'Min' : 'Sec'}`);
      localStorage.setItem('alertShown', JSON.stringify(true));
    },
    (fileName) => {
      showErrorToast(`${fileName} Failed to process`);
    }
  );
  const childRef = useRef<ChildRef>(null);

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
        setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
      }
      setInit(true);
    } else {
      setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
    }
  }, []);

  useEffect(() => {
    setFilesData((prevfiles) => {
      return prevfiles.map((curfile) => {
        return {
          ...curfile,
          model: curfile.status === 'New' || curfile.status === 'Reprocess' ? model : curfile.model,
        };
      });
    });
  }, [model]);

  useEffect(() => {
    if (afterFirstRender) {
      localStorage.setItem('processedCount', JSON.stringify({ db: userCredentials?.uri, count: processedCount }));
    }
    if (processedCount == batchSize) {
      handleGenerateGraph([], true);
    }
  }, [processedCount, userCredentials]);

  useEffect(() => {
    if (afterFirstRender) {
      localStorage.setItem('waitingQueue', JSON.stringify({ db: userCredentials?.uri, queue: queue.items }));
    }
    afterFirstRender = true;
  }, [queue.items.length, userCredentials]);

  useEffect(() => {
    const storedSchema = localStorage.getItem('isSchema');
    if (storedSchema !== null) {
      setIsSchema(JSON.parse(storedSchema));
    }
  }, [isSchema]);

  useEffect(() => {
    const connection = localStorage.getItem('neo4j.connection');
    if (connection != null) {
      (async () => {
        const parsedData = JSON.parse(connection);
        console.log(parsedData.uri);
        const response = await connectAPI(parsedData.uri, parsedData.user, parsedData.password, parsedData.database);
        if (response?.data?.status === 'Success') {
          localStorage.setItem(
            'neo4j.connection',
            JSON.stringify({
              ...parsedData,
              userDbVectorIndex: response.data.data.db_vector_dimension,
            })
          );
          if (
            (response.data.data.application_dimension === response.data.data.db_vector_dimension ||
              response.data.data.db_vector_dimension == 0) &&
            !response.data.data.chunks_exists
          ) {
            setConnectionStatus(true);
            setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
          } else {
            setOpenConnection({
              openPopUp: true,
              chunksExists: response.data.data.chunks_exists as boolean,
              vectorIndexMisMatch:
                response.data.data.db_vector_dimension > 0 &&
                response.data.data.db_vector_dimension != response.data.data.application_dimension,
              chunksExistsWithDifferentDimension:
                response.data.data.db_vector_dimension > 0 &&
                response.data.data.db_vector_dimension != response.data.data.application_dimension &&
                (response.data.data.chunks_exists ?? true),
            });
            setConnectionStatus(false);
          }
        } else {
          setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
          setConnectionStatus(false);
        }
      })();
    }
  }, []);

  const handleDropdownChange = (selectedOption: OptionType | null | void) => {
    if (selectedOption?.value) {
      setModel(selectedOption?.value);
    }
  };

  const extractData = async (uid: string, isselectedRows = false, filesTobeProcess: CustomFile[]) => {
    if (!isselectedRows) {
      const fileItem = filesData.find((f) => f.id == uid);
      if (fileItem) {
        await extractHandler(fileItem, uid);
      }
    } else {
      const fileItem = filesTobeProcess.find((f) => f.id == uid);
      if (fileItem) {
        setextractLoading(true);
        await extractHandler(fileItem, uid);
      }
    }
  };

  const extractHandler = async (fileItem: CustomFile, uid: string) => {
    queue.remove(fileItem.name as string);
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
          if (key == uid) {
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
        fileItem.retryOption ?? '',
        fileItem.source_url,
        localStorage.getItem('accesskey'),
        localStorage.getItem('secretkey'),
        fileItem.name ?? '',
        fileItem.gcsBucket ?? '',
        fileItem.gcsBucketFolder ?? '',
        selectedNodes.map((l) => l.value),
        selectedRels.map((t) => t.value),
        fileItem.google_project_id,
        fileItem.language
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
      if (err instanceof Error) {
        try {
          const error = JSON.parse(err.message);
          if (Object.keys(error).includes('fileName')) {
            setProcessedCount((prev) => {
              if (prev == batchSize) {
                return batchSize - 1;
              }
              return prev + 1;
            });
            const { message, fileName } = error;
            queue.remove(fileName);
            const errorMessage = error.message;
            showErrorToast(message);
            setFilesData((prevfiles) =>
              prevfiles.map((curfile) => {
                if (curfile.name == fileName) {
                  return { ...curfile, status: 'Failed', errorMessage };
                }
                return curfile;
              })
            );
          } else {
            console.error('Unexpected error format:', error);
          }
        } catch (parseError) {
          if (axios.isAxiosError(err)) {
            const axiosErrorMessage = err.response?.data?.message || err.message;
            console.error('Axios error occurred:', axiosErrorMessage);
          } else {
            console.error('An unexpected error occurred:', err.message);
          }
        }
      } else {
        console.error('An unknown error occurred:', err);
      }
    }
  };

  const handleGenerateGraph = (allowLargeFiles: boolean, selectedFilesFromAllfiles: CustomFile[]) => {
    setIsLargeFile(false);
    const data = [];
    showNormalToast(`Processing ${batch.length} files at a time.`);
    for (let i = 0; i < batch.length; i++) {
      if (newCheck) {
        if (batch[i]?.status === 'New' || batch[i].status === 'Reprocess') {
          data.push(extractData(batch[i].id, isSelectedFiles, selectedFiles as CustomFile[]));
        }
      } else {
        data.push(extractData(batch[i].id, isSelectedFiles, selectedFiles as CustomFile[]));
      }
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
        await postProcessing(userCredentials as UserCredentials, taskParam);
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
        await postProcessing(userCredentials as UserCredentials, taskParam);
      });
    }
  };

  const scheduleBatchWiseProcess = (selectedRows: CustomFile[], isSelectedFiles: boolean) => {
    let data = [];
    if (queue.size() > batchSize) {
      const batch = queue.items.slice(0, batchSize);
      data = triggerBatchProcessing(batch, selectedRows as CustomFile[], isSelectedFiles, false);
    } else {
      let mergedfiles = [...selectedRows];
      let filesToProcess: CustomFile[] = [];
      if (mergedfiles.length > batchSize) {
        filesToProcess = mergedfiles.slice(0, batchSize);
        const remainingFiles = [...(mergedfiles as CustomFile[])].splice(batchSize);
        addFilesToQueue(remainingFiles);
      } else {
        filesToProcess = mergedfiles;
      }
      data = triggerBatchProcessing(filesToProcess, selectedRows as CustomFile[], isSelectedFiles, false);
    }
    return data;
  };

  /**
   * Processes files in batches, respecting a maximum batch size.
   *
   * This function prioritizes processing files from the queue if it's not empty.
   * If the queue is empty, it processes the provided `filesTobeProcessed`:
   *   - If the number of files exceeds the batch size, it processes a batch and queues the rest.
   *   - If the number of files is within the batch size, it processes them all.
   *   - If there are already files being processed, it adjusts the batch size to avoid exceeding the limit.
   *
   * @param filesTobeProcessed - The files to be processed.
   * @param queueFiles - Whether to prioritize processing files from the queue. Defaults to false.
   */
  const handleGenerateGraph = (filesTobeProcessed: CustomFile[], queueFiles: boolean = false) => {
    let data = [];
    const processingFilesCount = filesData.filter((f) => f.status === 'Processing').length;
    if (filesTobeProcessed.length && !queueFiles && processingFilesCount < batchSize) {
      if (!queue.isEmpty()) {
        data = scheduleBatchWiseProcess(filesTobeProcessed as CustomFile[], true);
      } else if (filesTobeProcessed.length > batchSize) {
        const filesToProcess = filesTobeProcessed?.slice(0, batchSize) as CustomFile[];
        data = triggerBatchProcessing(filesToProcess, filesTobeProcessed as CustomFile[], true, false);
        const remainingFiles = [...(filesTobeProcessed as CustomFile[])].splice(batchSize);
        addFilesToQueue(remainingFiles);
      } else {
        let filesTobeSchedule: CustomFile[] = filesTobeProcessed;
        if (filesTobeProcessed.length + processingFilesCount > batchSize) {
          filesTobeSchedule = filesTobeProcessed.slice(
            0,
            filesTobeProcessed.length + processingFilesCount - batchSize
          ) as CustomFile[];
          const idstoexclude = new Set(filesTobeSchedule.map((f) => f.id));
          const remainingFiles = [...(childRef.current?.getSelectedRows() as CustomFile[])].filter(
            (f) => !idstoexclude.has(f.id)
          );
          addFilesToQueue(remainingFiles);
        }
        data = triggerBatchProcessing(filesTobeSchedule, filesTobeProcessed, true, true);
      }
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
        await postProcessing(userCredentials as UserCredentials, postProcessingTasks);
      });
    } else if (queueFiles && !queue.isEmpty() && processingFilesCount < batchSize) {
      data = scheduleBatchWiseProcess(queue.items, true);
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
        await postProcessing(userCredentials as UserCredentials, postProcessingTasks);
      });
    } else {
      addFilesToQueue(filesTobeProcessed as CustomFile[]);
    }
  };

  function processWaitingFilesOnRefresh() {
    let data = [];
    const processingFilesCount = filesData.filter((f) => f.status === 'Processing').length;

    if (!queue.isEmpty() && processingFilesCount < batchSize) {
      if (queue.size() > batchSize) {
        const batch = queue.items.slice(0, batchSize);
        data = triggerBatchProcessing(batch, queue.items as CustomFile[], true, false);
      } else {
        data = triggerBatchProcessing(queue.items, queue.items as CustomFile[], true, false);
      }
      Promise.allSettled(data).then(async (_) => {
        setextractLoading(false);
        await postProcessing(userCredentials as UserCredentials, postProcessingTasks);
      });
    } else {
      const selectedNewFiles = childRef.current
        ?.getSelectedRows()
        .filter((f) => f.status === 'New' || f.status == 'Reprocess');
      addFilesToQueue(selectedNewFiles as CustomFile[]);
    }
  }

  const handleOpenGraphClick = () => {
    const bloomUrl = process.env.VITE_BLOOM_URL;
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
    queue.clear();
    setProcessedCount(0);
    setConnectionStatus(false);
    localStorage.removeItem('password');
    setUserCredentials({ uri: '', password: '', userName: '', database: '' });
    setSelectedNodes([]);
    setSelectedRels([]);
  };

  const retryHandler = async (filename: string, retryoption: string) => {
    try {
      setRetryLoading(true);
      const response = await retry(userCredentials as UserCredentials, filename, retryoption);
      setRetryLoading(false);
      if (response.data.status === 'Failure') {
        throw new Error(response.data.error);
      }
      const isStartFromBegining = retryoption === RETRY_OPIONS[0] || retryoption===RETRY_OPIONS[1];
      setFilesData((prev) => {
        return prev.map((f) => {
          return f.name === filename
            ? {
                ...f,
                status: 'Reprocess',
                processingProgress: isStartFromBegining ? 0 : f.processingProgress,
                NodesCount: isStartFromBegining ? 0 : f.NodesCount,
                relationshipCount: isStartFromBegining ? 0 : f.relationshipCount,
              }
            : f;
        });
      });
      showSuccessToast(response.data.message as string);
      retryOnclose();
    } catch (error) {
      setRetryLoading(false);
      if (error instanceof Error) {
        setAlertStateForRetry({
          showAlert: true,
          alertMessage: error.message,
          alertType: 'danger',
        });
      }
    }
  };

  const selectedfileslength = useMemo(
    () => childRef.current?.getSelectedRows().length,
    [childRef.current?.getSelectedRows()]
  );

  const newFilecheck = useMemo(
    () => childRef.current?.getSelectedRows().filter((f) => f.status === 'New' || f.status == 'Reprocess').length,
    [childRef.current?.getSelectedRows()]
  );

  const completedfileNo = useMemo(
    () => childRef.current?.getSelectedRows().filter((f) => f.status === 'Completed').length,
    [childRef.current?.getSelectedRows()]
  );

  const dropdowncheck = useMemo(
    () => !filesData.some((f) => f.status === 'New' || f.status === 'Waiting' || f.status === 'Reprocess'),
    [filesData]
  );

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
    const selectedRows = childRef.current?.getSelectedRows();
    if (selectedRows?.length) {
      for (let index = 0; index < selectedRows.length; index++) {
        const parsedFile: CustomFile = selectedRows[index];
        if (parsedFile.status === 'New' || parsedFile.status == 'Reprocess') {
          newstatusfiles.push(parsedFile);
        }
      }
    } else if (filesData.length) {
      newstatusfiles = filesData.filter((f) => f.status === 'New' || f.status === 'Reprocess');
    }
    return newstatusfiles;
  }, [filesData, childRef.current?.getSelectedRows()]);

  const handleDeleteFiles = async (deleteEntities: boolean) => {
    try {
      setdeleteLoading(true);
      const response = await deleteAPI(
        userCredentials as UserCredentials,
        childRef.current?.getSelectedRows() as CustomFile[],
        deleteEntities
      );
      queue.clear();
      setProcessedCount(0);
      setRowSelection({});
      setdeleteLoading(false);
      if (response.data.status == 'Success') {
        showSuccessToast(response.data.message);
        const filenames = childRef.current?.getSelectedRows().map((str) => str.name);
        if (filenames?.length) {
          for (let index = 0; index < filenames.length; index++) {
            const name = filenames[index];
            setFilesData((prev) => prev.filter((f) => f.name != name));
          }
        }
      } else {
        let errorobj = { error: response.data.error, message: response.data.message };
        throw new Error(JSON.stringify(errorobj));
      }
      setshowDeletePopUp(false);
    } catch (err) {
      setdeleteLoading(false);
      if (err instanceof Error) {
        const error = JSON.parse(err.message);
        const { message } = error;
        showErrorToast(message);
        console.log(err);
      }
    }
    setshowDeletePopUp(false);
  };

  const onClickHandler = () => {
    const selectedRows = childRef.current?.getSelectedRows();
    if (selectedRows?.length) {
      let selectedLargeFiles: CustomFile[] = [];
      for (let index = 0; index < selectedRows.length; index++) {
        const parsedData: CustomFile = selectedRows[index];
        if (
          parsedData.fileSource === 'local file' &&
          typeof parsedData.size === 'number' &&
          (parsedData.status === 'New' || parsedData.status == 'Reprocess') &&
          parsedData.size > largeFileSize
        ) {
          selectedLargeFiles.push(parsedData);
        }
      }
      if (selectedLargeFiles.length) {
        setshowConfirmationModal(true);
      } else {
        handleGenerateGraph(selectedRows.filter((f) => f.status === 'New' || f.status === 'Reprocess'));
      }
    } else if (filesData.length) {
      const largefiles = filesData.filter((f) => {
        if (typeof f.size === 'number' && (f.status === 'New' || f.status == 'Reprocess') && f.size > largeFileSize) {
          return true;
        }
        return false;
      });
      const selectAllNewFiles = filesData.filter((f) => f.status === 'New' || f.status === 'Reprocess');
      const stringified = selectAllNewFiles.reduce((accu, f) => {
        const key = f.id;
        // @ts-ignore
        accu[key] = true;
        return accu;
      }, {});
      setRowSelection(stringified);
      if (largefiles.length) {
        setshowConfirmationModal(true);
      } else {
        handleGenerateGraph(filesData.filter((f) => f.status === 'New' || f.status === 'Reprocess'));
      }
    }
  };

  const retryOnclose = useCallback(() => {
    setRetryFile('');
    setAlertStateForRetry({
      showAlert: false,
      alertMessage: '',
      alertType: 'neutral',
    });
    setRetryLoading(false);
    toggleRetryPopup();
  }, []);

  const onBannerClose = useCallback(() => {
    setAlertStateForRetry({
      showAlert: false,
      alertMessage: '',
      alertType: 'neutral',
    });
  }, []);

  useEffect(() => {
    const storedSchema = localStorage.getItem('isSchema');
    if (storedSchema !== null) {
      setIsSchema(JSON.parse(storedSchema));
    }
  }, []);

  const onClickHandler = () => {
    if (isSchema) {
      if (selectedRows.length) {
        let selectedLargeFiles: CustomFile[] = [];
        selectedRows.forEach((f) => {
          const parsedData: CustomFile = JSON.parse(f);
          if (parsedData.fileSource === 'local file') {
            if (typeof parsedData.size === 'number' && parsedData.status === 'New' && parsedData.size > largeFileSize) {
              selectedLargeFiles.push(parsedData);
            }
          }
        });
        // @ts-ignore
        if (selectedLargeFiles.length) {
          setIsLargeFile(true);
          setshowConfirmationModal(true);
          handleGenerateGraph(false, []);
        } else {
          setIsLargeFile(false);
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
          setIsLargeFile(true);
          setshowConfirmationModal(true);
          handleGenerateGraph(false, []);
        } else {
          setIsLargeFile(false);
          handleGenerateGraph(true, filesData);
        }
      }
    } else {
      if (selectedRows.length) {
        let selectedLargeFiles: CustomFile[] = [];
        selectedRows.forEach((f) => {
          const parsedData: CustomFile = JSON.parse(f);
          if (parsedData.fileSource === 'local file') {
            if (typeof parsedData.size === 'number' && parsedData.status === 'New' && parsedData.size > largeFileSize) {
              selectedLargeFiles.push(parsedData);
            }
          }
        });
        // @ts-ignore
        if (selectedLargeFiles.length) {
          setIsLargeFile(true);
        } else {
          setIsLargeFile(false);
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
          setIsLargeFile(true);
        } else {
          setIsLargeFile(false);
        }
      }
      setshowSettingModal(true);
    }
  };

  const deleteMenuItems: Menuitems[] = useMemo(
    () => [
      {
        title: `Delete Files ${selectedfileslength > 0 ? `(${selectedfileslength})` : ''}`,
        onClick: () => setshowDeletePopUp(true),
        disabledCondition: !selectedfileslength,
        description: tooltips.deleteFile,
      },
      {
        title: 'Delete Orphan Nodes',
        onClick: () => openOrphanNodeDeletionModal(),
        disabledCondition: false,
      },
    ],
    [selectedfileslength]
  );

  const handleContinue = () => {
    if (!isLargeFile) {
      handleGenerateGraph(true, filesData);
      setshowSettingModal(false);
    } else {
      setshowSettingModal(false);
      setshowConfirmationModal(true);
      handleGenerateGraph(false, []);
    }
    setIsSchema(true);
    setalertDetails({
      showAlert: true,
      alertType: 'success',
      alertMessage: 'Schema is set successfully',
    });
    localStorage.setItem('isSchema', JSON.stringify(true));
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
      {isSchema && (
        <CustomAlert
          severity={alertDetails.alertType}
          open={alertDetails.showAlert}
          handleClose={handleClose}
          alertMessage={alertDetails.alertMessage}
        />
      )}
      {showConfirmationModal && filesForProcessing.length && (
        <Suspense fallback={<FallBackDialog />}>
          <ConfirmationDialog
            open={showConfirmationModal}
            largeFiles={filesForProcessing}
            extractHandler={handleGenerateGraph}
            onClose={() => setshowConfirmationModal(false)}
            loading={extractLoading}
            selectedRows={childRef.current?.getSelectedRows() as CustomFile[]}
          ></ConfirmationDialog>
        </Suspense>
      )}
      {showDeletePopUp && (
        <DeletePopUp
          open={showDeletePopUp}
          no_of_files={selectedfileslength ?? 0}
          deleteHandler={(delentities: boolean) => handleDeleteFiles(delentities)}
          deleteCloseHandler={() => setshowDeletePopUp(false)}
          loading={deleteLoading}
          view='contentView'
        ></DeletePopUp>
      )}
      {showSettingnModal && (
        <SettingModalHOC
          settingView='contentView'
          onClose={() => setshowSettingModal(false)}
          onContinue={handleContinue}
          open={showSettingnModal}
          openTextSchema={openTextSchema}
          isSchema={isSchema}
          setIsSchema={setIsSchema}
        />
      )}
      <div className={`n-bg-palette-neutral-bg-default ${classNameCheck}`}>
        <Flex className='w-full' alignItems='center' justifyContent='space-between' flexDirection='row' flexWrap='wrap'>
          <Suspense fallback={<FallBackDialog />}>
            <ConnectionModal
              open={openConnection.openPopUp}
              setOpenConnection={setOpenConnection}
              setConnectionStatus={setConnectionStatus}
              isVectorIndexMatch={openConnection.vectorIndexMisMatch}
              chunksExistsWithoutEmbedding={openConnection.chunksExists}
              chunksExistsWithDifferentEmbedding={openConnection.chunksExistsWithDifferentDimension}
            />
          </Suspense>

          <div className='connectionstatus__container'>
            <span className='h6 px-1'>Neo4j connection</span>
            <Typography variant='body-medium'>
              {!connectionStatus ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
              {connectionStatus ? (
                <span className='n-body-small'>{userCredentials?.uri}</span>
              ) : (
                <span className='n-body-small'>Not Connected</span>
              )}
              <div className='pt-1'>
                {!isSchema ? (
                  <StatusIndicator type='danger' />
                ) : selectedNodes.length || selectedRels.length ? (
                  <StatusIndicator type='success' />
                ) : (
                  <StatusIndicator type='warning' />
                )}
                {isSchema ? (
                  <span className='n-body-small'>
                    {(!selectedNodes.length || !selectedNodes.length) && 'Empty'} Graph Schema configured
                    {selectedNodes.length || selectedRels.length
                      ? `(${selectedNodes.length} Labels + ${selectedRels.length} Rel Types)`
                      : ''}
                  </span>
                ) : (
                  <span className='n-body-small'>No Graph Schema configured</span>
                )}
              </div>
            </Typography>
          </div>
          <div>
            <ButtonWithToolTip
              placement='top'
              text='Configure Graph Schema, Delete disconnected Entities, Merge duplicate Entities'
              label='Graph Enhancemnet Settings'
              className='mr-2.5'
              onClick={toggleEnhancementDialog}
              disabled={!connectionStatus}
              size={isTablet ? 'small' : 'medium'}
            >
              Graph Enhancement
            </ButtonWithToolTip>
            {!connectionStatus ? (
              <Button
                size={isTablet ? 'small' : 'medium'}
                className='mr-2.5'
                onClick={() => setOpenConnection((prev) => ({ ...prev, openPopUp: true }))}
              >
                {buttonCaptions.connectToNeo4j}
              </Button>
            ) : (
              <Button size={isTablet ? 'small' : 'medium'} className='mr-2.5' onClick={disconnect}>
                {buttonCaptions.disconnect}
              </Button>
            )}
          </div>
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
          onRetry={(id) => {
            setRetryFile(id);
            toggleRetryPopup();
          }}
          ref={childRef}
          handleGenerateGraph={processWaitingFilesOnRefresh}
        ></FileTable>
        <Flex
          className={`${
            !isLeftExpanded && !isRightExpanded ? 'w-[calc(100%-128px)]' : 'w-full'
          } p-2.5 absolute bottom-4 mt-1.5 self-start`}
          justifyContent='space-between'
          flexDirection={isTablet ? 'column' : 'row'}
        >
          <LlmDropdown onSelect={handleDropdownChange} />
          <Flex flexDirection='row' gap='4' className='self-end'>
            <ButtonWithToolTip
              text={tooltips.generateGraph}
              placement='top'
              label='generate graph'
              onClick={onClickHandler}
              disabled={disableCheck}
              className='mr-0.5'
              size={isTablet ? 'small' : 'medium'}
            >
              {buttonCaptions.generateGraph}{' '}
              {selectedfileslength && !disableCheck && newFilecheck ? `(${newFilecheck})` : ''}
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.showGraph}
              placement='top'
              onClick={handleGraphView}
              disabled={showGraphCheck}
              onClick={handleGraphView}
              className='mr-0.5'
              label='show graph'
              size={isTablet ? 'small' : 'medium'}
            >
              Show Graph {selectedfileslength && completedfileNo ? `(${completedfileNo})` : ''}
            </Button>
            <Button
              onClick={handleOpenGraphClick}
              disabled={!filesData.some((f) => f?.status === 'Completed')}
              className='ml-0.5'
              label='Open Graph with Bloom'
              size={isTablet ? 'small' : 'medium'}
            >
              {buttonCaptions.exploreGraphWithBloom}
            </ButtonWithToolTip>
            <CustomMenu
              open={openDeleteMenu}
              closeHandler={useCallback(() => {
                setopenDeleteMenu(false);
              }, [])}
              items={deleteMenuItems}
              MenuAnchor={deleteAnchor}
              anchorOrigin={useMemo(() => ({ horizontal: 'left', vertical: 'bottom' }), [])}
              transformOrigin={useMemo(() => ({ horizontal: 'right', vertical: 'top' }), [])}
            ></CustomMenu>
            <Button
              label='Delete Menu trigger'
              onClick={(e) => {
                setdeleteAnchor(e.currentTarget);
                setopenDeleteMenu(true);
              }}
            >
              <TrashIconOutline className='n-size-token-7' />
              Delete <TrashIconOutline></TrashIconOutline>
            </Button>
          </Flex>
        </Flex>
      </div>
      <GraphViewModal
        inspectedName={inspectedName}
        open={openGraphView}
        setGraphViewOpen={setOpenGraphView}
        viewPoint={viewPoint}
        selectedRows={childRef.current?.getSelectedRows()}
      />
    </>
  );
};

export default Content;
