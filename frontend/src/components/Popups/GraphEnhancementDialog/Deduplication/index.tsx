import { useEffect, useMemo, useRef, useState } from 'react';
import { getDuplicateNodes } from '../../../../services/GetDuplicateNodes';
import { useCredentials } from '../../../../context/UserCredentials';
import { dupNodes, selectedDuplicateNodes, UserCredentials } from '../../../../types';
import sampleduplicateResponse from '../../../../assets/sampleduplicateresponse.json';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  Table,
  Row,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Checkbox, DataGrid, DataGridComponents, Flex, Tag } from '@neo4j-ndl/react';
import Legend from '../../../UI/Legend';
import { DocumentIconOutline } from '@neo4j-ndl/react/icons';
import { calcWordColor } from '@neo4j-devtools/word-color';

export default function DeduplicationTab() {
  const { userCredentials } = useCredentials();
  const [duplicateNodes, setDuplicateNodes] = useState<dupNodes[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isLoading, setLoading] = useState<boolean>(false);
  const [selectedNodes, setselectedNodes] = useState<selectedDuplicateNodes[]>();
  const tableRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const duplicateNodesData = await getDuplicateNodes(userCredentials as UserCredentials);
        setLoading(false);
        if (duplicateNodesData.data.status === 'Failed') {
          throw new Error(duplicateNodesData.data.error);
        }
        if (duplicateNodesData.data.data.length) {
          console.log({ duplicateNodesData });
          console.log(sampleduplicateResponse);
          setDuplicateNodes(duplicateNodesData.data.data);
        }
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    })();
  }, [userCredentials]);

  const columnHelper = createColumnHelper<dupNodes>();
  const onRemove = (nodeid: string, similarNodeId: string) => {
    setDuplicateNodes((prev) => {
      return prev.map((d) =>
        d.e.elementId === nodeid
          ? {
              ...d,
              similar: d.similar.filter((n) => n.elementId != similarNodeId),
            }
          : d
      );
    });
  };
  const columns = useMemo(
    () => [
      {
        id: 'Check to Delete All Files',
        header: ({ table }: { table: Table<dupNodes> }) => {
          return (
            <Checkbox
              aria-label='header-checkbox'
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          );
        },
        cell: ({ row }: { row: Row<dupNodes> }) => {
          return (
            <div className='px-1'>
              <Checkbox
                aria-label='row-checkbox'
                onChange={row.getToggleSelectedHandler()}
                title='Select the Row for merging'
                checked={row.getIsSelected()}
              />
            </div>
          );
        },
        size: 80,
      },
      columnHelper.accessor((row) => row.e.id, {
        id: 'Id',
        cell: (info) => {
          return (
            <div className='textellipsis'>
              <span title={info.getValue()}>{info.getValue()}</span>
            </div>
          );
        },
        header: () => <span>ID</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.similar, {
        id: 'Similar Nodes',
        cell: (info) => {
          return (
            <Flex>
              {info.getValue().map((s, index) => (
                <Tag
                  style={{
                    backgroundColor: `${calcWordColor(s.id)}`,
                  }}
                  key={`${s.elementId}${index}`}
                  onRemove={() => {
                    onRemove(info.row.original.e.elementId, s.elementId);
                  }}
                  removeable={true}
                  type='default'
                  size='medium'
                >
                  {s.id}
                </Tag>
              ))}
            </Flex>
          );
        },
      }),
      columnHelper.accessor((row) => row.e.labels, {
        id: 'Labels',
        cell: (info) => {
          return (
            <Flex>
              {info.getValue().map((l, index) => (
                <Legend key={index} title={l} bgColor={calcWordColor(l)}></Legend>
              ))}
            </Flex>
          );
        },
        header: () => <span>Labels</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.documents, {
        id: 'Connnected Documents',
        cell: (info) => {
          return (
            <Flex className='textellipsis'>
              {Array.from(new Set([...info.getValue()])).map((d, index) => (
                <Flex key={`d${index}`} flexDirection='row'>
                  <span>
                    <DocumentIconOutline className='n-size-token-7' />
                  </span>
                  <span>{d}</span>
                </Flex>
              ))}
            </Flex>
          );
        },
        header: () => <span>Related Documents </span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.chunkConnections, {
        id: 'Connected Chunks',
        cell: (info) => <i>{info?.getValue()}</i>,
        header: () => <span>Connected Chunks</span>,
        footer: (info) => info.column.id,
      }),
    ],
    []
  );
  const table = useReactTable({
    data: duplicateNodes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => row.e.elementId,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });
  return (
    <div>
      <DataGrid
        ref={tableRef}
        isResizable={true}
        tableInstance={table}
        styling={{
          borderStyle: 'all-sides',
          zebraStriping: true,
          headerStyle: 'clean',
        }}
        rootProps={{
          className: 'max-h-[355px] !overflow-y-auto',
        }}
        isLoading={isLoading}
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
  );
}
