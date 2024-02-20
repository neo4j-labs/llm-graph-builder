import { DataGrid, DataGridComponents } from '@neo4j-ndl/react';
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
import { getFileFromLocal } from '../utils/utils';
interface SourceNode {
  fileName: string;
  fileSize: number;
  fileType?: string;
  nodeCount?: number;
  processingTime?: string;
  relationshipCount?: number;
  model: string;
  status: string;
  s3url?: string;
}

interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
  model: string;
}

export default function FileTable() {
  const { filesData, setFiles, setFilesData } = useFileContext();
  const columnHelper = createColumnHelper<CustomFile>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentOuterHeight, setcurrentOuterHeight] = useState<number>(window.outerHeight);

  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => <div>{info.getValue()?.substring(0, 10) + '...'}</div>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info: any) => <i>{(info?.getValue() / 1000)?.toFixed(2)} KB</i>,
      header: () => <span>File Size</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.type, {
      id: 'fileType',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>File Type</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.processing, {
      id: 'processing',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Processing Time</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.status, {
      id: 'status',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Status</span>,
      footer: (info) => info.column.id,
      filterFn: 'statusFilter' as any,
    }),
    columnHelper.accessor((row) => row.NodesCount, {
      id: 'NodesCount',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Nodes Count</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.relationshipCount, {
      id: 'relationshipCount',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Relationships</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.model, {
      id: 'model',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Model</span>,
      footer: (info) => info.column.id,
    }),
  ];

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res: any = await getSourceNodes();
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) =>{
            return {
            name: item.fileName,
            size: item.fileSize ?? 0,
            type: item?.fileType?.toUpperCase() ?? 'None',
            NodesCount: item?.nodeCount ?? 0,
            processing: item?.processingTime ?? 'None',
            relationshipCount: item?.relationshipCount ?? 0,
            status:
              (item?.s3url?.trim()!="" &&item.status!="Completed")
                ? 'New'
                : getFileFromLocal(`${item.fileName}`) == null && item?.status != 'Completed'
                ? 'Unavailable'
                : item.status,
            model: item?.model ?? 'Diffbot',
            id: uuidv4(),
            s3url: item.s3url ?? '',
          }});
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
      maxSize: 150,
    },
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

  return (
    <>
      {filesData ? (
        <>
          <div className='flex items-center p-5 self-start gap-2'>
            <input type='checkbox' onChange={handleChange} />
            <label>Show files with status New </label>
          </div>
          <div>
            <DataGrid
              isResizable={true}
              tableInstance={table}
              styling={{
                borderStyle: 'horizontal',
                zebraStriping: true,
                headerStyle: 'clean',
              }}
              isLoading={isLoading}
              rootProps={{
                className: 'filetable',
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
}
