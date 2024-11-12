import { Checkbox, DataGrid, DataGridComponents, Flex, TextLink, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserCredentials, orphanNodeProps } from '../../../../types';
import { getOrphanNodes } from '../../../../services/GetOrphanNodes';
import { useCredentials } from '../../../../context/UserCredentials';
import Legend from '../../../UI/Legend';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { DocumentIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
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
import DeletePopUp from '../../DeletePopUp/DeletePopUp';
import { tokens } from '@neo4j-ndl/base';
import GraphViewModal from '../../../Graph/GraphViewModal';
import { handleGraphNodeClick } from '../../../ChatBot/chatInfo';
export default function DeletePopUpForOrphanNodes({
  deleteHandler,
  loading,
}: {
  deleteHandler: (selectedEntities: string[]) => Promise<void>;
  loading: boolean;
}) {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const [orphanNodes, setOrphanNodes] = useState<orphanNodeProps[]>([]);
  const [totalOrphanNodes, setTotalOrphanNodes] = useState<number>(0);
  const [isLoading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const tableRef = useRef(null);
  const [showDeletePopUp, setshowDeletePopUp] = useState<boolean>(false);
  const [neoNodes, setNeoNodes] = useState<any[]>([]);
  const [neoRels, setNeoRels] = useState<any[]>([]);
  const [openGraphView, setOpenGraphView] = useState(false);
  const [viewPoint, setViewPoint] = useState('');

  const fetchOrphanNodes = useCallback(async () => {
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
  }, [userCredentials]);

  useEffect(() => {
    (async () => {
      await fetchOrphanNodes();
    })();
    return () => {
      setOrphanNodes([]);
      setTotalOrphanNodes(0);
    };
  }, [userCredentials]);
  const columnHelper = createColumnHelper<orphanNodeProps>();

  const handleOrphanNodeClick = (elementId: string, viewMode: string) => {
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
                title='Select the Row for Deletion'
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
                onClick={() => handleOrphanNodeClick(info.row.id, 'chatInfoView')}
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
        pageSize: 5,
      },
    },
  });

  const selectedFilesCheck = table.getSelectedRowModel().rows.length
    ? `Delete Selected Nodes (${table.getSelectedRowModel().rows.length})`
    : 'Select Node(s) to delete';

  const onDeleteHandler = async () => {
    await deleteHandler(table.getSelectedRowModel().rows.map((r) => r.id));
    const selectedRows = table.getSelectedRowModel().rows.map((r) => r.id);
    setTotalOrphanNodes((prev) => prev - selectedRows.length);
    for (let index = 0; index < selectedRows.length; index++) {
      const eid: string = selectedRows[index];
      setOrphanNodes((prev) => prev.filter((node) => node.e.elementId != eid));
    }
    setshowDeletePopUp(false);
    if (totalOrphanNodes) {
      await fetchOrphanNodes();
    }
  };

  return (
    <>
      <div>
        {showDeletePopUp && (
          <DeletePopUp
            open={showDeletePopUp}
            no_of_files={table.getSelectedRowModel().rows.length ?? 0}
            deleteHandler={onDeleteHandler}
            deleteCloseHandler={() => setshowDeletePopUp(false)}
            loading={loading}
            view='settingsView'
          />
        )}
        <div>
          <Flex flexDirection='column'>
            <Flex justifyContent='space-between' flexDirection='row'>
              <Typography variant={isTablet ? 'subheading-medium' : 'subheading-large'}>
                Orphan Nodes Deletion (100 nodes per batch)
              </Typography>
              {totalOrphanNodes > 0 && (
                <Typography variant={isTablet ? 'subheading-medium' : 'subheading-large'}>
                  Total Nodes: {totalOrphanNodes}
                </Typography>
              )}
            </Flex>
            <Flex justifyContent='space-between' flexDirection='row'>
              <Typography variant={isTablet ? 'body-small' : 'body-medium'}>
                This feature helps improve the accuracy of your knowledge graph by identifying and removing entities
                that are not connected to any other information. These "lonely" entities can be remnants of past
                analyses or errors in data processing. By removing them, we can create a cleaner and more efficient
                knowledge graph that leads to more relevant and informative responses.
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
            onClick={() => setshowDeletePopUp(true)}
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