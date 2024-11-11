import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDuplicateNodes } from '../../../../services/GetDuplicateNodes';
import { useCredentials } from '../../../../context/UserCredentials';
import { dupNodes, selectedDuplicateNodes, UserCredentials } from '../../../../types';
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
import {
  Checkbox,
  DataGrid,
  DataGridComponents,
  Flex,
  Tag,
  TextLink,
  Typography,
  useMediaQuery,
} from '@neo4j-ndl/react';
import Legend from '../../../UI/Legend';
import { DocumentIconOutline } from '@neo4j-ndl/react/icons';
import { calcWordColor } from '@neo4j-devtools/word-color';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import mergeDuplicateNodes from '../../../../services/MergeDuplicateEntities';
import { tokens } from '@neo4j-ndl/base';
import GraphViewModal from '../../../Graph/GraphViewModal';
import { handleGraphNodeClick } from '../../../ChatBot/chatInfo';

export default function DeduplicationTab() {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const isSmallDesktop = useMediaQuery(`(min-width: ${breakpoints.lg})`);
  const { userCredentials } = useCredentials();
  const [duplicateNodes, setDuplicateNodes] = useState<dupNodes[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isLoading, setLoading] = useState<boolean>(false);
  const [mergeAPIloading, setmergeAPIloading] = useState<boolean>(false);
  const tableRef = useRef(null);
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');
  const [nodesCount, setNodesCount] = useState<number>(0);
  const fetchDuplicateNodes = useCallback(async () => {
    try {
      setLoading(true);
      const duplicateNodesData = await getDuplicateNodes(userCredentials as UserCredentials);
      setLoading(false);
      if (duplicateNodesData.data.status === 'Failed') {
        throw new Error(duplicateNodesData.data.error);
      }
      if (duplicateNodesData.data.data.length) {
        setDuplicateNodes(duplicateNodesData.data.data);
        // @ts-ignore
        setNodesCount(duplicateNodesData.data.message.total);
      } else {
        setDuplicateNodes([]);
      }
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  }, [userCredentials]);
  useEffect(() => {
    (async () => {
      await fetchDuplicateNodes();
    })();
  }, [userCredentials]);

  const clickHandler = async () => {
    try {
      const selectedNodeMap = table.getSelectedRowModel().rows.map(
        (r): selectedDuplicateNodes => ({
          firstElementId: r.id,
          similarElementIds: r.original.similar.map((s) => s.elementId),
        })
      );
      setmergeAPIloading(true);
      const response = await mergeDuplicateNodes(userCredentials as UserCredentials, selectedNodeMap);
      table.resetRowSelection();
      table.resetPagination();
      setmergeAPIloading(false);
      if (response.data.status === 'Failed') {
        throw new Error(response.data.error);
      }
    } catch (error) {
      setmergeAPIloading(false);
      console.log(error);
    }
  };

  const columnHelper = createColumnHelper<dupNodes>();
  const onRemove = (nodeid: string, similarNodeId: string) => {
    setDuplicateNodes((prev) => {
      return prev.map((d) =>
        (d.e.elementId === nodeid
          ? {
              ...d,
              similar: d.similar.filter((n) => n.elementId != similarNodeId),
            }
          : d)
      );
    });
  };

  const handleDuplicateNodeClick = (elementId: string, viewMode: string) => {
    handleGraphNodeClick(
      userCredentials as UserCredentials,
      elementId,
      viewMode,
      setNeoNodes,
      setNeoRels,
      setOpenGraphView,
      setViewPoint
    );
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
              <TextLink
                className='!cursor-pointer'
                onClick={() => handleDuplicateNodeClick(info.row.id, 'chatInfoView')}
                title={info.getValue()}
              >
                {info.getValue()}
              </TextLink>
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
                  size={isTablet ? 'small' : 'medium'}
                >
                  {s.id}
                </Tag>
              ))}
            </Flex>
          );
        },
        size: isTablet || isSmallDesktop ? 250 : 150,
      }),
      columnHelper.accessor((row) => row.e.labels, {
        id: 'Labels',
        cell: (info) => {
          return (
            <Flex>
              {info.getValue().map((l, index) => (
                <Legend key={index} title={l} bgColor={calcWordColor(l)} type='node'></Legend>
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
  const selectedFilesCheck = mergeAPIloading
    ? 'Merging...'
    : table.getSelectedRowModel().rows.length
    ? `Merge Duplicate Nodes (${table.getSelectedRowModel().rows.length})`
    : 'Select Node(s) to Merge';
  return (
    <>
      <div>
        <Flex justifyContent='space-between' flexDirection='row'>
          <Flex>
            <Typography variant={isTablet ? 'subheading-medium' : 'subheading-large'}>
              Refine Your Knowledge Graph: Merge Duplicate Entities:
            </Typography>
            <Typography variant={isTablet ? 'body-small' : 'subheading-large'}>
              Identify and merge similar entries like "Apple" and "Apple Inc." to eliminate redundancy and improve the
              accuracy and clarity of your knowledge graph.
            </Typography>
          </Flex>
          {nodesCount > 0 && (
            <Typography variant={isTablet ? 'subheading-medium' : 'subheading-large'}>
              Total Duplicate Nodes: {nodesCount}
            </Typography>
          )}
        </Flex>
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
        <Flex className='mt-3' flexDirection='row' justifyContent='flex-end'>
          <ButtonWithToolTip
            onClick={async () => {
              await clickHandler();
              await fetchDuplicateNodes();
            }}
            size='large'
            loading={mergeAPIloading}
            text={
              isLoading
                ? 'Fetching Duplicate Nodes'
                : !isLoading && !duplicateNodes.length
                ? 'No Nodes Found'
                : !table.getSelectedRowModel().rows.length
                ? 'No Nodes Selected'
                : mergeAPIloading
                ? 'Merging'
                : `Merge Selected Nodes (${table.getSelectedRowModel().rows.length})`
            }
            label='Merge Duplicate Node Button'
            disabled={!table.getSelectedRowModel().rows.length}
            placement='top'
          >
            {selectedFilesCheck}
          </ButtonWithToolTip>
        </Flex>
      </div>
      {openGraphView && (
        <GraphViewModal
          open={openGraphView}
          setGraphViewOpen={setOpenGraphView}
          viewPoint={viewPoint}
          nodeValues={neoNodes}
          relationshipValues={neoRels}
        />
      )}
    </>
  );
}