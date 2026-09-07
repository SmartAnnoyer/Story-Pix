import { Button, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useRecentAlbumsQuery } from '@/hooks/useAlbumQueries';
import { AlbumCard } from './AlbumCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';

const { Title } = Typography;

type RecentAlbumsWidgetProps = {
  hideHeader?: boolean;
};

export const RecentAlbumsWidget = ({ hideHeader = false }: RecentAlbumsWidgetProps) => {
  const navigate = useNavigate();
  const { data: albums, isLoading } = useRecentAlbumsQuery(4);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {!hideHeader ? (
        <div className="mb-4 flex items-center justify-between">
          <Title level={5} className="!mb-0">
            Recent albums
          </Title>
          <Button type="link" onClick={() => navigate(ROUTES.ALBUMS)}>
            View all
          </Button>
        </div>
      ) : null}
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
        <div className="rounded-lg border border-dashed border-[#e6e4ea] bg-white p-8 text-center text-[#6a6772]">
          No albums yet. Start with New album on Home.
        </div>
      )}
    </div>
  );
};
