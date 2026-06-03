import { Card, Col, Row, Statistic } from 'antd';
import type { RevenueSummary } from '@/types/billing.types';

interface RevenueCardsProps {
  revenue: RevenueSummary;
}

export const RevenueCards = ({ revenue }: RevenueCardsProps) => {
  const latestMonth = revenue.monthlyBreakdown[revenue.monthlyBreakdown.length - 1];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Total Revenue" prefix="₹" value={revenue.totalRevenue} precision={2} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Successful Payments" value={revenue.paymentCount} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic
            title="Latest Month"
            prefix="₹"
            value={latestMonth?.revenue ?? 0}
            precision={2}
            suffix={latestMonth ? `(${latestMonth.count} payments)` : undefined}
          />
        </Card>
      </Col>
    </Row>
  );
};
