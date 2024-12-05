import { Banner, Box, DataGrid, DataGridComponents, Flex, IconButton, Popover, Typography } from '@neo4j-ndl/react';
import { memo, useContext, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { capitalize } from '../../utils/Utils';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { metricsinfo } from '../../utils/Constants';
import NotAvailableMetric from './NotAvailableMetric';
function MetricsTab({
  metricsLoading,
  metricDetails,
  error,
}: {
  metricsLoading: boolean;
  metricDetails:
    | {
        [key: string]: number | string;
      }
    | undefined;
  error: string;
}) {
  const columnHelper = createColumnHelper<{ metric: string; score: number | string }>();
  const tableRef = useRef(null);
  const { colorMode } = useContext(ThemeWrapperContext);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.metric, {
        id: 'Metric',
        cell: (info) => {
          const metric = info.getValue();
          const capitilizedMetric = metric.includes('_')
            ? metric
                .split('_')
                .map((w) => capitalize(w))
                .join(' ')
            : capitalize(metric);
          return (
            <Flex flexDirection='row' alignItems='center'>
              <div className='textellipsis'>
                <span title={metric}>{capitilizedMetric}</span>
              </div>
              <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
                <Popover.Trigger hasButtonWrapper>
                  <IconButton size='small' isClean ariaLabel='infoicon'>
                    <InformationCircleIconOutline />
                  </IconButton>
                </Popover.Trigger>
                <Popover.Content className='p-2'>
                  <Typography variant='body-small'>{metricsinfo[metric]}</Typography>
                </Popover.Content>
              </Popover>
            </Flex>
          );
        },
        header: () => <span>Metric</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.score as number, {
        id: 'Score',
        cell: (info) => {
          const value = isNaN(info.getValue()) ? 'N.A' : info.getValue()?.toFixed(2);
          if (value === 'N.A') {
            return <NotAvailableMetric />;
          }
          return <Typography variant='body-medium'>{value}</Typography>;
        },
      }),
    ],
    []
  );
  const table = useReactTable({
    data:
      metricDetails != null && !metricsLoading
        ? Object.entries(metricDetails).map(([key, value]) => {
            return { metric: key, score: value };
          })
        : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <Box>
      {error != undefined && error?.trim() != '' ? (
        <Banner type='danger' usage='inline'>
          {error}
        </Banner>
      ) : (
        <DataGrid
          ref={tableRef}
          isResizable={true}
          tableInstance={table}
          styling={{
            borderStyle: 'all-sides',
            hasZebraStriping: true,
            headerStyle: 'clean',
          }}
          isLoading={metricsLoading}
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
      )}
    </Box>
  );
}
export default memo(MetricsTab);
