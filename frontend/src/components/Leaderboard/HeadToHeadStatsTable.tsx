import { useMemo, useState } from 'react';
import { prop, reverse, sortBy } from 'ramda';
import { Paper } from '@mantine/core';
import { DataTable, DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import { ModelHeadToHeadStats, useModelHeadToHeadStats } from '../../hooks/useModelHeadToHeadStats.ts';

type H2hStatsRecord = ModelHeadToHeadStats & {
  count_total: number;
  win_percentage: number;
  loss_percentage: number;
};

const HEAD_TO_HEAD_COLUMNS: DataTableColumn<H2hStatsRecord>[] = [
  { accessor: 'other_model_name', title: 'Model', sortable: true },
  { accessor: 'judge_name', title: 'Judge', sortable: true },
  { accessor: 'count_total', title: '# Head-to-Heads', sortable: true },
  {
    accessor: 'count_wins',
    title: 'Record (Win - Loss - Tie)',
    render: ({ count_wins, count_losses, count_ties }) =>
      `${count_wins.toLocaleString()} - ${count_losses.toLocaleString()} - ${count_ties.toLocaleString()}`,
  },
  {
    accessor: 'win_percentage',
    title: 'Win %',
    sortable: true,
    render: ({ win_percentage }) => `${win_percentage.toFixed(1)}%`,
  },
  {
    accessor: 'loss_percentage',
    title: 'Loss %',
    sortable: true,
    render: ({ loss_percentage }) => `${loss_percentage.toFixed(1)}%`,
  },
];

type Props = {
  modelId: number;
};
export function HeadToHeadStatsTable({ modelId }: Props) {
  const { data: headToHeadStats, isLoading } = useModelHeadToHeadStats(modelId);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<H2hStatsRecord>>({
    columnAccessor: 'count_total',
    direction: 'desc',
  });

  const statsRecords = useMemo(() => {
    const stats = headToHeadStats ?? [];
    const statsHydrated = stats.map<H2hStatsRecord>(s => {
      const countTotal = s.count_wins + s.count_losses + s.count_ties;
      return {
        ...s,
        count_total: countTotal,
        win_percentage: (s.count_wins / countTotal) * 100,
        loss_percentage: (s.count_losses / countTotal) * 100,
      };
    });
    const sortProp = sortStatus.columnAccessor as keyof H2hStatsRecord;
    const statsSorted = sortBy<H2hStatsRecord>(prop(sortProp))(statsHydrated);
    return sortStatus.direction === 'desc' ? reverse(statsSorted) : statsSorted;
  }, [headToHeadStats, sortStatus]);

  return (
    <Paper withBorder radius="md">
      <DataTable<H2hStatsRecord>
        striped
        withTableBorder={false}
        borderRadius="md"
        horizontalSpacing="xs"
        columns={HEAD_TO_HEAD_COLUMNS}
        records={statsRecords}
        idAccessor="other_model_id"
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        fetching={isLoading}
        loaderBackgroundBlur={4}
        minHeight={180}
      />
    </Paper>
  );
}
