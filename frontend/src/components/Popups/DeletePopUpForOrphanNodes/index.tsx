import { Checkbox, DataGrid, DataGridComponents, Flex, Typography } from '@neo4j-ndl/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserCredentials, orphanNodeProps } from '../../../types';
import { getOrphanNodes } from '../../../services/GetOrphanNodes';
import { useCredentials } from '../../../context/UserCredentials';
import Legend from '../../UI/Legend';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { DocumentIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
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
export default function DeletePopUpForOrphanNodes({
  deleteHandler,
  loading,
}: {
  deleteHandler: (selectedEntities: string[]) => Promise<void>;
  loading: boolean;
}) {
  const [orphanNodes, setOrphanNodes] = useState<orphanNodeProps[]>([]);
  const [totalOrphanNodes, setTotalOrphanNodes] = useState<number>(0);
  const [isLoading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const tableRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const apiresponse = await getOrphanNodes(userCredentials as UserCredentials);
        setLoading(false);
        if (apiresponse.data.data.length) {
          setOrphanNodes(apiresponse.data.data);
          setTotalOrphanNodes(
            apiresponse.data.message != undefined && typeof apiresponse.data.message != 'string'
              ? apiresponse.data.message.total
              : 0
          );
        }
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    })();
    return()=>{
  setOrphanNodes([]);
 setTotalOrphanNodes(0);
}
  }, [userCredentials]);
  const columnHelper = createColumnHelper<orphanNodeProps>();

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: Table<orphanNodeProps> }) => {
          return (
            <Checkbox
              aria-label='header-checkbox'
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          );
        },
        cell: ({ row }: { row: Row<orphanNodeProps> }) => {
          return (
            <div className='px-1'>
              <Checkbox
                aria-label='row-checkbox'
                onChange={row.getToggleSelectedHandler()}
                title='select row for deletion'
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
      columnHelper.accessor((row) => row.e.labels, {
        id: 'Labels',
        cell: (info) => {
          return info.getValue().map((l, index) => <Legend key={index} title={l} bgColor={calcWordColor(l)}></Legend>);
        },
        header: () => <span>Labels</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.documents, {
        id: 'Connnected Documents',
        cell: (info) => {
          return Array.from(new Set([...info.getValue()])).map((d, index) => (
            <Flex key={`d${index}`} flexDirection='row'>
              <span>
                <DocumentIconOutline className='n-size-token-7' />
              </span>
              <span>{d}</span>
            </Flex>
          ));
        },
        header: () => <span>Related Documents </span>,
        footer: (info) => info.column.id,
        maxSize:280
      }),
      columnHelper.accessor((row) => row.chunkConnections, {
        id: 'Connected Chunks',
        cell: (info) => <i>{info?.getValue()}</i>,
        header: () => <span>Connected Chunks</span>,
        footer: (info) => info.column.id,
        minSize:280,
      }),
    ],
    []
  );
  const table = useReactTable({
    data: orphanNodes,
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
        pageSize: 8,
      },
    },
  });

  return (
    <div>
      <div>
        <Flex flexDirection='column'>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant='subheading-large'>Orphan Nodes Deletion (100 nodes per batch)</Typography>
            {totalOrphanNodes > 0 ? (
              <Typography variant='subheading-large'>Total Nodes: {totalOrphanNodes}</Typography>
            ) : (
              <></>
            )}
          </Flex>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant='body-medium'>
              This feature helps improve the accuracy of your knowledge graph by identifying and removing entities that
              are not connected to any other information. These "lonely" entities can be remnants of past analyses or
              errors in data processing. By removing them, we can create a cleaner and more efficient knowledge graph
              that leads to more relevant and informative responses.
            </Typography>
          </Flex>
        </Flex>
      </div>
      <DataGrid
        ref={tableRef}
        isResizable={true}
        tableInstance={table}
        styling={{
          borderStyle: 'all-sides',
          zebraStriping: true,
          headerStyle: 'clean',
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
      <Flex className='mt-1' flexDirection='row' justifyContent='flex-end'>
        <ButtonWithToolTip
          onClick={async () => {
            await deleteHandler(table.getSelectedRowModel().rows.map((r) => r.id));
            const selectedRows = table.getSelectedRowModel().rows.map((r) => r.id);
            setTotalOrphanNodes((prev) => prev - selectedRows.length);
            selectedRows.forEach((eid: string) => {
              setOrphanNodes((prev) => prev.filter((node) => node.e.elementId != eid));
            });
          }}
          size='large'
          loading={loading}
          text={
            isLoading
              ? 'Fetching Orphan Nodes'
              : !isLoading && !orphanNodes.length
              ? 'No Nodes Found'
              : !table.getSelectedRowModel().rows.length
              ? 'No Nodes Selected'
              : `Delete Selected Nodes (${table.getSelectedRowModel().rows.length})`
          }
          label='Orphan Node deletion button'
          disabled={!table.getSelectedRowModel().rows.length}
          placement='top'
        >
          Select Node(s) to delete
        </ButtonWithToolTip>
      </Flex>
    </div>
  );
}
