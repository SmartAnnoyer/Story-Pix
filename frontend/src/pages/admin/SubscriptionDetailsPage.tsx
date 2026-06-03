import { Button, Card, Form, InputNumber, Select, Typography, message } from 'antd';
import { useParams } from 'react-router-dom';
import {
  usePlansQuery,
  useSubscriptionActionMutation,
  useSubscriptionQuery,
  useSubscriptionUsageQuery,
} from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummaryWidget } from '@/features/subscriptions/components/SubscriptionSummaryWidget';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BillingCycle } from '@/types/subscription.types';

const { Title, Text } = Typography;

export const SubscriptionDetailsPage = () => {
  const { id = '' } = useParams();
  const { data: subscription, isLoading } = useSubscriptionQuery(id);
  const { data: usage, isLoading: usageLoading } = useSubscriptionUsageQuery(id);
  const { data: plans } = usePlansQuery();
  const actionMutation = useSubscriptionActionMutation();

  if (isLoading || usageLoading || !subscription || !usage) return <LoadingSpinner />;

  const handleExtend = async (values: { extendDays: number }) => {
    await actionMutation.mutateAsync({ action: 'extend', id, extendDays: values.extendDays });
    message.success('Subscription extended');
  };

  const handleUpgrade = async (values: { planId: string; billingCycle: BillingCycle }) => {
    await actionMutation.mutateAsync({
      action: 'upgrade',
      studioId: subscription.studioId,
      planId: values.planId,
      billingCycle: values.billingCycle,
    });
    message.success('Plan upgraded');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2">
        <Title level={3} className="!mb-0">
          Subscription Details
        </Title>
        <Text type="secondary">{subscription.studio?.studioName ?? subscription.studioId}</Text>
        <SubscriptionStatusBadge status={subscription.status} />
      </div>

      <Card className="mb-6">
        <SubscriptionSummaryWidget summary={usage} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Extend Subscription">
          <Form layout="vertical" onFinish={handleExtend}>
            <Form.Item name="extendDays" label="Extend by (days)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={actionMutation.isPending}>
              Extend
            </Button>
          </Form>
        </Card>

        <Card title="Upgrade Plan">
          <Form layout="vertical" onFinish={handleUpgrade}>
            <Form.Item name="planId" label="Target Plan" rules={[{ required: true }]}>
              <Select
                options={(plans ?? []).map((p) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
            <Form.Item name="billingCycle" label="Billing Cycle" initialValue={BillingCycle.MONTHLY}>
              <Select
                options={[
                  { label: 'Monthly', value: BillingCycle.MONTHLY },
                  { label: 'Yearly', value: BillingCycle.YEARLY },
                ]}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={actionMutation.isPending}>
              Upgrade
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
};
