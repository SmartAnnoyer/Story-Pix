import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useAdminDashboardQuery } from '@/hooks/useStudioQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const AdminDashboardPage = () => {
  const { data, isLoading, isError } = useAdminDashboardQuery();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) {
    return <Paragraph type="danger">Unable to load dashboard statistics.</Paragraph>;
  }

  return (
    <div>
      <Title level={3} className="!mb-1">
        Platform Dashboard
      </Title>
      <Paragraph type="secondary" className="!mb-8">
        Overview of all studios and platform usage.
      </Paragraph>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Studios" value={data.totalStudios} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Active" value={data.activeStudios} valueStyle={{ color: '#16a34a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Suspended" value={data.suspendedStudios} valueStyle={{ color: '#dc2626' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Trial" value={data.trialStudios} valueStyle={{ color: '#0284c7' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Storage Used" suffix="GB" value={data.totalStorageUsedGB} precision={2} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Monthly Scans" value={data.totalMonthlyScans} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Revenue (Placeholder)" prefix="₹" value={data.revenuePlaceholder} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div className="mb-2 text-sm text-gray-500">Subscription Summary</div>
            <div className="space-y-1 text-sm">
              <div>Trial: {data.subscriptionSummary.trial}</div>
              <div>Active: {data.subscriptionSummary.active}</div>
              <div>Expired: {data.subscriptionSummary.expired}</div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
