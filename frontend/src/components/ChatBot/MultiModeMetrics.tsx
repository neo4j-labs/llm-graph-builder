import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { capitalize } from '../../utils/Utils';
import { useMemo, useRef } from 'react';
import { Banner, Box, DataGrid, DataGridComponents, Typography } from '@neo4j-ndl/react';
import { multimodelmetric } from '../../types';

export default function MultiModeMetrics({
  data,
  metricsLoading,
  error,
}: {
  data: multimodelmetric[];
  metricsLoading: boolean;
  error: string;
}) {
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
      columnHelper.accessor((row) => row.answer_relevancy, {
        id: 'Answer Relevancy',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue().toFixed(2)}</Typography>;
        },
        header: () => <span>Answer Relevancy</span>,
      }),
      columnHelper.accessor((row) => row.faithfulness, {
        id: 'Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue().toFixed(2)}</Typography>;
        },
        header: () => <span>Faithfulness</span>,
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
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <Box>
      {error?.trim() != '' ? (
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
