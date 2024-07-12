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
import { forwardRef, HTMLProps, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import React from 'react';
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
import { SourceNode, CustomFile, FileTableProps, UserCredentials, statusupdate, alertStateType } from '../types';
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
import { largeFileSize } from '../utils/Constants';

export interface ChildRef {
  getSelectedRows: () => CustomFile[];
}

const FileTable = forwardRef<ChildRef, FileTableProps>((props, ref) => {
  const { isExpanded, connectionStatus, setConnectionStatus, onInspect } = props;
  const { filesData, setFilesData, model, rowSelection, setRowSelection, setSelectedRows } = useFileContext();
  const { userCredentials } = useCredentials();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [currentOuterHeight, setcurrentOuterHeight] = useState<number>(window.outerHeight);
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
                  </TextLink>{' '}
                  /
                </span>
                <Typography variant='body-medium'>{info.row.original.type}</Typography>
              </Flex>
            );
          }
          return (
            <div>
              <span>{info.row.original.fileSource} / </span>
              <span>{info.row.original.type}</span>
            </div>
          );
        },
        header: () => <span>Source/Type</span>,
        footer: (info) => info.column.id,
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
      // columnHelper.accessor((row) => row.total_pages, {
      //   id: 'Total pages',
      //   cell: (info) => <i>{info.getValue()}</i>,
      //   header: () => <span>Total pages</span>,
      //   footer: (info) => info.column.id,
      // }),
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
    []
  );

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res = await getSourceNodes(userCredentials as UserCredentials);
        if (!res.data) {
          throw new Error('Please check backend connection');
        }
        if (res.data.status !== 'Failed') {
          const prefiles: CustomFile[] = [];
          if (res.data.data.length) {
            res.data.data.forEach((item: SourceNode) => {
              if (item.fileName != undefined && item.fileName.length) {
                prefiles.push({
                  name: item?.fileName,
                  size: item?.fileSize ?? 0,
                  type: item?.fileType?.includes('.')
                    ? item?.fileType?.substring(1)?.toUpperCase() ?? 'None'
                    : item?.fileType?.toUpperCase() ?? 'None',
                  NodesCount: item?.nodeCount ?? 0,
                  processing: item?.processingTime ?? 'None',
                  relationshipCount: item?.relationshipCount ?? 0,
                  status:
                    item?.fileSource === 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                      ? item?.status
                      : item?.fileSource === 'local file'
                      ? item?.status
                      : item?.status === 'Completed' || item.status === 'Failed'
                      ? item?.status
                      : item?.fileSource == 'Wikipedia' ||
                        item?.fileSource == 'youtube' ||
                        item?.fileSource == 'gcs bucket'
                      ? item?.status
                      : 'N/A',
                  model: item?.model ?? model,
                  id: uuidv4(),
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
          }
          setIsLoading(false);
          setFilesData(prefiles);
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

  // const pageSizeCalculation = Math.floor((currentOuterHeight - 402) / 45);

  const table = useReactTable({
    data: filesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    // initialState: {
    //   pagination: {
    //     pageSize: pageSizeCalculation < 0 ? 9 : pageSizeCalculation,
    //   },
    // },
    state: {
      columnFilters,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    filterFns: {
      statusFilter: (row, columnId, filterValue) => {
        const value = filterValue ? row.original[columnId] === 'New' : row.original[columnId];
        return value;
      },
    },
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => row.id,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
  });
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
          // setcurrentOuterHeight(height);
          const rowHeight = document?.getElementsByClassName('ndl-data-grid-td')?.[0]?.clientHeight ?? 69;
          table.setPageSize(Math.floor(height / rowHeight));
        });
      });

      const contentElement = document.getElementsByClassName('ndl-data-grid-scrollable')[0];
      resizeObserver.observe(contentElement);

      return () => {
        // Stop observing content after cleanup
        resizeObserver.unobserve(contentElement);
      };
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    table.getColumn('status')?.setFilterValue(e.target.checked);
    if (!table.getCanNextPage() || table.getPrePaginationRowModel().rows.length) {
      table.setPageIndex(0);
    }
  };

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
          <div className='flex items-center p-5 self-start gap-2'>
            <input type='checkbox' onChange={handleChange} />
            <label>Show files with status New </label>
          </div>
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
function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <Checkbox aria-label='row checkbox' type='checkbox' ref={ref} className={`${className} cursor-pointer`} {...rest} />
  );
}
