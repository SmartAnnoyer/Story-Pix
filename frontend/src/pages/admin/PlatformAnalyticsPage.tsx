import { useMemo, useState } from 'react';
import { Col, Row, Typography } from 'antd';
import { usePlatformAnalyticsDashboardQuery } from '@/hooks/useAnalyticsQueries';
import { AnalyticsFilters } from '@/features/analytics/components/AnalyticsFilters';
import { StatsGrid } from '@/features/analytics/components/StatsCards';
import { TrendChart } from '@/features/analytics/components/TrendChart';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AnalyticsEventType } from '@/types/analytics.types';

const { Title, Paragraph } = Typography;

export const PlatformAnalyticsPage = () => {
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [eventType, setEventType] = useState<AnalyticsEventType>();

  const params = useMemo(() => ({ from, to, eventType }), [from, to, eventType]);
  const { data, isLoading } = usePlatformAnalyticsDashboardQuery(params);

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Platform Analytics
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Monitor studio growth, subscriptions, and platform-wide usage trends.
      </Paragraph>

      <AnalyticsFilters
        from={from}
        to={to}
        eventType={eventType}
        onDateChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onEventTypeChange={setEventType}
      />

      <StatsGrid
        items={[
          { title: 'Total Studios', value: data.widgets.totalStudios },
          { title: 'Active Studios', value: data.widgets.activeStudios },
          { title: 'Monthly Growth', value: data.widgets.monthlyGrowth },
          { title: 'Total Albums', value: data.widgets.totalAlbums },
          { title: 'Total Scans', value: data.widgets.totalScans },
          {
            title: 'Platform Storage',
            value: data.widgets.platformStorageUsageGB,
            suffix: 'GB',
            precision: 2,
          },
        ]}
      />

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={8}>
          <TrendChart
            title="Studio Growth"
            data={data.charts.studioGrowth.map((item) => ({ label: item.date, value: item.count }))}
          />
        </Col>
        <Col xs={24} lg={8}>
          <TrendChart
            title="Subscription Growth"
            data={aggregateSubscriptionGrowth(data.charts.subscriptionGrowth)}
          />
        </Col>
        <Col xs={24} lg={8}>
          <TrendChart
            title="Usage Trends"
            data={data.charts.usageTrends.map((item) => ({ label: item.date, value: item.events }))}
          />
        </Col>
      </Row>
    </div>
  );
};

function aggregateSubscriptionGrowth(
  rows: Array<{ date: string; eventType: string; count: number }>,
) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.date, (map.get(row.date) ?? 0) + row.count));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
