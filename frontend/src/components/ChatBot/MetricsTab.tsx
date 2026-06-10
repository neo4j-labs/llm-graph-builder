import { Banner, Box, DataGrid, DataGridComponents, Flex, Typography } from '@neo4j-ndl/react';
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
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';

type MetricRow = {
  metric: string;
  score: number | string;
};

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
  const columnHelper = createColumnHelper<MetricRow>();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const { colorMode } = useContext(ThemeWrapperContext);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.metric, {
        id: 'Metric',
        header: () => <span>Metric</span>,
        cell: (info) => {
          const metric = info.getValue();
          const capitalizedMetric = metric.includes('_')
            ? metric
                .split('_')
                .map((w) => capitalize(w))
                .join(' ')
            : capitalize(metric);
          return (
            <Flex flexDirection='row' alignItems='center' gap='2'>
              <div className='textellipsis'>
                <span title={metric}>{capitalizedMetric}</span>
              </div>

              <IconButtonWithToolTip
                label='Metric info'
                text={
                  <Box
                    style={{
                      maxWidth: '260px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {metricsinfo[metric]}
                  </Box>
                }
                size='small'
                clean
                placement='top'
              >
                <InformationCircleIconOutline />
              </IconButtonWithToolTip>
            </Flex>
          );
        },
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.score as number, {
        id: 'Score',
        header: () => <span>Score</span>,
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
      metricDetails && !metricsLoading
        ? Object.entries(metricDetails).map(([key, value]) => ({
            metric: key,
            score: value,
          }))
        : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableGlobalFilter: false,
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableSorting: true,
  });

  return (
    <Box>
      {error?.trim() ? (
        <Banner type='danger' usage='inline'>
          {error}
        </Banner>
      ) : (
        <DataGrid
          ref={tableRef}
          isResizable
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
                  className: colorMode === 'dark' ? 'tbody-dark' : 'tbody-light',
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
