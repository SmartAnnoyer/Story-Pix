import { Button, Card, Form, InputNumber, Select, Space, Typography, message } from 'antd';
import { useParams } from 'react-router-dom';
import {
  useAssignPlanMutation,
  usePlansQuery,
  useSubscriptionActionMutation,
  useSubscriptionQuery,
  useSubscriptionUsageQuery,
} from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummaryWidget } from '@/features/subscriptions/components/SubscriptionSummaryWidget';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  BillingCycle,
  SubscriptionStatus,
} from '@/types/subscription.types';

const { Title, Text } = Typography;

const canActivate = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.SUSPENDED ||
  status === SubscriptionStatus.EXPIRED ||
  status === SubscriptionStatus.CANCELLED;

const canSuspend = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;

export const SubscriptionDetailsPage = () => {
  const { id = '' } = useParams();
  const { data: subscription, isLoading } = useSubscriptionQuery(id);
  const { data: usage, isLoading: usageLoading } = useSubscriptionUsageQuery(id);
  const { data: plans } = usePlansQuery();
  const actionMutation = useSubscriptionActionMutation();
  const assignMutation = useAssignPlanMutation();

  if (isLoading || usageLoading || !subscription || !usage) return <LoadingSpinner />;

  const activePlans = (plans ?? []).filter((plan) => plan.isActive);
  const planOptions = activePlans.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }));

  const handleExtend = async (values: { extendDays: number }) => {
    await actionMutation.mutateAsync({ action: 'extend', id, extendDays: values.extendDays });
    message.success('Subscription extended');
  };

  const handleChangePlan = async (values: {
    planId: string;
    billingCycle: BillingCycle;
    mode: 'upgrade' | 'downgrade' | 'assign';
  }) => {
    if (values.mode === 'assign') {
      await assignMutation.mutateAsync({
        studioId: subscription.studioId,
        planId: values.planId,
        billingCycle: values.billingCycle,
      });
      message.success('Plan assigned');
      return;
    }

    await actionMutation.mutateAsync({
      action: values.mode,
      studioId: subscription.studioId,
      planId: values.planId,
      billingCycle: values.billingCycle,
    });
    message.success(values.mode === 'upgrade' ? 'Plan upgraded' : 'Plan changed');
  };

  const handleActivate = async () => {
    await actionMutation.mutateAsync({ action: 'activate', id });
    message.success('Subscription activated');
  };

  const handleSuspend = async () => {
    await actionMutation.mutateAsync({ action: 'suspend', id });
    message.success('Subscription suspended');
  };

  const handleCancel = async () => {
    await actionMutation.mutateAsync({ action: 'cancel', id });
    message.success('Subscription cancelled');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <Title level={3} className="!mb-0">
            Subscription Details
          </Title>
          <Text type="secondary">{subscription.studio?.studioName ?? subscription.studioId}</Text>
          <div>
            <SubscriptionStatusBadge status={subscription.status} />
          </div>
        </div>
        <Space wrap>
          {canActivate(subscription.status) ? (
            <Button type="primary" onClick={handleActivate} loading={actionMutation.isPending}>
              Activate
            </Button>
          ) : null}
          {canSuspend(subscription.status) ? (
            <Button onClick={handleSuspend} loading={actionMutation.isPending}>
              Suspend
            </Button>
          ) : null}
          {subscription.status !== SubscriptionStatus.CANCELLED ? (
            <Button danger onClick={handleCancel} loading={actionMutation.isPending}>
              Cancel
            </Button>
          ) : null}
        </Space>
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

        <Card title="Change / Assign Plan">
          <Form
            layout="vertical"
            initialValues={{
              billingCycle: subscription.billingCycle || BillingCycle.MONTHLY,
              mode: canSuspend(subscription.status) ? 'upgrade' : 'assign',
              planId: subscription.planId,
            }}
            onFinish={handleChangePlan}
          >
            <Form.Item name="mode" label="Action" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Upgrade / change (active sub)', value: 'upgrade' },
                  { label: 'Downgrade', value: 'downgrade' },
                  { label: 'Force assign plan', value: 'assign' },
                ]}
              />
            </Form.Item>
            <Form.Item name="planId" label="Target Plan" rules={[{ required: true }]}>
              <Select options={planOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="billingCycle" label="Billing Cycle" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Monthly', value: BillingCycle.MONTHLY },
                  { label: 'Yearly', value: BillingCycle.YEARLY },
                ]}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={actionMutation.isPending || assignMutation.isPending}
            >
              Apply plan change
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
};
