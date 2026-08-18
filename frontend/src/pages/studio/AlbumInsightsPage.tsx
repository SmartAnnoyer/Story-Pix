import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAlbumInsightsQuery } from '@/hooks/useAnalyticsQueries';
import { StatsGrid } from '@/features/analytics/components/StatsCards';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph } = Typography;

export const AlbumInsightsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAlbumInsightsQuery(id);

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
        {data.album.albumName} — Scan counts
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        How often guests opened this album and scanned a photo.
      </Paragraph>

      <StatsGrid
        items={[
          { title: 'Opens', value: data.metrics.totalViews },
          { title: 'Scans', value: data.metrics.totalScans },
          { title: 'Videos played', value: data.metrics.videosPlayed },
        ]}
      />

      <Card title="Most scanned photos" className="mt-6">
        <div className="space-y-3">
          {data.topPhotos.length ? (
            data.topPhotos.map((photo) => (
              <div key={photo.arTargetId} className="flex justify-between text-sm">
                <span>{photo.arTargetId}</span>
                <span className="text-gray-500">{photo.scans} scans</span>
              </div>
            ))
          ) : (
            <Paragraph type="secondary">No scans yet.</Paragraph>
          )}
        </div>
      </Card>
    </div>
  );
};
