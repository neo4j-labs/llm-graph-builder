import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { capitalize } from '../../utils/Utils';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { Banner, Box, DataGrid, DataGridComponents, Flex, IconButton, Popover, Typography } from '@neo4j-ndl/react';
import { multimodelmetric } from '../../types';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import NotAvailableMetric from './NotAvailableMetric';

export default function MultiModeMetrics({
  data,
  metricsLoading,
  error,
  isWithAdditionalMetrics,
}: {
  data: multimodelmetric[];
  metricsLoading: boolean;
  error: string;
  isWithAdditionalMetrics: boolean | null;
}) {
  const { colorMode } = useContext(ThemeWrapperContext);
  const tableRef = useRef<HTMLDivElement>(null);
  const columnHelper = createColumnHelper<multimodelmetric>();
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.mode, {
        id: 'Mode',
        cell: (info) => {
          const metric = info.getValue();
          const capitilizedMetric = metric.includes('_')
            ? metric
                .split('_')
                .map((w) => capitalize(w))
                .join(' ')
            : capitalize(metric);
          return (
            <div className='textellipsis'>
              <span title={metric}>{capitilizedMetric}</span>
            </div>
          );
        },
        header: () => <span>Mode</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.answer_relevancy as number, {
        id: 'Answer Relevancy',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
        header: () => (
          <Flex flexDirection='row' alignItems='center'>
            <span>Relevancy</span>
            <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
              <Popover.Trigger hasButtonWrapper>
                <IconButton size='small' isClean ariaLabel='infoicon'>
                  <InformationCircleIconOutline />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content className='p-2'>
                <Typography variant='body-small'>
                  Determines How well the answer addresses the user's question.
                </Typography>
              </Popover.Content>
            </Popover>
          </Flex>
        ),
      }),
      columnHelper.accessor((row) => row.faithfulness as number, {
        id: 'Faithfullness',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
        header: () => (
          <Flex flexDirection='row' alignItems='center'>
            <span>Faithful</span>
            <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
              <Popover.Trigger hasButtonWrapper>
                <IconButton size='small' isClean ariaLabel='infoicon'>
                  <InformationCircleIconOutline />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content className='p-2'>
                <Typography variant='body-small'>
                  Determines How accurately the answer reflects the provided information.
                </Typography>
              </Popover.Content>
            </Popover>
          </Flex>
        ),
      }),
      columnHelper.accessor((row) => row.context_entity_recall_score as number, {
        id: 'Entity Recall Score',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
        header: () => (
          <Flex flexDirection='row' alignItems='center'>
            <span>Context</span>
            <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
              <Popover.Trigger hasButtonWrapper>
                <IconButton size='small' isClean ariaLabel='infoicon'>
                  <InformationCircleIconOutline />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content className='p-2'>
                <Typography variant='body-small'>
                  Determines the recall of entities present in both reference and retrieved contexts.
                </Typography>
              </Popover.Content>
            </Popover>
          </Flex>
        ),
      }),
      columnHelper.accessor((row) => row.semantic_score as number, {
        id: 'Semantic Score',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
        header: () => (
          <Flex flexDirection='row' alignItems='center'>
            <span>Semantic</span>
            <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
              <Popover.Trigger hasButtonWrapper>
                <IconButton size='small' isClean ariaLabel='infoicon'>
                  <InformationCircleIconOutline />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content className='p-2'>
                <Typography variant='body-small'>
                  Determines How well the generated answer understands the meaning of the reference answer.
                </Typography>
              </Popover.Content>
            </Popover>
          </Flex>
        ),
      }),
      columnHelper.accessor((row) => row.rouge_score as number, {
        id: 'Rouge Score',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
        header: () => (
          <Flex flexDirection='row' alignItems='center'>
            <span>Rouge</span>
            <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
              <Popover.Trigger hasButtonWrapper>
                <IconButton size='small' isClean ariaLabel='infoicon'>
                  <InformationCircleIconOutline />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content className='p-2'>
                <Typography variant='body-small'>
                  Determines How much the generated answer matches the reference answer, word-for-word.
                </Typography>
              </Popover.Content>
            </Popover>
          </Flex>
        ),
      }),
    ],
    []
  );
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableColumnResizing: true,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableSorting: false,
  });
  useEffect(() => {
    if (isWithAdditionalMetrics === false) {
      table.setColumnVisibility({ 'Entity Recall Score': false, 'Semantic Score': false, 'Rouge Score': false });
    } else {
      table.resetColumnVisibility(true);
    }
  }, [isWithAdditionalMetrics, table]);

  return (
    <Box>
      {error?.trim() != '' ? (
        <Banner type='danger' usage='inline'>
          {error}
        </Banner>
      ) : (
        <div className={isWithAdditionalMetrics === false ? 'flex justify-center items-center' : ''}>
          <DataGrid
            ref={tableRef}
            isResizable={true}
            tableInstance={table}
            styling={{
              borderStyle: 'all-sides',
              hasZebraStriping: true,
              headerStyle: 'clean',
            }}
            isAutoResizingColumns={true}
            isLoading={metricsLoading}
            rootProps={{ className: isWithAdditionalMetrics === false ? '!w-[465px]' : 'auto' }}
            components={{
              Body: () => (
                <DataGridComponents.Body
                  innerProps={{
                    className: colorMode == 'dark' ? 'tbody-dark' : 'tbody-light',
                  }}
                />
              ),
              Navigation: null,
            }}
            isKeyboardNavigable={false}
          />
        </div>
      )}
    </Box>
  );
}
