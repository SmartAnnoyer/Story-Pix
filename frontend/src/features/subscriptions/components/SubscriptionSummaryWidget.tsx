import { Card, Col, Row, Typography } from 'antd';
import type { UsageSummary } from '@/types/subscription.types';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { UsageProgressCard } from './UsageProgressCard';

const { Text, Title } = Typography;

interface SubscriptionSummaryWidgetProps {
  summary: UsageSummary;
  showPlanPrice?: boolean;
}

export const SubscriptionSummaryWidget = ({ summary, showPlanPrice = true }: SubscriptionSummaryWidgetProps) => {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={4} className="!mb-1">
            {summary.plan.name}
          </Title>
          {showPlanPrice ? (
            <Text type="secondary">
              ₹{summary.plan.monthlyPrice}/mo · {summary.subscription.billingCycle}
            </Text>
          ) : null}
        </div>
        <SubscriptionStatusBadge status={summary.subscription.status} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <UsageProgressCard
            title="Storage"
            used={summary.usage.storageUsedGB}
            limit={summary.remaining.storageGB === null ? null : summary.limits.storageLimitGB}
            percent={summary.percentages.storage}
            unit=" GB"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <UsageProgressCard
            title="Monthly Scans"
            used={summary.usage.scanUsage}
            limit={summary.remaining.scans === null ? null : summary.limits.monthlyScanLimit}
            percent={summary.percentages.scans}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <UsageProgressCard
            title="Albums"
            used={summary.usage.albumCount}
            limit={summary.remaining.albums === null ? null : summary.limits.maxAlbums}
            percent={summary.percentages.albums}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <UsageProgressCard
            title="Users"
            used={summary.usage.userCount}
            limit={summary.remaining.users === null ? null : summary.limits.maxUsers}
            percent={summary.percentages.users}
          />
        </Col>
      </Row>

      {summary.subscription.endDate ? (
        <Card size="small" className="mt-4">
          <Text type="secondary">Expires: </Text>
          <Text>{new Date(summary.subscription.endDate).toLocaleDateString()}</Text>
        </Card>
      ) : null}
    </div>
  );
};
