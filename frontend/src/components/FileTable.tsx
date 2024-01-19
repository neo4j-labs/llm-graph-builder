import { DataGrid } from '@neo4j-ndl/react';
import { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table';

export default function FileTable({ files }: { files: Partial<globalThis.File>[] | [] }) {
  const [data, setData] = useState([...files]);
  const columnHelper = createColumnHelper<Partial<globalThis.File>>();
  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>File Size</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.type, {
      id: 'fileType',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>File Type</span>,
      footer: (info) => info.column.id,
    }),
  ];
  useEffect(() => {
    setData([...files]);
  }, [files]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {data ? (
        <div className='n-w-full n-bg-light-neutral-text-weakest'>
          <DataGrid
            isResizable={true}
            tableInstance={table}
            isKeyboardNavigable={true}
            styling={{
              zebraStriping: false,
              borderStyle: 'all-sides',
              
            }}
          />
        </div>
      ) : null}
    </>
  );
}
