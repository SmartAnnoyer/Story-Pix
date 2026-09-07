import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  useActivateStudioMutation,
  useResetStudioAdminPasswordMutation,
  useStudioQuery,
  useSuspendStudioMutation,
} from '@/hooks/useStudioQueries';
import {
  useAssignPlanMutation,
  usePlansQuery,
  useSubscriptionActionMutation,
} from '@/hooks/useSubscriptionQueries';
import {
  useAdminPacksQuery,
  useAdminStudioPackSummaryQuery,
  useAssignPackMutation,
} from '@/hooks/usePackQueries';
import { StatusBadge } from '@/features/studios/components/StatusBadge';
import { StudioAdminAccessCard } from '@/features/studios/components/StudioAdminAccessCard';
import { UsageCards } from '@/features/studios/components/UsageCards';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { StudioStatus } from '@/types/studio.types';
import { BillingCycle } from '@/types/subscription.types';

const { Title, Paragraph } = Typography;

export const StudioDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: studio, isLoading } = useStudioQuery(id);
  const suspendMutation = useSuspendStudioMutation();
  const activateMutation = useActivateStudioMutation();
  const resetPasswordMutation = useResetStudioAdminPasswordMutation();
  const { data: plans } = usePlansQuery();
  const { data: packs } = useAdminPacksQuery();
  const { data: packSummary } = useAdminStudioPackSummaryQuery(id);
  const assignMutation = useAssignPlanMutation();
  const assignPackMutation = useAssignPackMutation();
  const subscriptionActionMutation = useSubscriptionActionMutation();

  if (isLoading || !studio) return <LoadingSpinner />;

  const canActivateStudio =
    studio.status === StudioStatus.SUSPENDED || studio.status === StudioStatus.EXPIRED;

  const handleResetAdminPassword = async () => {
    const result = await resetPasswordMutation.mutateAsync(id);
    message.success(`New temporary password: ${result.temporaryPassword}`);
  };

  const handleSuspend = async () => {
    await suspendMutation.mutateAsync(id);
    message.success('Studio suspended');
  };

  const handleActivate = async () => {
    await activateMutation.mutateAsync(id);
    message.success('Studio activated');
  };

  const handleAssignPlan = async (values: { planId: string; billingCycle: BillingCycle }) => {
    await assignMutation.mutateAsync({
      studioId: id,
      planId: values.planId,
      billingCycle: values.billingCycle,
    });
    message.success('Plan assigned and studio activated');
  };

  const handleChangePlan = async (values: { planId: string; billingCycle: BillingCycle }) => {
    await subscriptionActionMutation.mutateAsync({
      action: 'upgrade',
      studioId: id,
      planId: values.planId,
      billingCycle: values.billingCycle,
    });
    message.success('Plan changed');
  };

  const handleAssignPack = async (values: { packId: string; quantity: number; notes?: string }) => {
    await assignPackMutation.mutateAsync({
      studioId: id,
      packId: values.packId,
      quantity: values.quantity,
      notes: values.notes,
    });
    message.success('Album pack credits enabled for studio');
  };

  const planOptions = (plans ?? [])
    .filter((plan) => plan.isActive)
    .map((plan) => ({ label: `${plan.name} (${plan.code})`, value: plan.id }));

  const packOptions = (packs ?? [])
    .filter((pack) => pack.isActive)
    .map((pack) => ({
      label: `${pack.name} · ${pack.albumsIncluded > 1 ? `${pack.albumsIncluded} albums` : '1 album'} · up to ${pack.maxMappings} photos · ₹${pack.unitPriceInr}`,
      value: pack.id,
    }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.STUDIOS)}>
            Back
          </Button>
          <Title level={3} className="!mb-0">
            {studio.studioName}
          </Title>
          <StatusBadge status={studio.status} />
        </Space>
        <Space wrap>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(ROUTES.STUDIO_EDIT.replace(':id', id))}
          >
            Edit
          </Button>
          {studio.subscriptionId ? (
            <Button
              onClick={() =>
                navigate(ROUTES.SUBSCRIPTION_DETAILS.replace(':id', studio.subscriptionId!))
              }
            >
              Manage subscription
            </Button>
          ) : null}
          {canActivateStudio ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleActivate}
              loading={activateMutation.isPending}
            >
              Activate
            </Button>
          ) : (
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handleSuspend}
              loading={suspendMutation.isPending}
            >
              Suspend
            </Button>
          )}
        </Space>
      </div>

      <StudioAdminAccessCard
        adminAccess={studio.adminAccess}
        onResetPassword={handleResetAdminPassword}
        isResetting={resetPasswordMutation.isPending}
      />

      <div className="mb-6">
        <UsageCards
          usage={{
            storageLimitGB: studio.storageLimitGB,
            storageUsedGB: studio.storageUsedGB,
            storageUsedPercent:
              Math.round((studio.storageUsedGB / studio.storageLimitGB) * 100) || 0,
            monthlyScanLimit: studio.monthlyScanLimit,
            monthlyScanUsage: studio.monthlyScanUsage,
            monthlyScanUsedPercent:
              Math.round((studio.monthlyScanUsage / studio.monthlyScanLimit) * 100) || 0,
            subscriptionStatus: studio.subscriptionStatus,
            subscriptionId: studio.subscriptionId,
            status: studio.status,
          }}
        />
      </div>

      <Card title="Album packs (enable for shop)" className="mb-6">
        <Paragraph type="secondary" className="!mb-2">
          Mini = up to 10 photos · Standard = up to 25 photos · Bundles = multiple albums at a
          discount. Every photo always includes 1,000 guest plays.
        </Paragraph>
        <Paragraph type="secondary" className="!mb-4">
          Remaining album credits: <strong>{packSummary?.remainingAlbumCredits ?? 0}</strong> /{' '}
          {packSummary?.totalAssignedCredits ?? 0} assigned
        </Paragraph>
        <Form
          layout="vertical"
          initialValues={{ quantity: 1 }}
          onFinish={handleAssignPack}
          className="max-w-xl"
        >
          <Form.Item
            name="packId"
            label="Pack"
            rules={[{ required: true, message: 'Select a pack' }]}
          >
            <Select
              options={packOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Select pack"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            extra="Volume packs already include multiple albums; quantity multiplies that."
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional note (payment ref, shop name…)" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={assignPackMutation.isPending}>
            Enable pack for studio
          </Button>
        </Form>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Assign plan (activate studio)">
          <Form
            layout="vertical"
            initialValues={{ billingCycle: BillingCycle.MONTHLY }}
            onFinish={handleAssignPlan}
          >
            <Form.Item
              name="planId"
              label="Plan"
              rules={[{ required: true, message: 'Select a plan' }]}
            >
              <Select
                options={planOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select plan"
              />
            </Form.Item>
            <Form.Item name="billingCycle" label="Billing cycle" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Monthly', value: BillingCycle.MONTHLY },
                  { label: 'Yearly', value: BillingCycle.YEARLY },
                ]}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={assignMutation.isPending}>
              Assign plan
            </Button>
          </Form>
        </Card>

        <Card title="Change current plan">
          <Form
            layout="vertical"
            initialValues={{ billingCycle: BillingCycle.MONTHLY }}
            onFinish={handleChangePlan}
          >
            <Form.Item
              name="planId"
              label="New plan"
              rules={[{ required: true, message: 'Select a plan' }]}
            >
              <Select
                options={planOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select plan"
              />
            </Form.Item>
            <Form.Item name="billingCycle" label="Billing cycle" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Monthly', value: BillingCycle.MONTHLY },
                  { label: 'Yearly', value: BillingCycle.YEARLY },
                ]}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={subscriptionActionMutation.isPending}>
              Change plan
            </Button>
          </Form>
        </Card>
      </div>

      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Studio Code">{studio.studioCode}</Descriptions.Item>
          <Descriptions.Item label="Owner">{studio.ownerName}</Descriptions.Item>
          <Descriptions.Item label="Email">{studio.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{studio.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Website">{studio.website ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Address">{studio.address ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Subscription">{studio.subscriptionStatus}</Descriptions.Item>
          <Descriptions.Item label="Subscription ID">
            {studio.subscriptionId ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {studio.createdAt ? new Date(studio.createdAt).toLocaleString() : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
