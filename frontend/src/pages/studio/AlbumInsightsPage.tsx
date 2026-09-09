import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAlbumInsightsQuery } from '@/hooks/useAnalyticsQueries';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';
import { StatsGrid } from '@/features/analytics/components/StatsCards';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph } = Typography;

export const AlbumInsightsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAlbumInsightsQuery(id);
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });

  const nameByTargetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of mappings?.items ?? []) {
      const photoName = item.photo?.originalFileName?.replace(/\.[^.]+$/, '')?.trim();
      map.set(item.id, item.targetName || photoName || 'Photo');
    }
    return map;
  }, [mappings]);

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
        {data.album.albumName} — Guest activity
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        How often guests opened this album and unlocked a photo.
      </Paragraph>

      <StatsGrid
        items={[
          { title: 'Opens', value: data.metrics.totalViews },
          { title: 'Unlocks', value: data.metrics.totalScans },
          { title: 'Videos watched', value: data.metrics.videosPlayed },
        ]}
      />

      <Card title="Most unlocked photos" className="mt-6">
        <div className="space-y-3">
          {data.topPhotos.length ? (
            data.topPhotos.map((photo) => (
              <div key={photo.arTargetId} className="flex justify-between text-sm">
                <span>{nameByTargetId.get(photo.arTargetId) ?? 'Photo'}</span>
                <span className="text-gray-500">
                  {photo.scans} unlock{photo.scans === 1 ? '' : 's'}
                </span>
              </div>
            ))
          ) : (
            <Paragraph type="secondary">No unlocks yet.</Paragraph>
          )}
        </div>
      </Card>
    </div>
  );
};
