import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Descriptions, Space, Typography, message } from 'antd';
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
import { StatusBadge } from '@/features/studios/components/StatusBadge';
import { StudioAdminAccessCard } from '@/features/studios/components/StudioAdminAccessCard';
import { UsageCards } from '@/features/studios/components/UsageCards';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { StudioStatus } from '@/types/studio.types';

const { Title } = Typography;

export const StudioDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: studio, isLoading } = useStudioQuery(id);
  const suspendMutation = useSuspendStudioMutation();
  const activateMutation = useActivateStudioMutation();
  const resetPasswordMutation = useResetStudioAdminPasswordMutation();

  if (isLoading || !studio) return <LoadingSpinner />;

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
          <Button icon={<EditOutlined />} onClick={() => navigate(ROUTES.STUDIO_EDIT.replace(':id', id))}>
            Edit
          </Button>
          {studio.status === StudioStatus.SUSPENDED ? (
            <Button icon={<PlayCircleOutlined />} onClick={handleActivate}>
              Activate
            </Button>
          ) : (
            <Button icon={<PauseCircleOutlined />} onClick={handleSuspend}>
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
          storageUsedPercent: Math.round((studio.storageUsedGB / studio.storageLimitGB) * 100) || 0,
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

      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Studio Code">{studio.studioCode}</Descriptions.Item>
          <Descriptions.Item label="Owner">{studio.ownerName}</Descriptions.Item>
          <Descriptions.Item label="Email">{studio.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{studio.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Website">{studio.website ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Address">{studio.address ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Subscription">{studio.subscriptionStatus}</Descriptions.Item>
          <Descriptions.Item label="Subscription ID">{studio.subscriptionId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {studio.createdAt ? new Date(studio.createdAt).toLocaleString() : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
