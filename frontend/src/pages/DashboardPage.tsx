import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentPlanQuery } from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummaryWidget } from '@/features/subscriptions/components/SubscriptionSummaryWidget';
import { RecentAlbumsWidget } from '@/features/albums/components/RecentAlbumsWidget';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph } = Typography;

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useCurrentPlanQuery();

  if (user?.role === UserRole.SUPER_ADMIN) {
    navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    return null;
  }

  if (isLoading || !summary) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Title level={3} className="!mb-1">
        Welcome back{user ? `, ${user.firstName}` : ''}
      </Title>
      <Paragraph type="secondary" className="!mb-8">
        Your studio overview and usage statistics.
      </Paragraph>

      <SubscriptionSummaryWidget summary={summary} />

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate(ROUTES.ALBUMS)}>
            <Statistic title="Albums" value={summary.usage.albumCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate(ROUTES.STUDIO_PLAN)}>
            <Statistic title="Scans This Month" value={summary.usage.scanUsage} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Storage Used" suffix="GB" value={summary.usage.storageUsedGB} precision={2} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Team Members" value={summary.usage.userCount} />
          </Card>
        </Col>
      </Row>

      <div className="mt-8">
        <RecentAlbumsWidget />
      </div>
    </div>
  );
};
