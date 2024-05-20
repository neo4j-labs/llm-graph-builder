import {
  Checkbox,
  DataGrid,
  DataGridComponents,
  IconButton,
  StatusIndicator,
  TextLink,
  Typography,
} from '@neo4j-ndl/react';
import { useEffect, useMemo, useState } from 'react';
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
} from '@tanstack/react-table';
import { useFileContext } from '../context/UsersFiles';
import { getSourceNodes } from '../services/GetFiles';
import { v4 as uuidv4 } from 'uuid';
import { statusCheck } from '../utils/Utils';
import { SourceNode, CustomFile, FileTableProps, UserCredentials, statusupdate, alertState } from '../types';
import { useCredentials } from '../context/UserCredentials';
import { MagnifyingGlassCircleIconSolid } from '@neo4j-ndl/react/icons';
import CustomAlert from './Alert';
import CustomProgressBar from './CustomProgressBar';
import subscribe from '../services/PollingAPI';
import { triggerStatusUpdateAPI } from '../services/ServerSideStatusUpdateAPI';
import useServerSideEvent from '../hooks/useSse';
import { AxiosError } from 'axios';

const FileTable: React.FC<FileTableProps> = ({ isExpanded, connectionStatus, setConnectionStatus, onInspect }) => {
  const { filesData, setFilesData, model, rowSelection, setRowSelection, setSelectedRows } = useFileContext();
  const { userCredentials } = useCredentials();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentOuterHeight, setcurrentOuterHeight] = useState<number>(window.outerHeight);
  const [alertDetails, setalertDetails] = useState<alertState>({
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
              <Checkbox
                aria-label='row-checkbox'
                checked={
                  row.getIsSelected() && row.original.status != 'Uploading' && row.original.status != 'Processing'
                }
                disabled={
                  !row.getCanSelect() || row.original.status === 'Uploading' || row.original.status === 'Processing'
                }
                onChange={row.getToggleSelectedHandler()}
                title='select row for deletion'
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
                  info.row.original?.fileSource === 's3 bucket'
                    ? info.row.original?.source_url
                    : info.row.original?.fileSource === 'youtube'
                    ? info.row.original?.source_url
                    : info.getValue()
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
        cell: (info) => (
          <div
            className='cellClass'
            title={info.row.original?.status === 'Failed' ? info.row.original?.errorMessage : ''}
          >
            <StatusIndicator type={statusCheck(info.getValue())} />
            <i>{info.getValue()}</i>
          </div>
        ),
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
        header: () => <span>Upload Progress</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.size, {
        id: 'fileSize',
        cell: (info: CellContext<CustomFile, string>) => <i>{(parseInt(info?.getValue()) / 1000)?.toFixed(2)}</i>,
        header: () => <span>Size (KB)</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.type, {
        id: 'fileType',
        cell: (info) => <i>{info.getValue()}</i>,
        header: () => <span>Type</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.fileSource, {
        id: 'source',
        cell: (info) => {
          if (info.row.original.fileSource === 'youtube' || info.row.original.fileSource === 'Wikipedia') {
            return (
              <TextLink externalLink href={info.row.original.source_url}>
                {info.getValue()}
              </TextLink>
            );
          }
          return <i>{info.getValue()}</i>;
        },
        header: () => <span>Source</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.model, {
        id: 'model',
        cell: (info) => <i>{info.getValue()}</i>,
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
      columnHelper.accessor((row) => row.processing, {
        id: 'processing',
        cell: (info) => <i>{info.getValue()}</i>,
        header: () => <span>Duration (s)</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.status, {
        id: 'inspect',
        cell: (info) => (
          <>
            <IconButton
              aria-label='Toggle settings'
              size='large'
              disabled={statusCheck(info.getValue()) !== 'success'}
              clean
              onClick={() => onInspect(info?.row?.original?.name as string)}
            >
              <MagnifyingGlassCircleIconSolid />
            </IconButton>
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
                  name: item.fileName,
                  size: item.fileSize ?? 0,
                  type: item?.fileType?.toUpperCase() ?? 'None',
                  NodesCount: item?.nodeCount ?? 0,
                  processing: item?.processingTime ?? 'None',
                  relationshipCount: item?.relationshipCount ?? 0,
                  status:
                    item.fileSource === 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                      ? item.status
                      : item.fileSource === 'local file'
                      ? item.status
                      : item.status === 'Completed' || item.status === 'Failed'
                      ? item.status
                      : item.fileSource == 'Wikipedia' ||
                        item.fileSource == 'youtube' ||
                        item.fileSource == 'gcs bucket'
                      ? item.status
                      : 'N/A',
                  model: item?.model ?? model,
                  id: uuidv4(),
                  source_url: item.url != 'None' && item?.url != '' ? item.url : '',
                  fileSource: item.fileSource ?? 'None',
                  gcsBucket: item?.gcsBucket,
                  gcsBucketFolder: item?.gcsBucketFolder,
                  errorMessage: item?.errorMessage,
                  uploadprogess: item?.uploadprogress ?? 0,
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
              if (item?.fileSize < 10000000) {
                subscribe(
                  item.fileName,
                  userCredentials?.uri,
                  userCredentials?.userName,
                  userCredentials?.database,
                  userCredentials?.password,
                  updatestatus
                ).catch((error: AxiosError) => {
                  // @ts-ignore
                  const errorfile = decodeURI(error.config.url.split('?')[0].split('/').at(-1));
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
        console.log(error);
      }
    };
    if (connectionStatus) {
      fetchFiles();
    } else {
      setFilesData([]);
    }
  }, [connectionStatus]);

  function updatestatus(i: statusupdate) {
    const { file_name } = i;
    const { fileName, nodeCount, relationshipCount, processingTime, model, status } = file_name;
    if (fileName && nodeCount != null && relationshipCount != null && processingTime && model && status) {
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
            };
          }
          return curfile;
        })
      );
    }
  }

  const pageSizeCalculation = Math.floor((currentOuterHeight - 402) / 45);

  const table = useReactTable({
    data: filesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: pageSizeCalculation,
      },
    },
    state: {
      columnFilters,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    filterFns: {
      statusFilter: (row, columnId, filterValue) => {
        return filterValue ? row.original[columnId] === 'New' : row.original[columnId];
      },
    },
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => JSON.stringify({ ...row }),
  });

  useEffect(() => {
    const listener = (e: any) => {
      setcurrentOuterHeight(e.currentTarget.outerHeight);
      table.setPageSize(Math.floor((e.currentTarget.outerHeight - 402) / 45));
    };
    window.addEventListener('resize', listener);
    return () => {
      window.removeEventListener('resize', listener);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    table.getColumn('status')?.setFilterValue(e.target.checked);
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
          <div style={{ width: 'calc(100% - 64px)' }}>
            <DataGrid
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
};

export default FileTable;
