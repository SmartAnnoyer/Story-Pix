import { Typography } from 'antd';
import { useRevenueQuery, useAdminPaymentsQuery } from '@/hooks/useBillingQueries';
import { RevenueCards } from '@/features/billing/components/RevenueCards';
import { BillingTable } from '@/features/billing/components/BillingTable';
import { TrendChart } from '@/features/analytics/components/TrendChart';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const RevenueDashboardPage = () => {
  const { data: revenue, isLoading } = useRevenueQuery();
  const { data: payments, isLoading: paymentsLoading } = useAdminPaymentsQuery({ page: 1, limit: 10 });

  if (isLoading || !revenue) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Revenue Dashboard
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Platform-wide billing revenue and recent successful payments.
      </Paragraph>

      <RevenueCards revenue={revenue} />

      <div className="mt-6">
        <TrendChart
          title="Monthly Revenue"
          data={revenue.monthlyBreakdown.map((item) => ({
            label: `${item.year}-${String(item.month).padStart(2, '0')}`,
            value: item.revenue,
          }))}
        />
      </div>

      <Title level={4} className="!mt-8">
        Recent Payments
      </Title>
      <BillingTable payments={payments?.items ?? []} loading={paymentsLoading} />
    </div>
  );
};
