import { DataGrid } from '@neo4j-ndl/react';
import { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table';
import { formatFileSize } from '../utils/utils';
// import Loader from '../utils/Loader';

interface CustomFile extends Partial<globalThis.File> {
  processing: string,
  status: string,
  NodesCount: number
}
export default function FileTable({ files }: { files: CustomFile[] | [] }) {
  const [data, setData] = useState([...files]);
  // const [loading, setIsLoading] = useState(false);
  const columnHelper = createColumnHelper<CustomFile>();
  // console.log('hello ', data);
  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.size, {
      id: 'fileSize',
      cell: (info) => <i>{formatFileSize(info.getValue())}</i>,
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
      id: "processing",
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Processing Time</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.status, {
      id: "status",
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Status</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.NodesCount, {
      id: "NodesCount",
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Nodes Count</span>,
      footer: (info) => info.column.id,
    })
  ];

  useEffect(() => {
    setData([...files]);
    // setIsLoading(false);
  }, [files]);


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  // TO DO
  // const table = () => {
  //   const tableData = useMemo(
  //     () => (loading ? Array(30).fill({}) : data),
  //     [loading, data]
  //   );
  //   const tableColumns = useMemo(
  //     () =>
  //       loading
  //         ? columns.map((column) => ({
  //           ...column,
  //           Cell: () => <Loader />,
  //         }))
  //         : columns,
  //     [loading, columns]
  //   );
  //   useReactTable({ columns: tableColumns, data: tableData, getCoreRowModel: getCoreRowModel(), });

  // }

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
