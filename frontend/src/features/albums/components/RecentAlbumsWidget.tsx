import { Button, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useRecentAlbumsQuery } from '@/hooks/useAlbumQueries';
import { AlbumCard } from './AlbumCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';

const { Title } = Typography;

export const RecentAlbumsWidget = () => {
  const navigate = useNavigate();
  const { data: albums, isLoading } = useRecentAlbumsQuery(4);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={5} className="!mb-0">
          Recent Albums
        </Title>
        <Button type="link" onClick={() => navigate(ROUTES.ALBUMS)}>
          View all
        </Button>
      </div>
      {albums?.length ? (
        <Row gutter={[16, 16]}>
          {albums.map((album) => (
            <Col key={album.id} xs={24} sm={12} lg={6}>
              <AlbumCard
                album={album}
                onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', album.id))}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          No albums yet. Create your first album to get started.
        </div>
      )}
    </div>
  );
};
