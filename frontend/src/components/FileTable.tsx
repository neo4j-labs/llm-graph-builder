import {
  Checkbox,
  DataGrid,
  DataGridComponents,
  Flex,
  IconButton,
  ProgressBar,
  StatusIndicator,
  TextLink,
  Typography,
} from '@neo4j-ndl/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
import { statusCheck, capitalize } from '../utils/Utils';
import {
  SourceNode,
  CustomFile,
  FileTableProps,
  UserCredentials,
  statusupdate,
  alertStateType,
  ChildRef,
} from '../types';
import { useCredentials } from '../context/UserCredentials';
import { MagnifyingGlassCircleIconSolid } from '@neo4j-ndl/react/icons';
import CustomAlert from './UI/Alert';
import CustomProgressBar from './UI/CustomProgressBar';
import subscribe from '../services/PollingAPI';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { AxiosError } from 'axios';
import { XMarkIconOutline } from '@neo4j-ndl/react/icons';
import cancelAPI from '../services/CancelAPI';
import IconButtonWithToolTip from './UI/IconButtonToolTip';
import { batchSize, largeFileSize, llms } from '../utils/Constants';
import IndeterminateCheckbox from './UI/CustomCheckBox';
let onlyfortheFirstRender = true;
const FileTable = forwardRef<ChildRef, FileTableProps>((props, ref) => {
  const { isExpanded, connectionStatus, setConnectionStatus, onInspect } = props;
  const { filesData, setFilesData, model, rowSelection, setRowSelection, setSelectedRows, setProcessedCount, queue } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusFilter, setstatusFilter] = useState<string>('');
  const [filetypeFilter, setFiletypeFilter] = useState<string>('');
  const [fileSourceFilter, setFileSourceFilter] = useState<string>('');
  const [llmtypeFilter, setLLmtypeFilter] = useState<string>('');
  const skipPageResetRef = useRef<boolean>(false);
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });

  const tableRef = useRef(null);

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
              aria-label='header-checkbox'
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              disabled={processingcheck}
              title={
                processingcheck
                  ? `Files are still processing please select individual checkbox for deletion`
                  : 'select all rows for deletion'
              }
            />
          );
        },
        cell: ({ row }: { row: Row<CustomFile> }) => {
          return (
            <div className='px-1'>
              <IndeterminateCheckbox
                {...{
                  checked: row.getIsSelected(),
                  disabled:
                    !row.getCanSelect() || row.original.status == 'Uploading' || row.original.status === 'Processing',
                  indeterminate: row.getIsSomeSelected(),
                  onChange: row.getToggleSelectedHandler(),
                }}
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
                  (info.row.original?.fileSource === 's3 bucket' && info.row.original?.source_url) ||
                  (info.row.original?.fileSource === 'youtube' && info.row.original?.source_url) ||
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
                className='cellClass'
                title={info.row.original?.status === 'Failed' ? info.row.original?.errorMessage : ''}
              >
                <StatusIndicator type={statusCheck(info.getValue())} />
                {info.getValue()}
              </div>
            );
          } else if (info.getValue() === 'Processing' && info.row.original.processingProgress === undefined) {
            return (
              <div className='cellClass'>
                <StatusIndicator type={statusCheck(info.getValue())} />
                <i>Processing</i>
                <div className='mx-1'>
                  <IconButton
                    size='medium'
                    title='cancel the processing job'
                    aria-label='cancel job button'
                    clean
                    disabled={info.row.original.processingStatus}
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
                    title='cancel the processing job'
                    aria-label='cancel job button'
                    clean
                    disabled={info.row.original.processingStatus}
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
        },
        header: () => <span>Status</span>,
        footer: (info) => info.column.id,
        filterFn: 'statusFilter' as any,
        size: 200,
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
                  setstatusFilter('All');
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
                  setstatusFilter('Completed');
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
                  setstatusFilter('New');
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
                  setstatusFilter('Failed');
                  table.getColumn('status')?.setFilterValue(true);
                  skipPageResetRef.current = true;
                },
              },
            ],
            defaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.uploadprogess, {
        id: 'uploadprogess',
        cell: (info: CellContext<CustomFile, string>) => {
          if (parseInt(info.getValue()) === 100 || info.row.original?.status === 'New') {
            return (
              <Typography variant='body-medium'>
                <StatusIndicator type='success' />
                Uploaded
              </Typography>
            );
          } else if (info.row.original?.status === 'Uploading') {
            return <CustomProgressBar value={parseInt(info?.getValue())}></CustomProgressBar>;
          } else if (info.row.original?.status === 'Failed') {
            return (
              <Typography variant='body-medium'>
                <StatusIndicator type='danger' />
                NA
              </Typography>
            );
          }
          return (
            <Typography variant='body-medium'>
              <StatusIndicator type='success' />
              Uploaded
            </Typography>
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
                  <TextLink externalLink href={info.row.original.source_url}>
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
            defaultSortingActions: false,
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
            defaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.model, {
        id: 'model',
        cell: (info) => {
          const model = info.getValue();
          return (
            <i>
              {(model.includes('LLM_MODEL_CONFIG_')
                ? capitalize(model.split('LLM_MODEL_CONFIG_').at(-1) as string)
                : capitalize(model)
              )
                .split('_')
                .join(' ')}
            </i>
          );
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
            defaultSortingActions: false,
          },
        },
      }),
      columnHelper.accessor((row) => row.NodesCount, {
        id: 'NodesCount',
        cell: (info) => <i>{info.getValue()}</i>,
        header: () => <span>Nodes</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.relationshipCount, {
        id: 'relationshipCount',
        cell: (info) => <i>{info.getValue()}</i>,
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
              <MagnifyingGlassCircleIconSolid />
            </IconButtonWithToolTip>
          </>
        ),
        header: () => <span>View</span>,
        footer: (info) => info.column.id,
      }),
    ],
    [filesData.length, statusFilter, filetypeFilter, llmtypeFilter, fileSourceFilter]
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

  useEffect(() => {
    const waitingQueue: CustomFile[] = JSON.parse(
      localStorage.getItem('waitingQueue') ?? JSON.stringify({ queue: [] })
    ).queue;
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res = await getSourceNodes(userCredentials as UserCredentials);
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
            res.data.data.forEach((item: SourceNode) => {
              if (item.fileName != undefined && item.fileName.length) {
                const waitingFile =
                  waitingQueue.length && waitingQueue.find((f: CustomFile) => f.name === item.fileName);
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
                  NodesCount: item?.nodeCount ?? 0,
                  processing: item?.processingTime ?? 'None',
                  relationshipCount: item?.relationshipCount ?? 0,
                  status: waitingFile
                    ? 'Waiting'
                    : item?.fileSource === 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                    ? item?.status
                    : item?.fileSource === 'local file'
                    ? item?.status
                    : item?.status === 'Completed' || item.status === 'Failed'
                    ? item?.status
                    : item?.fileSource === 'Wikipedia' ||
                      item?.fileSource === 'youtube' ||
                      item?.fileSource === 'gcs bucket' ||
                      item?.fileSource === 'web-url'
                    ? item?.status
                    : 'N/A',
                  model: waitingFile ? waitingFile.model : item?.model ?? model,
                  id: !waitingFile ? uuidv4() : waitingFile.id,
                  source_url: item?.url != 'None' && item?.url != '' ? item.url : '',
                  fileSource: item?.fileSource ?? 'None',
                  gcsBucket: item?.gcsBucket,
                  gcsBucketFolder: item?.gcsBucketFolder,
                  errorMessage: item?.errorMessage,
                  uploadprogess: item?.uploadprogress ?? 0,
                  google_project_id: item?.gcsProjectId,
                  language: item?.language ?? '',
                  processingProgress:
                    item?.processed_chunk != undefined &&
                    item?.total_chunks != undefined &&
                    !isNaN(Math.floor((item?.processed_chunk / item?.total_chunks) * 100))
                      ? Math.floor((item?.processed_chunk / item?.total_chunks) * 100)
                      : undefined,
                  // total_pages: item?.total_pages ?? 0,
                  access_token: item?.access_token ?? '',
                });
              }
            });
            res.data.data.forEach((item) => {
              if (
                item.status === 'Processing' &&
                item.fileName != undefined &&
                userCredentials &&
                userCredentials.database
              ) {
                if (item?.fileSize < largeFileSize) {
                  subscribe(
                    item.fileName,
                    userCredentials?.uri,
                    userCredentials?.userName,
                    userCredentials?.database,
                    userCredentials?.password,
                    updatestatus,
                    updateProgress
                  ).catch((error: AxiosError) => {
                    // @ts-ignore
                    const errorfile = decodeURI(error?.config?.url?.split('?')[0].split('/').at(-1));
                    setProcessedCount((prev) => {
                      if (prev == batchSize) {
                        return batchSize - 1;
                      }
                      return prev + 1;
                    });
                    setFilesData((prevfiles) => {
                      return prevfiles.map((curfile) => {
                        if (curfile.name == errorfile) {
                          return {
                            ...curfile,
                            status: 'Failed',
                          };
                        }
                        return curfile;
                      });
                    });
                  });
                } else {
                  triggerStatusUpdateAPI(
                    item.fileName,
                    userCredentials.uri,
                    userCredentials.userName,
                    userCredentials.password,
                    userCredentials.database,
                    updateStatusForLargeFiles
                  );
                }
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
        setalertDetails({
          showAlert: true,
          alertType: 'error',
          alertMessage: error.message,
        });
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
    if (connectionStatus && filesData.length && onlyfortheFirstRender) {
      const processingFilesCount = filesData.filter((f) => f.status === 'Processing').length;
      if (processingFilesCount) {
        if (processingFilesCount === 1) {
          setProcessedCount(1);
        }
        setalertDetails({
          showAlert: true,
          alertType: 'info',
          alertMessage: `Files are in processing please wait till previous batch completes`,
        });
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
  }, [connectionStatus, filesData.length]);

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
          setalertDetails({
            showAlert: true,
            alertType: 'error',
            alertMessage: message,
          });
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
    } = file_name;
    if (fileName && total_chunks) {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              NodesCount: nodeCount,
              relationshipCount: relationshipCount,
              model: model,
              processing: processingTime?.toFixed(2),
              processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
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
    const { fileName, nodeCount = 0, relationshipCount = 0, status, processed_chunk = 0, total_chunks } = file_name;
    if (fileName && total_chunks) {
      setFilesData((prevfiles) =>
        prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              NodesCount: nodeCount,
              relationshipCount: relationshipCount,
              processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
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
    if (tableRef.current) {
      // Component has content, calculate maximum height for table
      // Observes the height of the content and calculates own height accordingly
      const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { height } = entry.contentRect;
          const rowHeight = document?.getElementsByClassName('ndl-data-grid-td')?.[0]?.clientHeight ?? 69;
          table.setPageSize(Math.floor(height / rowHeight));
        });
      });

      const [contentElement] = document.getElementsByClassName('ndl-data-grid-scrollable');
      resizeObserver.observe(contentElement);

      return () => {
        // Stop observing content after cleanup
        resizeObserver.unobserve(contentElement);
      };
    }
  }, []);

  const classNameCheck = isExpanded ? 'fileTableWithExpansion' : `filetable`;

  const handleClose = () => {
    setalertDetails((prev) => ({ ...prev, showAlert: false }));
    localStorage.setItem('alertShown', JSON.stringify(true));
  };
  useEffect(() => {
    setSelectedRows(table.getSelectedRowModel().rows.map((i) => i.id));
  }, [table.getSelectedRowModel()]);

  return (
    <>
      {alertDetails.showAlert && (
        <CustomAlert
          open={alertDetails.showAlert}
          handleClose={handleClose}
          severity={alertDetails.alertType}
          alertMessage={alertDetails.alertMessage}
        />
      )}
      {filesData ? (
        <>
          <div className={`${isExpanded ? 'w-[calc(100%-64px)]' : 'mx-auto w-[calc(100%-100px)]'}`}>
            <DataGrid
              ref={tableRef}
              isResizable={true}
              tableInstance={table}
              styling={{
                borderStyle: 'all-sides',
                zebraStriping: true,
                headerStyle: 'clean',
              }}
              isLoading={isLoading}
              rootProps={{
                className: classNameCheck,
              }}
              components={{
                Body: (props) => <DataGridComponents.Body {...props} />,
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
            />
          </div>
        </>
      ) : null}
    </>
  );
});

export default FileTable;
