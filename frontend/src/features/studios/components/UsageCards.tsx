import { Card, Col, Progress, Row, Statistic, Typography } from 'antd';
import type { StudioUsage } from '@/types/studio.types';
import { StatusBadge } from './StatusBadge';

const { Text } = Typography;

interface UsageCardsProps {
  usage: StudioUsage;
  showSubscription?: boolean;
}

export const UsageCards = ({ usage, showSubscription = true }: UsageCardsProps) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="Storage Used" suffix="GB" value={usage.storageUsedGB} precision={2} />
          <Progress percent={usage.storageUsedPercent} size="small" className="mt-2" />
          <Text type="secondary" className="text-xs">
            of {usage.storageLimitGB} GB
          </Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="Monthly Scans" value={usage.monthlyScanUsage} />
          <Progress percent={usage.monthlyScanUsedPercent} size="small" className="mt-2" />
          <Text type="secondary" className="text-xs">
            of {usage.monthlyScanLimit} limit
          </Text>
        </Card>
      </Col>
      {showSubscription ? (
        <>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Subscription"
                value={usage.subscriptionStatus}
                valueStyle={{ fontSize: 18, textTransform: 'capitalize' }}
              />
              <Text type="secondary" className="text-xs">
                {usage.subscriptionId ?? 'No subscription ID'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div className="mb-2 text-sm text-gray-500">Studio Status</div>
              <StatusBadge status={usage.status} />
            </Card>
          </Col>
        </>
      ) : null}
    </Row>
  );
};
