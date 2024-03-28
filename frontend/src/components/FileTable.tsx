import { DataGrid, DataGridComponents, IconButton, StatusIndicator } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { useFileContext } from '../context/UsersFiles';
import { getSourceNodes } from '../services/GetFiles';
import { v4 as uuidv4 } from 'uuid';
import { getFileFromLocal, statusCheck } from '../utils/Utils';
import { SourceNode, CustomFile, FileTableProps } from '../types';
import { useCredentials } from '../context/UserCredentials';
import { MagnifyingGlassCircleIconSolid } from '@neo4j-ndl/react/icons';
import CustomAlert from './Alert';

const FileTable: React.FC<FileTableProps> = ({ isExpanded, connectionStatus, setConnectionStatus, onInspect }) => {
  const { filesData, setFiles, setFilesData, model } = useFileContext();
  const { userCredentials } = useCredentials();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentOuterHeight, setcurrentOuterHeight] = useState<number>(window.outerHeight);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);

  const sourceFind = useCallback(
    (name: any) => {
      return filesData.find((f) => {
        return f.name === name;
      });
    },
    [filesData]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => {
          const sourceFindVal = sourceFind(info.getValue());
          return (
            <div className='textellipsis'>
              <span
                title={
                  sourceFindVal?.fileSource === 's3 bucket'
                    ? sourceFindVal?.source_url
                    : sourceFindVal?.fileSource === 'youtube'
                    ? sourceFindVal?.source_url
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
          <div>
            <StatusIndicator type={statusCheck(info.getValue())} />
            <i>{info.getValue()}</i>
          </div>
        ),
        header: () => <span>Status</span>,
        footer: (info) => info.column.id,
        filterFn: 'statusFilter' as any,
        size: 200,
      }),
      columnHelper.accessor((row) => row.size, {
        id: 'fileSize',
        cell: (info: any) => <i>{(info?.getValue() / 1000)?.toFixed(2)}</i>,
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
        cell: (info) => <i>{info.getValue()}</i>,
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
              onClick={() => onInspect(info.row.original.name)}
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
        const res: any = await getSourceNodes(userCredentials);
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
                      : item.fileSource === 'local file' && getFileFromLocal(`${item.fileName}`) != null
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
                });
              }
            });
          }
          setIsLoading(false);
          setFilesData(prefiles);
          const prefetchedFiles: any[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (item.fileName != undefined && item.fileName.length) {
              if (localFile != null) {
                prefetchedFiles.push(localFile);
              } else {
                prefetchedFiles.push(null);
              }
            }
          });
          setFiles(prefetchedFiles);
        } else {
          throw new Error(res.data.error);
        }
        setIsLoading(false);
      } catch (error: any) {
        setErrorMessage(error.message);
        setIsLoading(false);
        setConnectionStatus(false);
        setFilesData([]);
        setFiles([]);
        setShowAlert(true);
        console.log(error);
      }
    };
    if (connectionStatus) {
      fetchFiles();
    } else {
      setFilesData([]);
      setFiles([]);
    }
  }, [connectionStatus]);

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
    },
    filterFns: {
      statusFilter: (row, columnId, filterValue) => {
        return filterValue ? row.original[columnId] === 'New' : row.original[columnId];
      },
    },
    enableGlobalFilter: false,
    autoResetPageIndex: false,
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
    setShowAlert(false);
  };

  return (
    <>
      <CustomAlert open={showAlert} handleClose={handleClose} alertMessage={errorMessage} />
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
