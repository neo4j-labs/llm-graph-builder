import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { capitalize } from '../../utils/Utils';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { Banner, Box, DataGrid, DataGridComponents, Typography } from '@neo4j-ndl/react';
import { multimodelmetric } from '../../types';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';

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
        id: 'Relevancy',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue().toFixed(2)}</Typography>;
        },
        header: () => <span>Relevancy</span>,
      }),
      columnHelper.accessor((row) => row.faithfulness as number, {
        id: 'Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue().toFixed(2)}</Typography>;
        },
        header: () => <span>Faithfulness</span>,
      }),
      columnHelper.accessor((row) => row.context_entity_recall_score as number, {
        id: 'Recall Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue()?.toFixed(2)}</Typography>;
        },
        header: () => <span>Context Score</span>,
      }),
      columnHelper.accessor((row) => row.semantic_score as number, {
        id: 'Semantic Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue()?.toFixed(2)}</Typography>;
        },
        header: () => <span>Semantic Score</span>,
      }),
      columnHelper.accessor((row) => row.rouge_score as number, {
        id: 'Rouge Score',
        cell: (info) => {
          return <Typography variant='body-medium'>{info.getValue()?.toFixed(2)}</Typography>;
        },
        header: () => <span>Rouge Score</span>,
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
  useEffect(() => {
    if (isWithAdditionalMetrics === false) {
      table.setColumnVisibility({ 'Recall Score': false, 'Semantic Score': false, 'Rouge Score': false });
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
            isKeyboardNavigable={false}
          />
        </div>
      )}
    </Box>
  );
}
