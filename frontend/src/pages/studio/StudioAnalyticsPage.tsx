import { useMemo, useState } from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { useStudioAnalyticsDashboardQuery } from '@/hooks/useAnalyticsQueries';
import { AnalyticsFilters } from '@/features/analytics/components/AnalyticsFilters';
import { StatsGrid } from '@/features/analytics/components/StatsCards';
import { TrendChart } from '@/features/analytics/components/TrendChart';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AnalyticsEventType } from '@/types/analytics.types';

const { Title, Paragraph } = Typography;

export const StudioAnalyticsPage = () => {
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [eventType, setEventType] = useState<AnalyticsEventType>();

  const params = useMemo(() => ({ from, to, eventType }), [from, to, eventType]);
  const { data, isLoading } = useStudioAnalyticsDashboardQuery(params);

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Analytics Dashboard
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Track album engagement, scans, and video plays for your studio.
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
          { title: 'Total Albums', value: data.widgets.totalAlbums },
          { title: 'Total Photos', value: data.widgets.totalPhotos },
          { title: 'Total Videos', value: data.widgets.totalVideos },
          { title: 'Total Scans', value: data.widgets.totalScans },
          { title: 'Monthly Scans', value: data.widgets.monthlyScans },
          {
            title: 'Storage Usage',
            value: data.widgets.storageUsageGB,
            suffix: 'GB',
            precision: 2,
          },
        ]}
      />

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={12}>
          <TrendChart
            title="Daily Scans"
            data={data.charts.dailyScans.map((item) => ({ label: item.date, value: item.count }))}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TrendChart
            title="Monthly Scans"
            data={data.charts.monthlyScans.map((item) => ({ label: item.label, value: item.count }))}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TrendChart
            title="Video Plays"
            data={aggregateByDate(data.charts.videoPlays)}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Most Popular Albums">
            <div className="space-y-3">
              {data.popularAlbums.map((album) => (
                <div key={album.albumId} className="flex items-center justify-between text-sm">
                  <span>{album.albumName}</span>
                  <span className="text-gray-500">{album.views} views</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

function aggregateByDate(rows: Array<{ date: string; count: number }>) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.date, (map.get(row.date) ?? 0) + row.count));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
