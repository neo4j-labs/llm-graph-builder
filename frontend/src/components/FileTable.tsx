import { DataGrid } from '@neo4j-ndl/react';
import { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table';
import { useFileContext } from '../context/UsersFiles';

interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
}
export default function FileTable() {
  const { filesData } = useFileContext();
  const [data, setData] = useState([...filesData]);
  const columnHelper = createColumnHelper<CustomFile>();
  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => <div>{info.getValue()?.substring(0, 10) + '...'}</div>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info) => <i>{info.getValue()}kb</i>,
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
  ];

  useEffect(() => {
    setData([...filesData]);
  }, [filesData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <>
      {data ? (
        <>
          <div className='n-w-full'>
            <DataGrid
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
