import { useState } from 'react';
import { Typography } from 'antd';
import { useSubscriptionHistoryQuery } from '@/hooks/useBillingQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Table, Tag } from 'antd';
import type { Subscription } from '@/types/subscription.types';

const { Title, Paragraph } = Typography;

export const SubscriptionRevenuePage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useSubscriptionHistoryQuery({ page, limit });

  if (isLoading && !data) return <LoadingSpinner />;

  const result = data as { items: Subscription[]; pagination: { total: number } };

  return (
    <div>
      <Title level={3} className="!mb-1">
        Subscription History
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Track subscription lifecycle events across all studios.
      </Paragraph>

      <Table
        rowKey="id"
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={result?.items ?? []}
        pagination={{
          current: page,
          pageSize: limit,
          total: result?.pagination.total ?? 0,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
        columns={[
          {
            title: 'Studio',
            dataIndex: ['studio', 'studioName'],
            render: (_value, row) => row.studio?.studioName ?? row.studioId,
          },
          {
            title: 'Plan',
            dataIndex: ['plan', 'name'],
            render: (_value, row) => row.plan?.name ?? '—',
          },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
          { title: 'Cycle', dataIndex: 'billingCycle' },
          {
            title: 'Start',
            dataIndex: 'startDate',
            render: (value: string) => new Date(value).toLocaleDateString(),
          },
          {
            title: 'End',
            dataIndex: 'endDate',
            render: (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—'),
          },
        ]}
      />
    </div>
  );
};
