import { useMemo, useState } from 'react';
import { Button, Table, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  useSubscriptionsQuery,
  useSubscriptionActionMutation,
} from '@/hooks/useSubscriptionQueries';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import type { Subscription } from '@/types/subscription.types';

const { Title } = Typography;

export const SubscriptionsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const params = useMemo(() => ({ page, limit }), [page, limit]);
  const { data, isLoading } = useSubscriptionsQuery(params);
  const actionMutation = useSubscriptionActionMutation();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-6">
        Subscriptions
      </Title>

      <Table
        rowKey="id"
        scroll={{ x: 1000 }}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.pagination.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setLimit(ps);
          },
        }}
        columns={[
          {
            title: 'Studio',
            key: 'studio',
            render: (_: unknown, record: Subscription) => record.studio?.studioName ?? record.studioId,
          },
          { title: 'Plan', key: 'plan', render: (_: unknown, r: Subscription) => r.plan?.name ?? r.planId },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: Subscription['status']) => <SubscriptionStatusBadge status={status} />,
          },
          { title: 'Billing', dataIndex: 'billingCycle' },
          {
            title: 'End Date',
            dataIndex: 'endDate',
            render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: Subscription) => (
              <>
                <Button
                  type="link"
                  onClick={() => navigate(ROUTES.SUBSCRIPTION_DETAILS.replace(':id', record.id))}
                >
                  View
                </Button>
                {record.status !== 'cancelled' ? (
                  <Button
                    type="link"
                    danger
                    onClick={async () => {
                      await actionMutation.mutateAsync({ action: 'cancel', id: record.id });
                      message.success('Subscription cancelled');
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                {record.status !== 'suspended' ? (
                  <Button
                    type="link"
                    onClick={async () => {
                      await actionMutation.mutateAsync({ action: 'suspend', id: record.id });
                      message.success('Subscription suspended');
                    }}
                  >
                    Suspend
                  </Button>
                ) : null}
              </>
            ),
          },
        ]}
      />
    </div>
  );
};
