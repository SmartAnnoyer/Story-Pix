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
  Table,
  Tag,
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

const { Title, Paragraph, Text } = Typography;

export const StudioDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: studio, isLoading } = useStudioQuery(id);
  const suspendMutation = useSuspendStudioMutation();
  const activateMutation = useActivateStudioMutation();
  const resetPasswordMutation = useResetStudioAdminPasswordMutation();
  const { data: packs } = useAdminPacksQuery();
  const { data: packSummary } = useAdminStudioPackSummaryQuery(id);
  const assignPackMutation = useAssignPackMutation();

  if (isLoading || !studio) return <LoadingSpinner />;

  const canActivateStudio =
    studio.status === StudioStatus.SUSPENDED ||
    studio.status === StudioStatus.EXPIRED ||
    studio.status === StudioStatus.TRIAL;

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

  const handleAssignPack = async (values: { packId: string; quantity: number; notes?: string }) => {
    await assignPackMutation.mutateAsync({
      studioId: id,
      packId: values.packId,
      quantity: values.quantity,
      notes: values.notes,
    });
    message.success('Pack credits added');
  };

  const packOptions = (packs ?? [])
    .filter((pack) => pack.isActive)
    .map((pack) => ({
      label: `${pack.name} · ${pack.albumsIncluded > 1 ? `${pack.albumsIncluded} albums` : '1 album'} · up to ${pack.maxMappings} photos · ₹${pack.unitPriceInr}`,
      value: pack.id,
    }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Space wrap>
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
          showSubscription={false}
        />
      </div>

      <Card title="Album packs" className="mb-6">
        <Paragraph type="secondary" className="!mb-2">
          Activate / Suspend controls login access only — there is no plan end date. When album
          credits run out, the studio stays active; add another Mini, Standard, or Bundle pack after
          offline payment to unlock more albums.
        </Paragraph>
        <Paragraph type="secondary" className="!mb-4">
          Remaining: <Text strong>{packSummary?.remainingAlbumCredits ?? 0}</Text> /{' '}
          {packSummary?.totalAssignedCredits ?? 0}
          {(packSummary?.remainingAlbumCredits ?? 0) <= 0 ? (
            <>
              {' '}
              <Tag color="warning">Out of credits — add a pack below</Tag>
            </>
          ) : (
            <>
              {' '}
              <Tag color="success">Can create albums</Tag>
            </>
          )}
        </Paragraph>

        <Table
          className="!mb-4"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={packSummary?.credits ?? []}
          columns={[
            { title: 'Pack', dataIndex: 'packName' },
            {
              title: 'Left',
              render: (_, row) => `${row.remainingCredits} / ${row.totalCredits}`,
            },
          ]}
          locale={{ emptyText: 'No packs yet' }}
        />

        <Form
          layout="vertical"
          initialValues={{ quantity: 1 }}
          onFinish={handleAssignPack}
          className="max-w-xl"
        >
          <Form.Item
            name="packId"
            label="Add pack"
            rules={[{ required: true, message: 'Select a pack' }]}
          >
            <Select
              options={packOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Select pack"
            />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Note">
            <Input.TextArea rows={2} placeholder="Optional (shop name, offline receipt…)" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={assignPackMutation.isPending}>
            Add pack credits
          </Button>
        </Form>
      </Card>

      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Studio Code">{studio.studioCode}</Descriptions.Item>
          <Descriptions.Item label="Owner">{studio.ownerName}</Descriptions.Item>
          <Descriptions.Item label="Email">{studio.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{studio.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Website">{studio.website ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Address">{studio.address ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {studio.createdAt ? new Date(studio.createdAt).toLocaleString() : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
