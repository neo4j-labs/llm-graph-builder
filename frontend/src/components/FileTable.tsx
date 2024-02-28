import { DataGrid, DataGridComponents, StatusIndicator } from '@neo4j-ndl/react';
import { useEffect, useState } from 'react';
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
import { getSourceNodes } from '../services/getFiles';
import { v4 as uuidv4 } from 'uuid';
import { getFileFromLocal, statusCheck } from '../utils/utils';
import { SourceNode, CustomFile, ContentProps } from '../types';

const FileTable: React.FC<ContentProps> = ({ isExpanded }) => {
  const { filesData, setFiles, setFilesData } = useFileContext();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentOuterHeight, setcurrentOuterHeight] = useState<number>(window.outerHeight);
  // const [currentOuterWidth, setcurrentOuterWidth] = useState<number>(window.outerWidth);

  const sourceFind = (name: any) => {
    return filesData.find((f) => {
      return f.name === name;
    });
  };
  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      cell: (info) => {
        const sourceFindVal = sourceFind(info.getValue());
        return (
          <div>
            <span title={sourceFindVal?.fileSource === 's3 bucket' ? sourceFindVal?.s3url : info.getValue()}>
              {info.getValue()?.substring(0, 10) + '...'}
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
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info: any) => <i>{(info?.getValue() / 1000)?.toFixed(2)} KB</i>,
      header: () => <span>Size</span>,
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
      header: () => <span>Duration</span>,
      footer: (info) => info.column.id,
    }),
  ];

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res: any = await getSourceNodes();
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) => {
            return {
              name: item.fileName,
              size: item.fileSize ?? 0,
              type: item?.fileType?.toUpperCase() ?? 'None',
              NodesCount: item?.nodeCount ?? 0,
              processing: item?.processingTime ?? 'None',
              relationshipCount: item?.relationshipCount ?? 0,
              status:
                item.fileSource == 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                  ? item.status
                  : getFileFromLocal(`${item.fileName}`) != null
                  ? item.status
                  : 'N/A',
              model: item?.model ?? 'Diffbot',
              id: uuidv4(),
              s3url: item.s3url ?? '',
              fileSource: item.fileSource ?? 'None',
            };
          });
          setIsLoading(false);
          setFilesData(prefiles);
          const prefetchedFiles: any[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (localFile != null) {
              prefetchedFiles.push(localFile);
            } else {
              prefetchedFiles.push(null);
            }
          });
          setFiles(prefetchedFiles);
        }
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.log(error);
      }
    };
    fetchFiles();
  }, []);

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
    defaultColumn: {
      size: 140,
      minSize: 50,
    },
    autoResetPageIndex: false,
  });

  useEffect(() => {
    const listener = (e: any) => {
      setcurrentOuterHeight(e.currentTarget.outerHeight);
      // setcurrentOuterWidth(e.currentTarget.outerWidth);
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

  return (
    <>
      {filesData ? (
        <>
          <div className='flex items-center p-5 self-start gap-2'>
            <input type='checkbox' onChange={handleChange} />
            <label>Show files with status New </label>
          </div>
          <div style={{ width: 'calc(100% - 64px)' }}>
            <DataGrid
              isResizable={false}
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
                            boxShadow: '0 0 20px #eee',
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
