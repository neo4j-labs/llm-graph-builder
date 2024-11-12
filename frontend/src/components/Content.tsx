import { useEffect, useState, useMemo, useRef, Suspense, useReducer, useCallback } from 'react';
import FileTable from './FileTable';
import { Button, Typography, Flex, StatusIndicator, useMediaQuery } from '@neo4j-ndl/react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { extractAPI } from '../utils/FileAPI';
import {
  BannerAlertProps,
  ChildRef,
  ContentProps,
  CustomFile,
  OptionType,
  UserCredentials,
  chunkdata,
  connectionState,
} from '../types';
import deleteAPI from '../services/DeleteFiles';
import { postProcessing } from '../services/PostProcessing';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { useSearchParams } from 'react-router-dom';
import {
  batchSize,
  buttonCaptions,
  chatModeLables,
  defaultLLM,
  largeFileSize,
  llms,
  RETRY_OPIONS,
  tooltips,
} from '../utils/Constants';
import ButtonWithToolTip from './UI/ButtonWithToolTip';
import connectAPI from '../services/ConnectAPI';
import DropdownComponent from './Dropdown';
import GraphViewModal from './Graph/GraphViewModal';
import { lazy } from 'react';
import FallBackDialog from './UI/FallBackDialog';
import DeletePopUp from './Popups/DeletePopUp/DeletePopUp';
import GraphEnhancementDialog from './Popups/GraphEnhancementDialog';
import { tokens } from '@neo4j-ndl/base';
import axios from 'axios';
import DatabaseStatusIcon from './UI/DatabaseStatusIcon';
import RetryConfirmationDialog from './Popups/RetryConfirmation/Index';
import retry from '../services/retry';
import { showErrorToast, showNormalToast, showSuccessToast } from '../utils/toasts';
import { useMessageContext } from '../context/UserMessages';
import PostProcessingToast from './Popups/GraphEnhancementDialog/PostProcessingCheckList/PostProcessingToast';
import { getChunkText } from '../services/getChunkText';
import ChunkPopUp from './Popups/ChunkPopUp';

const ConnectionModal = lazy(() => import('./Popups/ConnectionModal/ConnectionModal'));
const ConfirmationDialog = lazy(() => import('./Popups/LargeFilePopUp/ConfirmationDialog'));

let afterFirstRender = false;

const Content: React.FC<ContentProps> = ({
  isLeftExpanded,
  isRightExpanded,
  isSchema,
  setIsSchema,
  showEnhancementDialog,
  toggleEnhancementDialog,
  closeSettingModal,
}) => {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [inspectedName, setInspectedName] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const {
    setUserCredentials,
    userCredentials,
    connectionStatus,
    setConnectionStatus,
    isGdsActive,
    setGdsActive,
    setIsReadOnlyUser,
    isReadOnlyUser,
  } = useCredentials();
  const [showConfirmationModal, setshowConfirmationModal] = useState<boolean>(false);
  const [extractLoading, setextractLoading] = useState<boolean>(false);
  const [retryFile, setRetryFile] = useState<string>('');
  const [retryLoading, setRetryLoading] = useState<boolean>(false);
  const [showRetryPopup, toggleRetryPopup] = useReducer((state) => !state, false);
  const [showChunkPopup, toggleChunkPopup] = useReducer((state) => !state, false);
  const [chunksLoading, toggleChunksLoading] = useReducer((state) => !state, false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPageCount, setTotalPageCount] = useState<number | null>(null);
  const [textChunks, setTextChunks] = useState<chunkdata[]>([]);

  const [alertStateForRetry, setAlertStateForRetry] = useState<BannerAlertProps>({
    showAlert: false,
    alertType: 'neutral',
    alertMessage: '',
  });
  const { setClearHistoryData } = useMessageContext();
  const {
    filesData,
    setFilesData,
    setModel,
    model,
    selectedNodes,
    selectedRels,
    setSelectedNodes,
    setRowSelection,
    setSelectedRels,
    postProcessingTasks,
    queue,
    processedCount,
    setProcessedCount,
    setchatModes,
  } = useFileContext();
  const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView' | 'chatInfoView'|'neighborView'>('tableView');
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
  const incrementPage = () => {
    setCurrentPage((prev) => prev + 1);
  };
  const decrementPage = () => {
    setCurrentPage((prev) => prev - 1);
  };
  useEffect(() => {
    if (!init && !searchParams.has('connectURL')) {
      let session = localStorage.getItem('neo4j.connection');
      if (session) {
        let neo4jConnection = JSON.parse(session);
        setUserCredentials({
          uri: neo4jConnection.uri,
          userName: neo4jConnection.user,
          password: atob(neo4jConnection.password),
          database: neo4jConnection.database,
          port: neo4jConnection.uri.split(':')[2],
        });
        if (neo4jConnection.isgdsActive !== undefined) {
          setGdsActive(neo4jConnection.isgdsActive);
        }
        if (neo4jConnection.isReadOnlyUser !== undefined) {
          setIsReadOnlyUser(neo4jConnection.isReadOnlyUser);
        }
      } else {
        setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
      }
      setInit(true);
    } else {
      setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
    }
  }, []);
  useEffect(() => {
    if (currentPage >= 1) {
      (async () => {
        await getChunks(documentName, currentPage);
      })();
    }
  }, [currentPage, documentName]);
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
    if (processedCount == batchSize && !isReadOnlyUser) {
      handleGenerateGraph([], true);
    }
    if (processedCount === 1 && queue.isEmpty()) {
      (async () => {
        showNormalToast(<PostProcessingToast isGdsActive={isGdsActive} postProcessingTasks={postProcessingTasks} />);
        await postProcessing(userCredentials as UserCredentials, postProcessingTasks);
        showSuccessToast('All Q&A functionality is available now.');
      })();
    }
  }, [processedCount, userCredentials, queue, isReadOnlyUser, isGdsActive]);

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
        const response = await connectAPI(
          parsedData.uri,
          parsedData.user,
          atob(parsedData.password),
          parsedData.database
        );
        if (response?.data?.status === 'Success') {
          localStorage.setItem(
            'neo4j.connection',
            JSON.stringify({
              ...parsedData,
              userDbVectorIndex: response.data.data.db_vector_dimension,
              password: btoa(atob(parsedData.password)),
            })
          );
          if (response.data.data.gds_status !== undefined) {
            setGdsActive(response.data.data.gds_status);
          }
          if (response.data.data.write_access !== undefined) {
            setIsReadOnlyUser(!response.data.data.write_access);
          }
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
  const getChunks = async (name: string, pageNo: number) => {
    toggleChunksLoading();
    const response = await getChunkText(userCredentials as UserCredentials, name, pageNo);
    setTextChunks(response.data.data.pageitems);
    if (!totalPageCount) {
      setTotalPageCount(response.data.data.total_pages);
    }
    toggleChunksLoading();
  };
  const extractData = async (uid: string, isselectedRows = false, filesTobeProcess: CustomFile[]) => {
    if (!isselectedRows) {
      const fileItem = filesData.find((f) => f.id == uid);
      if (fileItem) {
        setextractLoading(true);
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
        fileItem.sourceUrl,
        localStorage.getItem('accesskey'),
        localStorage.getItem('secretkey'),
        fileItem.name ?? '',
        fileItem.gcsBucket ?? '',
        fileItem.gcsBucketFolder ?? '',
        selectedNodes.map((l) => l.value),
        selectedRels.map((t) => t.value),
        fileItem.googleProjectId,
        fileItem.language,
        fileItem.accessToken
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
                processingProgress: apiRes?.processingTime?.toFixed(2),
                processingTotalTime: apiRes?.processingTime?.toFixed(2),
                status: apiRes?.status,
                nodesCount: apiRes?.nodeCount,
                relationshipsCount: apiRes?.relationshipCount,
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

  const triggerBatchProcessing = (
    batch: CustomFile[],
    selectedFiles: CustomFile[],
    isSelectedFiles: boolean,
    newCheck: boolean
  ) => {
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
    }
    return data;
  };

  const addFilesToQueue = async (remainingFiles: CustomFile[]) => {
    if (!remainingFiles.length) {
      showNormalToast(<PostProcessingToast isGdsActive={isGdsActive} postProcessingTasks={postProcessingTasks} />);
      await postProcessing(userCredentials as UserCredentials, postProcessingTasks);
      showSuccessToast('All Q&A functionality is available now.');
    }
    for (let index = 0; index < remainingFiles.length; index++) {
      const f = remainingFiles[index];
      setFilesData((prev) =>
        prev.map((pf) => {
          if (pf.id === f.id) {
            return {
              ...pf,
              status: 'Waiting',
            };
          }
          return pf;
        })
      );
      queue.enqueue(f);
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
      Promise.allSettled(data).then((_) => {
        setextractLoading(false);
      });
    } else if (queueFiles && !queue.isEmpty() && processingFilesCount < batchSize) {
      data = scheduleBatchWiseProcess(queue.items, true);
      Promise.allSettled(data).then((_) => {
        setextractLoading(false);
      });
    } else {
      addFilesToQueue(filesTobeProcessed as CustomFile[]);
    }
  };

  const processWaitingFilesOnRefresh = () => {
    let data = [];
    const processingFilesCount = filesData.filter((f) => f.status === 'Processing').length;

    if (!queue.isEmpty() && processingFilesCount < batchSize) {
      if (queue.size() > batchSize) {
        const batch = queue.items.slice(0, batchSize);
        data = triggerBatchProcessing(batch, queue.items as CustomFile[], true, false);
      } else {
        data = triggerBatchProcessing(queue.items, queue.items as CustomFile[], true, false);
      }
      Promise.allSettled(data).then((_) => {
        setextractLoading(false);
      });
    } else {
      const selectedNewFiles = childRef.current
        ?.getSelectedRows()
        .filter((f) => f.status === 'New' || f.status == 'Reprocess');
      addFilesToQueue(selectedNewFiles as CustomFile[]);
    }
  };

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
    setClearHistoryData(true);
    setchatModes([chatModeLables['graph+vector+fulltext']]);
  };

  const retryHandler = async (filename: string, retryoption: string) => {
    try {
      setRetryLoading(true);
      const response = await retry(userCredentials as UserCredentials, filename, retryoption);
      setRetryLoading(false);
      if (response.data.status === 'Failure') {
        throw new Error(response.data.error);
      }
      const isStartFromBegining = retryoption === RETRY_OPIONS[0] || retryoption === RETRY_OPIONS[1];
      setFilesData((prev) => {
        return prev.map((f) => {
          return f.name === filename
            ? {
                ...f,
                status: 'Reprocess',
                processingProgress: isStartFromBegining ? 0 : f.processingProgress,
                nodesCount: isStartFromBegining ? 0 : f.nodesCount,
                relationshipCount: isStartFromBegining ? 0 : f.relationshipsCount,
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

  return (
    <>
      <RetryConfirmationDialog
        retryLoading={retryLoading}
        retryHandler={retryHandler}
        fileId={retryFile}
        onClose={retryOnclose}
        open={showRetryPopup}
        onBannerClose={onBannerClose}
        alertStatus={alertStateForRetry}
      />
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
      {showChunkPopup && (
        <ChunkPopUp
          chunksLoading={chunksLoading}
          onClose={() => toggleChunkPopup()}
          showChunkPopup={showChunkPopup}
          chunks={textChunks}
          incrementPage={incrementPage}
          decrementPage={decrementPage}
          currentPage={currentPage}
          totalPageCount={totalPageCount}
        ></ChunkPopUp>
      )}
      {showEnhancementDialog && (
        <GraphEnhancementDialog
          open={showEnhancementDialog}
          onClose={toggleEnhancementDialog}
          closeSettingModal={closeSettingModal}
        ></GraphEnhancementDialog>
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
            <span className='h6 px-1'>Neo4j connection {isReadOnlyUser ? '(Read only Mode)' : ''}</span>
            <Typography variant='body-medium'>
              <DatabaseStatusIcon
                isConnected={connectionStatus}
                isGdsActive={isGdsActive}
                uri={userCredentials && userCredentials?.uri}
              />
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
              text='Enhance graph quality'
              label='Graph Enhancemnet Settings'
              className='mr-2.5'
              onClick={toggleEnhancementDialog}
              disabled={!connectionStatus || isReadOnlyUser}
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
          onChunkView={async (name) => {
            setDocumentName(name);
            if (name != documentName) {
              toggleChunkPopup();
              if (totalPageCount) {
                setTotalPageCount(null);
              }
              setCurrentPage(1);
              // await getChunks(name, 1);
            }
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
          <DropdownComponent
            onSelect={handleDropdownChange}
            options={llms ?? ['']}
            placeholder='Select LLM Model'
            defaultValue={defaultLLM}
            view='ContentView'
            isDisabled={false}
          />
          <Flex flexDirection='row' gap='4' className='self-end' flexWrap='wrap'>
            <ButtonWithToolTip
              text={tooltips.generateGraph}
              placement='top'
              label='generate graph'
              onClick={onClickHandler}
              disabled={disableCheck || isReadOnlyUser}
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
              className='mr-0.5'
              label='show graph'
              size={isTablet ? 'small' : 'medium'}
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
              size={isTablet ? 'small' : 'medium'}
            >
              {buttonCaptions.exploreGraphWithBloom}
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={
                !selectedfileslength ? tooltips.deleteFile : `${selectedfileslength} ${tooltips.deleteSelectedFiles}`
              }
              placement='top'
              onClick={() => setshowDeletePopUp(true)}
              disabled={!selectedfileslength || isReadOnlyUser}
              className='ml-0.5'
              label='Delete Files'
              size={isTablet ? 'small' : 'medium'}
            >
              {buttonCaptions.deleteFiles}
              {selectedfileslength != undefined && selectedfileslength > 0 && `(${selectedfileslength})`}
            </ButtonWithToolTip>
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