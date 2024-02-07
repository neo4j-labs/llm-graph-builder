import { DataGrid } from '@neo4j-ndl/react';
import {  useEffect } from 'react';
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table';
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
  status: string;
}
interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
}

export default function FileTable() {
  const { filesData, setFiles, setFilesData } = useFileContext();
  const columnHelper = createColumnHelper<CustomFile>();
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
    const fetchFiles = async () => {
      try {
        const res: any = await getSourceNodes();
        console.log("SOURCE LIST GET",res.data.data)
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) => ({
            name: item.fileName,
            size: item.fileSize,
            type: item?.fileType?.toUpperCase(),
            NodesCount: item?.nodeCount ?? 0,
            processing: item?.processingTime ?? 'None',
            relationshipCount: item?.relationshipCount ?? 0,
            status: item.status,
            id: uuidv4(),
          }));
          setFilesData(prefiles);
          const prefetchedFiles = res.data.data.map((item: any) => getFileFromLocal(`${item.fileName}`));
          setFiles(prefetchedFiles);
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchFiles();
  }, []);

  const table = useReactTable({
    data: filesData,
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
      {filesData ? (
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
