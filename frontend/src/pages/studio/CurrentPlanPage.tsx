import { Alert, Card, Col, Row, Typography } from 'antd';
import { useCurrentPlanQuery, useUpgradeOptionsQuery } from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummaryWidget } from '@/features/subscriptions/components/SubscriptionSummaryWidget';
import { PlanCard } from '@/features/subscriptions/components/PlanCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const CurrentPlanPage = () => {
  const { data: summary, isLoading } = useCurrentPlanQuery();
  const { data: upgrades, isLoading: upgradesLoading } = useUpgradeOptionsQuery();

  if (isLoading || !summary) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Current Plan
      </Title>
      <Paragraph type="secondary" className="!mb-8">
        View your subscription, usage limits, and available upgrades.
      </Paragraph>

      <Card className="mb-8">
        <SubscriptionSummaryWidget summary={summary} />
      </Card>

      <Title level={4} className="!mb-4">
        Available Upgrades
      </Title>
      {upgradesLoading ? (
        <LoadingSpinner />
      ) : upgrades?.length ? (
        <Row gutter={[16, 16]}>
          {upgrades.map((plan) => (
            <Col key={plan.id} xs={24} md={12} lg={8}>
              <PlanCard plan={plan} />
            </Col>
          ))}
        </Row>
      ) : (
        <Alert
          type="info"
          showIcon
          message="No upgrades available"
          description="You are on the highest plan, or payment integration (Razorpay) is not yet connected. Contact support to change your plan."
        />
      )}
    </div>
  );
};
