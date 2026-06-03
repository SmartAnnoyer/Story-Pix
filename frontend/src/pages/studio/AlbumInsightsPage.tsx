import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAlbumInsightsQuery } from '@/hooks/useAnalyticsQueries';
import { AnalyticsFilters } from '@/features/analytics/components/AnalyticsFilters';
import { StatsGrid } from '@/features/analytics/components/StatsCards';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import type { AnalyticsEventType } from '@/types/analytics.types';

const { Title, Paragraph } = Typography;

export const AlbumInsightsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [eventType, setEventType] = useState<AnalyticsEventType>();

  const params = useMemo(() => ({ from, to, eventType }), [from, to, eventType]);
  const { data, isLoading } = useAlbumInsightsQuery(id, params);

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="!mb-4 !px-0"
        onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', id))}
      >
        Back to album
      </Button>

      <Title level={3} className="!mb-1">
        {data.album.albumName} — Insights
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Album views, scans, and top-performing AR photos.
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
          { title: 'Total Views', value: data.metrics.totalViews },
          { title: 'Unique Visitors', value: data.metrics.uniqueVisitors },
          { title: 'Total Scans', value: data.metrics.totalScans },
          { title: 'Successful Scans', value: data.metrics.successfulScans },
          { title: 'Failed Scans', value: data.metrics.failedScans },
          { title: 'Videos Played', value: data.metrics.videosPlayed },
        ]}
      />

      <Card title="Top Viewed Photos" className="mt-6">
        <div className="space-y-3">
          {data.topPhotos.length ? (
            data.topPhotos.map((photo) => (
              <div key={photo.arTargetId} className="flex justify-between text-sm">
                <span>{photo.arTargetId}</span>
                <span className="text-gray-500">{photo.scans} scans</span>
              </div>
            ))
          ) : (
            <Paragraph type="secondary">No scan data yet for this album.</Paragraph>
          )}
        </div>
      </Card>
    </div>
  );
};
