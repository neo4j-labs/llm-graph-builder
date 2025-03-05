import {
  DataGrid,
  DataGridComponents,
  Flex,
  IconButton,
  ProgressBar,
  StatusIndicator,
  TextLink,
  Typography,
  useCopyToClipboard,
  Checkbox,
  useMediaQuery,
} from '@neo4j-ndl/react';
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  ForwardRefRenderFunction,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  CellContext,
  Table,
  Row,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useFileContext } from '../context/UsersFiles';
import { getSourceNodes } from '../services/GetFiles';
import { v4 as uuidv4 } from 'uuid';
import {
  statusCheck,
  isFileCompleted,
  calculateProcessedCount,
  getFileSourceStatus,
  isProcessingFileValid,
  capitalizeWithUnderscore,
  getParsedDate,
} from '../utils/Utils';
import { SourceNode, CustomFile, FileTableProps, UserCredentials, statusupdate, ChildRef } from '../types';
import { useCredentials } from '../context/UserCredentials';
import {
  ArrowPathIconSolid,
  ClipboardDocumentIconSolid,
  DocumentTextIconSolid,
  ExploreIcon,
} from '@neo4j-ndl/react/icons';
import CustomProgressBar from './UI/CustomProgressBar';
import subscribe from '../services/PollingAPI';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { AxiosError } from 'axios';
import { XMarkIconOutline } from '@neo4j-ndl/react/icons';
import cancelAPI from '../services/CancelAPI';
import { IconButtonWithToolTip } from './UI/IconButtonToolTip';
import { batchSize, largeFileSize, llms } from '../utils/Constants';
import { showErrorToast, showNormalToast } from '../utils/Toasts';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import BreakDownPopOver from './BreakDownPopOver';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { useAuth0 } from '@auth0/auth0-react';

let onlyfortheFirstRender = true;

const FileTable: ForwardRefRenderFunction<ChildRef, FileTableProps> = (props, ref) => {
  const { connectionStatus, setConnectionStatus, onInspect, onRetry, onChunkView } = props;
  const { filesData, setFilesData, model, rowSelection, setRowSelection, setSelectedRows, setProcessedCount, queue } =
    useFileContext();
  const { userCredentials, isReadOnlyUser } = useCredentials();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [filetypeFilter, setFiletypeFilter] = useState<string>('');
  const [fileSourceFilter, setFileSourceFilter] = useState<string>('');
  const [llmtypeFilter, setLLmtypeFilter] = useState<string>('');
  const skipPageResetRef = useRef<boolean>(false);
  const [_, copy] = useCopyToClipboard();
  const { colorMode } = useContext(ThemeWrapperContext);
  const [copyRow, setCopyRow] = useState<boolean>(false);
  const islargeDesktop = useMediaQuery(`(min-width:1440px )`);
  const tableRef = useRef(null);
  const { isAuthenticated } = useAuth0();

  const { updateStatusForLargeFiles } = useServerSideEvent(
    (inMinutes, time, fileName) => {
      showNormalToast(`${fileName} will take approx ${time} ${inMinutes ? 'Min' : 'Sec'}`);
    },
    (fileName) => {
      showErrorToast(`${fileName} Failed to process`);
    }
  );

  const handleCopy = (rowData: any) => {
    const rowString = JSON.stringify(rowData, null, 2);
    copy(rowString);
    setCopyRow(true);
    setTimeout(() => {
      setCopyRow(false);
    }, 5000);
  };
  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: Table<CustomFile> }) => {
          const processingcheck = table
            .getRowModel()
            .rows.map((i) => i.original.status)
            .includes('Processing');
          return (
            <Checkbox
              ariaLabel='header-checkbox'
              isChecked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              isDisabled={processingcheck}
              htmlAttributes={{
                title: processingcheck
                  ? `Files are still processing please select individual checkbox for deletion`
                  : 'select all rows for deletion',
              }}
            />
          );
        },
        cell: ({ row }: { row: Row<CustomFile> }) => {
          return (
            <div className='px-1'>
              <Checkbox
                ariaLabel='row-selection'
                isChecked={row.getIsSelected()}
                isDisabled={
                  !row.getCanSelect() ||
                  row.original.status == 'Uploading' ||
                  row.original.status === 'Processing' ||
                  row.original.status === 'Waiting'
                }
                onChange={row.getToggleSelectedHandler()}
              />
            </div>
          );
        },
        size: 80,
      },
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => {
          return (
            <div className='textellipsis'>
              <span
                title={
                  (info.row.original?.fileSource === 's3 bucket' && info.row.original?.sourceUrl) ||
                  (info.row.original?.fileSource === 'youtube' && info.row.original?.sourceUrl) ||
                  info.getValue()
                }
              >
                {info.getValue()}
              </span>
            </div>
          );
        },
        header: () => <span>Name</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.status, {
        id: 'status',
        cell: (info) => {
          if (info.getValue() != 'Processing') {
            return (
              <div
                className='cellClass flex! gap-1 items-center'
                title={info.row.original?.status === 'Failed' ? info.row.original?.errorMessage : ''}
              >
                <div>
                  <StatusIndicator type={statusCheck(info.getValue())} />
                </div>
                <div>{info.getValue()}</div>
                {(info.getValue() === 'Completed' || info.getValue() === 'Failed' || info.getValue() === 'Cancelled') &&
                  !isReadOnlyUser && (
                    <span className='mx-1'>
                      <IconButtonWithToolTip
                        placement='right'
                        text='Ready to Reprocess'
                        size='small'
                        label='Ready to Reprocess'
                        clean
                        onClick={() => onRetry(info?.row?.id as string)}
                      >
                        <ArrowPathIconSolid className='n-size-token-4' />
                      </IconButtonWithToolTip>
                    </span>
                  )}
              </div>
            );
          } else if (info.getValue() === 'Processing' && info.row.original.processingProgress === undefined) {
            return (
              <div className='cellClass flex! gap-1 items-center'>
                <div>
                  <StatusIndicator type={statusCheck(info.getValue())} />
                </div>
                <div>
                  <i>Processing</i>
                </div>
                <div className='mx-1'>
                  <IconButton
                    size='medium'
                    htmlAttributes={{
                      title: 'cancel the processing job',
                    }}
                    ariaLabel='cancel job button'
                    isClean
                    isDisabled={info.row.original.processingStatus}
                    onClick={() => {
                      cancelHandler(
                        info.row.original.name as string,
                        info.row.original.id as string,
                        info.row.original.fileSource as string
                      );
                    }}
                  >
                    <XMarkIconOutline />
                  </IconButton>
                </div>
              </div>
            );
          } else if (
            info.getValue() === 'Processing' &&
            info.row.original.processingProgress != undefined &&
            info.row.original.processingProgress < 100
          ) {
            return (
              <div className='cellClass'>
                <ProgressBar
                  heading='Processing '
                  size='small'
                  value={info.row.original.processingProgress}
                ></ProgressBar>
                <div className='mx-1'>
                  <IconButton
                    size='medium'
                    htmlAttributes={{
                      title: 'cancel the processing job',
                    }}
                    ariaLabel='cancel job button'
                    isClean={true}
                    isDisabled={info.row.original.processingStatus}
                    onClick={() => {
                      cancelHandler(
                        info.row.original.name as string,
                        info.row.original.id as string,
                        info.row.original.fileSource as string
                      );
                    }}
                  >
                    <XMarkIconOutline />
                  </IconButton>
                </div>
              </div>
            );
          }
          return (
            <div className='cellClass flex! gap-1'>
              <div>
                <StatusIndicator type={statusCheck(info.getValue())} />
              </div>
              <div>{info.getValue()}</div>
            </div>
          );
        },
        header: () => <span>Status</span>,
        footer: (info) => info.column.id,
        filterFn: 'statusFilter' as any,
        size: 250,
        meta: {
          columnActions: {
            actions: [
              {
                title: (
                  <span className={`${statusFilter === 'All' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    All Files
                  </span>
                ),
                onClick: () => {
                  setStatusFilter('All');
                  table.getColumn('status')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
              {
                title: (
                  <span className={`${statusFilter === 'Completed' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    <StatusIndicator type='success'></StatusIndicator> Completed Files
                  </span>
                ),
                onClick: () => {
                  setStatusFilter('Completed');
                  table.getColumn('status')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
              {
                title: (
                  <span className={`${statusFilter === 'New' ? 'n-bg-palette-primary-bg-selected' : 'p-2'} p-2`}>
                    <StatusIndicator type='info'></StatusIndicator> New Files
                  </span>
                ),
                onClick: () => {
                  setStatusFilter('New');
                  table.getColumn('status')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
              {
                title: (
                  <span className={`${statusFilter === 'Failed' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    <StatusIndicator type='danger'></StatusIndicator> Failed Files
                  </span>
                ),
                onClick: () => {
                  setStatusFilter('Failed');
                  table.getColumn('status')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
            ],
            hasDefaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.uploadProgress, {
        id: 'uploadprogess',
        cell: (info: CellContext<CustomFile, string>) => {
          if (parseInt(info.getValue()) === 100 || info.row.original?.status === 'New') {
            return (
              <div className='flex! gap-1 items-center'>
                <Typography variant='body-medium'>
                  <StatusIndicator type='success' />
                </Typography>
                <Typography variant='body-medium'>Uploaded</Typography>
              </div>
            );
          } else if (info.row.original?.status === 'Uploading') {
            return <CustomProgressBar value={parseInt(info?.getValue())}></CustomProgressBar>;
          } else if (info.row.original?.status === 'Failed') {
            return (
              <div className='flex! gap-1 items-center'>
                <Typography variant='body-medium'>
                  <StatusIndicator type='danger' />
                </Typography>
                <Typography variant='body-medium'> NA</Typography>
              </div>
            );
          }
          return (
            <div className='flex! items-center gap-1'>
              <Typography variant='body-medium'>
                <StatusIndicator type='success' />
              </Typography>
              <Typography variant='body-medium'>Uploaded</Typography>
            </div>
          );
        },
        header: () => <span>Upload Status</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.size, {
        id: 'fileSize',
        cell: (info: CellContext<CustomFile, string>) => <i>{(parseInt(info?.getValue()) / 1000)?.toFixed(2)}</i>,
        header: () => <span>Size (KB)</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row, {
        id: 'source',
        cell: (info) => {
          if (
            info.row.original.fileSource === 'youtube' ||
            info.row.original.fileSource === 'Wikipedia' ||
            info.row.original.fileSource === 'web-url'
          ) {
            return (
              <Flex>
                <span>
                  <TextLink type='external' target='_blank' href={info.row.original.sourceUrl}>
                    {info.row.original.fileSource}
                  </TextLink>
                </span>
              </Flex>
            );
          }
          return (
            <div>
              <span>{info.row.original.fileSource}</span>
            </div>
          );
        },
        header: () => <span>Source</span>,
        footer: (info) => info.column.id,
        filterFn: 'fileSourceFilter' as any,
        meta: {
          columnActions: {
            actions: [
              {
                title: (
                  <span className={`${fileSourceFilter === 'All' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    All Sources
                  </span>
                ),
                onClick: () => {
                  setFileSourceFilter('All');
                  table.getColumn('source')?.setFilterValue(true);
                },
              },
              ...Array.from(new Set(filesData.map((f) => f.fileSource))).map((t) => {
                return {
                  title: (
                    <span className={`${t === fileSourceFilter ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                      {t}
                    </span>
                  ),
                  onClick: () => {
                    setFileSourceFilter(t as string);
                    table.getColumn('source')?.setFilterValue(true);
                    skipPageResetRef.current = true;
                  },
                };
              }),
            ],
            hasDefaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: 'type',
        cell: (info) => {
          return (
            <div>
              <span>{info.row.original.type}</span>
            </div>
          );
        },
        header: () => <span>Type</span>,
        footer: (info) => info.column.id,
        filterFn: 'fileTypeFilter' as any,
        meta: {
          columnActions: {
            actions: [
              {
                title: (
                  <span className={`${filetypeFilter === 'All' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    All Types
                  </span>
                ),
                onClick: () => {
                  setFiletypeFilter('All');
                  table.getColumn('type')?.setFilterValue(true);
                },
              },
              ...Array.from(new Set(filesData.map((f) => f.type))).map((t) => {
                return {
                  title: (
                    <span className={`${t === filetypeFilter ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>{t}</span>
                  ),
                  onClick: () => {
                    setFiletypeFilter(t as string);
                    table.getColumn('type')?.setFilterValue(true);
                    skipPageResetRef.current = true;
                  },
                };
              }),
            ],
            hasDefaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.model, {
        id: 'model',
        cell: (info) => {
          const model = info.getValue();
          return <i>{capitalizeWithUnderscore(model)}</i>;
        },
        header: () => <span>Model</span>,
        footer: (info) => info.column.id,
        filterFn: 'llmTypeFilter' as any,
        meta: {
          columnActions: {
            actions: [
              {
                title: (
                  <span className={`${llmtypeFilter === 'All' ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>
                    All
                  </span>
                ),
                onClick: () => {
                  setLLmtypeFilter('All');
                  table.getColumn('model')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
              ...llms.map((m) => {
                return {
                  title: (
                    <span className={`${m === llmtypeFilter ? 'n-bg-palette-primary-bg-selected' : ''} p-2`}>{m}</span>
                  ),
                  onClick: () => {
                    setLLmtypeFilter(m);
                    table.getColumn('model')?.setFilterValue(true);
                    skipPageResetRef.current = true;
                  },
                };
              }),
            ],
            hasDefaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.nodesCount, {
        id: 'NodesCount',
        cell: (info) => {
          const hasNodeBreakDownValues =
            info.row.original.chunkNodeCount > 0 ||
            info.row.original.communityNodeCount > 0 ||
            info.row.original.entityNodeCount > 0;

          return (
            <Flex alignItems='center' flexDirection='row'>
              <i>{info.getValue()}</i>
              {hasNodeBreakDownValues &&
                (info.row.original.status === 'Completed' ||
                  info.row.original.status === 'Failed' ||
                  info.row.original.status === 'Cancelled') && (
                  <BreakDownPopOver file={info.row.original} isNodeCount={true} />
                )}
            </Flex>
          );
        },
        header: () => <span>Nodes</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.relationshipsCount, {
        id: 'relationshipCount',
        cell: (info) => {
          const hasRelationsBreakDownValues =
            info.row.original.chunkRelCount > 0 ||
            info.row.original.communityRelCount > 0 ||
            info.row.original.entityEntityRelCount > 0;
          return (
            <Flex alignItems='center' flexDirection='row'>
              <i>{info.getValue()}</i>
              {hasRelationsBreakDownValues &&
                (info.row.original.status === 'Completed' ||
                  info.row.original.status === 'Failed' ||
                  info.row.original.status === 'Cancelled') && (
                  <BreakDownPopOver file={info.row.original} isNodeCount={false} />
                )}
            </Flex>
          );
        },
        header: () => <span>Relations</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.status, {
        id: 'inspect',
        cell: (info) => (
          <>
            <IconButtonWithToolTip
              placement='right'
              text='Graph'
              size='large'
              label='Graph view'
              disabled={info.getValue() === 'New' || info.getValue() === 'Uploading'}
              clean
              onClick={() => onInspect(info?.row?.original?.name as string)}
            >
              <ExploreIcon className='n-size-token-7' />
            </IconButtonWithToolTip>
            <IconButtonWithToolTip
              placement='left'
              text='copy'
              size='large'
              label='Copy Row'
              disabled={info.getValue() === 'Uploading'}
              clean
              onClick={() => {
                const copied = { ...info.row.original };
                delete copied.accessToken;
                handleCopy(copied);
              }}
            >
              <ClipboardDocumentIconSolid className={`${copyRow} ? 'cursor-wait': 'cursor`} />
            </IconButtonWithToolTip>
            <IconButtonWithToolTip
              onClick={() => {
                onChunkView(info?.row?.original?.name as string);
              }}
              clean
              placement='left'
              label='chunktextaction'
              text='View Chunks'
              size='large'
              disabled={info.getValue() === 'Uploading' || info.getValue() === 'New'}
            >
              <DocumentTextIconSolid className='n-size-token-7' />
            </IconButtonWithToolTip>
          </>
        ),
        maxSize: 300,
        minSize: 180,
        header: () => <span>Actions</span>,
        footer: (info) => info.column.id,
      }),
    ],
    [filesData.length, statusFilter, filetypeFilter, llmtypeFilter, fileSourceFilter, isReadOnlyUser, colorMode]
  );

  const table = useReactTable({
    data: filesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    filterFns: {
      statusFilter: (row, columnId, filterValue) => {
        if (statusFilter === 'All') {
          return row;
        }
        const value = filterValue ? row.original[columnId] === statusFilter : row.original[columnId];
        return value;
      },
      fileTypeFilter: (row) => {
        if (filetypeFilter === 'All') {
          return true;
        }
        return row.original.type === filetypeFilter;
      },
      fileSourceFilter: (row) => {
        if (fileSourceFilter === 'All') {
          return true;
        }
        return row.original.fileSource === fileSourceFilter;
      },
      llmTypeFilter: (row) => {
        if (llmtypeFilter === 'All') {
          return true;
        }
        return row.original.model === llmtypeFilter;
      },
    },
    enableGlobalFilter: false,
    autoResetPageIndex: skipPageResetRef.current,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => row.id,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    skipPageResetRef.current = false;
  }, [filesData.length]);

  const handleFileUploadError = (error: AxiosError) => {
    // @ts-ignore
    const errorfile = decodeURI(error?.config?.url?.split('?')[0].split('/').at(-1));
    setProcessedCount((prev) => Math.max(prev - 1, 0));
    setFilesData((prevfiles) =>
      prevfiles.map((curfile) => (curfile.name === errorfile ? { ...curfile, status: 'Failed' } : curfile))
    );
  };

  const handleSmallFile = (item: SourceNode, userCredentials: UserCredentials) => {
    subscribe(item.fileName, userCredentials, updatestatus, updateProgress).catch(handleFileUploadError);
  };

  const handleLargeFile = (item: SourceNode, userCredentials: UserCredentials) => {
    triggerStatusUpdateAPI(item.fileName, userCredentials, updateStatusForLargeFiles);
  };
  useEffect(() => {
    const waitingQueue: CustomFile[] = JSON.parse(
      localStorage.getItem('waitingQueue') ?? JSON.stringify({ queue: [] })
    ).queue;
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res = await getSourceNodes();
        if (!res.data) {
          throw new Error('Please check backend connection');
        }
        const stringified = waitingQueue.reduce((accu, f) => {
          const key = f.id;
          // @ts-ignore
          accu[key] = true;
          return accu;
        }, {});
        setRowSelection(stringified);
        if (res.data.status !== 'Failed') {
          const prefiles: CustomFile[] = [];
          if (res.data.data.length) {
            res.data.data.forEach((item) => {
              if (item.fileName != undefined && item.fileName.length) {
                const waitingFile =
                  waitingQueue.length && waitingQueue.find((f: CustomFile) => f.name === item.fileName);
                if (isFileCompleted(waitingFile as CustomFile, item)) {
                  setProcessedCount((prev) => calculateProcessedCount(prev, batchSize));
                  queue.remove(item.fileName);
                }
                if (waitingFile && item.status === 'Completed') {
                  setProcessedCount((prev) => {
                    if (prev === batchSize) {
                      return batchSize - 1;
                    }
                    return prev + 1;
                  });
                  queue.remove(item.fileName);
                }
                prefiles.push({
                  name: item?.fileName,
                  size: item?.fileSize ?? 0,
                  type: item?.fileType?.includes('.')
                    ? item?.fileType?.substring(1)?.toUpperCase() ?? 'None'
                    : item?.fileType?.toUpperCase() ?? 'None',
                  nodesCount: item?.nodeCount ?? 0,
                  processingTotalTime: item?.processingTime ?? 'None',
                  relationshipsCount: item?.relationshipCount ?? 0,
                  status: waitingFile ? 'Waiting' : getFileSourceStatus(item),
                  model: item?.model ?? model,
                  id: !waitingFile ? uuidv4() : waitingFile.id,
                  sourceUrl: item?.url != 'None' && item?.url != '' ? item.url : '',
                  fileSource: item?.fileSource ?? 'None',
                  gcsBucket: item?.gcsBucket,
                  gcsBucketFolder: item?.gcsBucketFolder,
                  errorMessage: item?.errorMessage,
                  uploadProgress: item?.uploadprogress ?? 0,
                  googleProjectId: item?.gcsProjectId,
                  language: item?.language ?? '',
                  processingProgress:
                    item?.processed_chunk != undefined &&
                    item?.total_chunks != undefined &&
                    !isNaN(Math.floor((item?.processed_chunk / item?.total_chunks) * 100))
                      ? Math.floor((item?.processed_chunk / item?.total_chunks) * 100)
                      : undefined,
                  accessToken: item?.accessToken ?? '',
                  retryOption: item.retry_condition ?? '',
                  retryOptionStatus: false,
                  chunkNodeCount: item.chunkNodeCount ?? 0,
                  chunkRelCount: item.chunkRelCount ?? 0,
                  entityNodeCount: item.entityNodeCount ?? 0,
                  entityEntityRelCount: item.entityEntityRelCount ?? 0,
                  communityNodeCount: item.communityNodeCount ?? 0,
                  communityRelCount: item.communityRelCount ?? 0,
                  createdAt: item.createdAt != undefined ? getParsedDate(item?.createdAt) : undefined,
                });
              }
            });
            res.data.data.forEach((item) => {
              if (isProcessingFileValid(item, userCredentials as UserCredentials)) {
                item.fileSize < largeFileSize
                  ? handleSmallFile(item, userCredentials as UserCredentials)
                  : handleLargeFile(item, userCredentials as UserCredentials);
              }
            });
          } else {
            queue.clear();
          }
          setIsLoading(false);
          setFilesData(prefiles);
        } else {
          throw new Error(res?.data?.error);
        }
        setIsLoading(false);
      } catch (error: any) {
        console.log(error);
        if (error instanceof Error) {
          showErrorToast(error.message);
        }

        setIsLoading(false);
        setConnectionStatus(false);
        setFilesData([]);
      }
    };
    if (connectionStatus) {
      fetchFiles();
    } else {
      setFilesData([]);
    }
  }, [connectionStatus, userCredentials]);

  useEffect(() => {
    if (connectionStatus && filesData.length && onlyfortheFirstRender && !isReadOnlyUser) {
      const processingFilesCount = filesData.filter((f) => f.status === 'Processing').length;
      if (processingFilesCount) {
        if (processingFilesCount === 1) {
          setProcessedCount(1);
        }
        showNormalToast(`Files are in processing please wait till previous batch completes`);
      } else {
        const waitingQueue: CustomFile[] = JSON.parse(
          localStorage.getItem('waitingQueue') ?? JSON.stringify({ queue: [] })
        ).queue;
        if (waitingQueue.length) {
          props.handleGenerateGraph();
        }
      }
      onlyfortheFirstRender = false;
    }
  }, [connectionStatus, filesData.length, isReadOnlyUser]);

  const cancelHandler = async (fileName: string, id: string, fileSource: string) => {
    setFilesData((prevfiles) =>
      prevfiles.map((curfile) => {
        if (curfile.id === id) {
          return {
            ...curfile,
            processingStatus: true,
          };
        }
        return curfile;
      })
    );
    try {
      const res = await cancelAPI([fileName], [fileSource]);
      if (res.data.status === 'Success') {
        setFilesData((prevfiles) =>
          prevfiles.map((curfile) => {
            if (curfile.id === id) {
              return {
                ...curfile,
                status: 'Cancelled',
                processingStatus: false,
              };
            }
            return curfile;
          })
        );
        setProcessedCount((prev) => {
          if (prev == batchSize) {
            return batchSize - 1;
          }
          return prev + 1;
        });
        queue.remove(fileName);
      } else {
        let errorobj = { error: res.data.error, message: res.data.message, fileName };
        throw new Error(JSON.stringify(errorobj));
      }
    } catch (err) {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.id === id) {
            return {
              ...curfile,
              processingStatus: false,
            };
          }
          return curfile;
        })
      );
      if (err instanceof Error) {
        const error = JSON.parse(err.message);
        if (Object.keys(error).includes('fileName')) {
          const { message } = error;
          showErrorToast(message);
        }
      }
    }
  };

  const updatestatus = (i: statusupdate) => {
    const { file_name } = i;
    const {
      fileName,
      nodeCount = 0,
      relationshipCount = 0,
      processingTime = 0,
      model,
      status,
      processed_chunk = 0,
      total_chunks,
      chunkNodeCount,
      entityNodeCount,
      communityNodeCount,
      chunkRelCount,
      entityEntityRelCount,
      communityRelCount,
    } = file_name;
    if (fileName && total_chunks) {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              nodesCount: nodeCount,
              relationshipsCount: relationshipCount,
              model: model,
              processingTotalTime: processingTime?.toFixed(2),
              processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
              chunkNodeCount: chunkNodeCount ?? 0,
              entityNodeCount: entityNodeCount ?? 0,
              communityNodeCount: communityNodeCount ?? 0,
              chunkRelCount: chunkRelCount ?? 0,
              entityEntityRelCount: entityEntityRelCount ?? 0,
              communityRelCount: communityRelCount ?? 0,
            };
          }
          return curfile;
        })
      );
      setProcessedCount((prev) => {
        if (prev == batchSize) {
          return batchSize - 1;
        }
        return prev + 1;
      });
      queue.remove(fileName);
    }
  };

  const updateProgress = (i: statusupdate) => {
    const { file_name } = i;
    const {
      fileName,
      nodeCount = 0,
      relationshipCount = 0,
      status,
      processed_chunk = 0,
      total_chunks,
      chunkNodeCount,
      entityNodeCount,
      communityNodeCount,
      chunkRelCount,
      entityEntityRelCount,
      communityRelCount,
    } = file_name;
    if (fileName && total_chunks) {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              nodesCount: nodeCount,
              relationshipsCount: relationshipCount,
              processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
              chunkNodeCount: chunkNodeCount ?? 0,
              entityNodeCount: entityNodeCount ?? 0,
              communityNodeCount: communityNodeCount ?? 0,
              chunkRelCount: chunkRelCount ?? 0,
              entityEntityRelCount: entityEntityRelCount ?? 0,
              communityRelCount: communityRelCount ?? 0,
            };
          }
          return curfile;
        })
      );
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () => table.getSelectedRowModel().rows.map((r) => r.original),
    }),
    [table]
  );

  useEffect(() => {
    setSelectedRows(table.getSelectedRowModel().rows.map((i) => i.id));
  }, [table.getSelectedRowModel()]);

  return (
    <>
      {filesData ? (
        <>
          <DataGrid
            ref={tableRef}
            isResizable={true}
            tableInstance={table}
            styling={{
              borderStyle: 'all-sides',
              hasZebraStriping: true,
              headerStyle: 'clean',
            }}
            isLoading={isLoading}
            rootProps={{
              className: `absolute h-[67%] left-10 filetable ${!islargeDesktop ? 'top-[17%]' : 'top-[14%]'}`,
            }}
            components={{
              Body: () => (
                <DataGridComponents.Body
                  innerProps={{
                    className: colorMode == 'dark' ? 'tbody-dark' : 'tbody-light',
                  }}
                />
              ),
              TableResults: () => {
                if (connectionStatus && !isAuthenticated && !isLoading && filesData.length === 0) {
                  return (
                    <DataGridComponents.TableResults>
                      <Flex flexDirection='row' gap='0' alignItems='center'>
                        <span>
                          <InformationCircleIconOutline className='n-size-token-6' />
                        </span>
                        {` It seems like you haven't ingested any data yet. To begin building your knowledge graph, you'll need to log
            in to the main application.`}
                        <span></span>
                      </Flex>
                    </DataGridComponents.TableResults>
                  );
                } else if (connectionStatus) {
                  return (
                    <DataGridComponents.TableResults>
                      <Flex flexDirection='row' gap='0' alignItems='center'>
                        <span>
                          <InformationCircleIconOutline className='n-size-token-6' />
                        </span>
                        {`Large files may be partially processed up to 10K characters due to resource limit.`}
                        <span></span>
                      </Flex>
                    </DataGridComponents.TableResults>
                  );
                }
                return <DataGridComponents.TableResults></DataGridComponents.TableResults>;
              },
              PaginationNumericButton: ({ isSelected, innerProps, ...restProps }) => {
                return (
                  <DataGridComponents.PaginationNumericButton
                    {...restProps}
                    isSelected={isSelected}
                    innerProps={{
                      ...innerProps,
                      style: {
                        ...(isSelected && {
                          backgroundSize: '200% auto',
                          borderRadius: '10px',
                        }),
                      },
                    }}
                  />
                );
              },
            }}
            isKeyboardNavigable={false}
          />
        </>
      ) : null}
    </>
  );
};

export default forwardRef(FileTable);
