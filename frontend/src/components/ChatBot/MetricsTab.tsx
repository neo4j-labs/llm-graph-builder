import { Banner, Box, DataGrid, DataGridComponents, Typography } from '@neo4j-ndl/react';
import { memo, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { capitalize } from '../../utils/Utils';
function MetricsTab({
  metricsLoading,
  metricDetails,
  error,
}: {
  metricsLoading: boolean;
  metricDetails:
    | {
        faithfulness: number;
        answer_relevancy: number;
      }
    | undefined;
  error: string;
}) {
  const columnHelper = createColumnHelper<{ metric: string; score: number }>();
  const tableRef = useRef(null);

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
            <div className='textellipsis'>
              <span title={metric}>{capitilizedMetric}</span>
            </div>
          );
        },
        header: () => <span>Metric</span>,
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.score, {
        id: 'Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue().toFixed(2)}</Typography>;
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
        <Banner type='danger'>{error}</Banner>
      ) : (
        <DataGrid
          ref={tableRef}
          isResizable={true}
          tableInstance={table}
          styling={{
            borderStyle: 'all-sides',
            zebraStriping: true,
            headerStyle: 'clean',
          }}
          isLoading={metricsLoading}
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
      )}
    </Box>
  );
}
export default memo(MetricsTab);
