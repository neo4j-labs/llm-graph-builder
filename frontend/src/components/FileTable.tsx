import { DataGrid } from '@neo4j-ndl/react';
import { useEffect } from 'react';
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnFiltersState,
  getFilteredRowModel,
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => <div>{info.getValue()?.substring(0, 10) + '...'}</div>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info) => <i>{(info?.getValue() / 1000)?.toFixed(2)} KB</i>,
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
        setLoading(true);
        const res: any = await getSourceNodes();
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) => ({
            name: item.fileName,
            size: item.fileSize ?? 0,
            type: item?.fileType?.toUpperCase() ?? 'None',
            NodesCount: item?.nodeCount ?? 0,
            processing: item?.processingTime ?? 'None',
            relationshipCount: item?.relationshipCount ?? 0,
            status: getFileFromLocal(`${item.fileName}`) == null ? 'Unavailable' : item.status,
            model: item?.model ?? 'Diffbot',
            id: uuidv4(),
          }));
          setLoading(false);
          setFilesData(prefiles);
          const prefetchedFiles: File[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (localFile != null) prefetchedFiles.push(localFile);
          });
          setFiles(prefetchedFiles);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    };
    fetchFiles();
  }, []);

  const table = useReactTable({
    data: filesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 5,
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
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    table.getColumn('status')?.setFilterValue(e.target.checked);
  };

  return (
    <>
      {filesData ? (
        <>
          <div className='n-w-full'>
            <div className='flex gap-2 items-center p-2'>
              <input type='checkbox' onChange={handleChange} />
              <label>Show files with status New </label>
            </div>
            <DataGrid
              isLoading={loading}
              isResizable={true}
              tableInstance={table}
              isKeyboardNavigable={true}
              styling={{
                zebraStriping: true,
                borderStyle: 'all-sides',
                headerStyle: 'clean',
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
