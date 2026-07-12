import { useMemo, useState } from 'react';
import { Button, Space, Table, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  useSubscriptionsQuery,
  useSubscriptionActionMutation,
} from '@/hooks/useSubscriptionQueries';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { SubscriptionStatus, type Subscription } from '@/types/subscription.types';

const { Title, Paragraph } = Typography;

const canActivate = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.SUSPENDED ||
  status === SubscriptionStatus.EXPIRED ||
  status === SubscriptionStatus.CANCELLED;

const canSuspend = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;

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
      <div className="mb-6">
        <Title level={3} className="!mb-1">
          Subscriptions
        </Title>
        <Paragraph type="secondary" className="!mb-0">
          Activate, suspend, or open a subscription to change its plan.
        </Paragraph>
      </div>

      <Table
        rowKey="id"
        scroll={{ x: 1100 }}
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
            render: (_: unknown, record: Subscription) =>
              record.studio?.studioName ?? record.studioId,
          },
          {
            title: 'Plan',
            key: 'plan',
            render: (_: unknown, r: Subscription) => r.plan?.name ?? r.planId,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: Subscription['status']) => (
              <SubscriptionStatusBadge status={status} />
            ),
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
            fixed: 'right',
            width: 280,
            render: (_: unknown, record: Subscription) => (
              <Space size={0} wrap>
                <Button
                  type="link"
                  onClick={() => navigate(ROUTES.SUBSCRIPTION_DETAILS.replace(':id', record.id))}
                >
                  Manage
                </Button>
                {canActivate(record.status) ? (
                  <Button
                    type="link"
                    onClick={async () => {
                      await actionMutation.mutateAsync({ action: 'activate', id: record.id });
                      message.success('Subscription activated');
                    }}
                  >
                    Activate
                  </Button>
                ) : null}
                {canSuspend(record.status) ? (
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
                {record.status !== SubscriptionStatus.CANCELLED ? (
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
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};
