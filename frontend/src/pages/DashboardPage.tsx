import { Button, Card, Col, Row, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentPlanQuery } from '@/hooks/useSubscriptionQueries';
import { RecentAlbumsWidget } from '@/features/albums/components/RecentAlbumsWidget';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph, Text } = Typography;

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useCurrentPlanQuery();

  if (user?.role === UserRole.SUPER_ADMIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  if (isLoading || !summary) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Title level={3} className="!mb-1">
        Hi{user ? `, ${user.firstName}` : ''}
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Make a printed photo play a video. Three steps.
      </Paragraph>

      <ol className="mb-8 m-0 list-none space-y-3 p-0">
        <li className="rounded-2xl border border-black/5 bg-white p-4">
          <Text strong>1. Create an album</Text>
          <Paragraph type="secondary" className="!mb-3 !mt-1">
            One album is one event — a wedding, a school year, a family set.
          </Paragraph>
          <Button type="primary" onClick={() => navigate(ROUTES.ALBUM_CREATE)}>
            New album
          </Button>
        </li>
        <li className="rounded-2xl border border-black/5 bg-white p-4">
          <Text strong>2. Add photo and video, then map them</Text>
          <Paragraph type="secondary" className="!mb-3 !mt-1">
            Upload the print and the video. Then choose which video plays when guests scan that
            photo.
          </Paragraph>
          <Button onClick={() => navigate(ROUTES.ALBUMS)}>Open albums</Button>
        </li>
        <li className="rounded-2xl border border-black/5 bg-white p-4">
          <Text strong>3. Share the QR</Text>
          <Paragraph type="secondary" className="!mb-0 !mt-1">
            Turn the album on. Print the QR or send the link. Guests open it and point at the photo.
          </Paragraph>
        </li>
      </ol>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={12} sm={8}>
          <Card>
            <Text type="secondary">Albums</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {summary.usage.albumCount}
            </Title>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Text type="secondary">Scans this month</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {summary.usage.scanUsage}
            </Title>
          </Card>
        </Col>
      </Row>

      <RecentAlbumsWidget />
    </div>
  );
};
