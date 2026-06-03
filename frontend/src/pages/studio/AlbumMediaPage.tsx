import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Col, Row, Tabs, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery, useDeleteMediaMutation } from '@/hooks/useMediaQueries';
import { UploadArea } from '@/features/media/components/UploadArea';
import { UploadProgressList } from '@/features/media/components/UploadProgressList';
import { PhotoGallery } from '@/features/media/components/PhotoGallery';
import { VideoGallery } from '@/features/media/components/VideoGallery';
import { AlbumStatusBadge } from '@/features/albums/components/AlbumStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumStatus } from '@/types/album.types';
import { MediaType } from '@/types/media.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

const { Title, Paragraph } = Typography;

export const AlbumMediaPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: mediaData, isLoading: mediaLoading, refetch } = useAlbumMediaQuery(id, { limit: 100 });
  const deleteMutation = useDeleteMediaMutation();

  const photos = useMemo(
    () => (mediaData?.items ?? []).filter((item) => item.mediaType === MediaType.PHOTO),
    [mediaData],
  );
  const videos = useMemo(
    () => (mediaData?.items ?? []).filter((item) => item.mediaType === MediaType.VIDEO),
    [mediaData],
  );

  if (albumLoading || !album) return <LoadingSpinner />;

  const isArchived = album.status === AlbumStatus.ARCHIVED;

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMutation.mutateAsync(mediaId);
      message.success('Media deleted');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            className="!px-0"
            onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', id))}
          >
            Back to album
          </Button>
          <Title level={3} className="!mb-1">
            {album.albumName} — Media
          </Title>
          <Paragraph type="secondary" className="!mb-2">
            Upload photos and videos for this album.
          </Paragraph>
          <AlbumStatusBadge status={album.status} />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="Upload" className="mb-4">
            <Tabs
              items={[
                {
                  key: 'photos',
                  label: 'Photos',
                  children: (
                    <UploadArea
                      albumId={id}
                      mediaType={MediaType.PHOTO}
                      disabled={isArchived}
                      onComplete={() => void refetch()}
                    />
                  ),
                },
                {
                  key: 'videos',
                  label: 'Videos',
                  children: (
                    <UploadArea
                      albumId={id}
                      mediaType={MediaType.VIDEO}
                      disabled={isArchived}
                      onComplete={() => void refetch()}
                    />
                  ),
                },
              ]}
            />
          </Card>
          <Card>
            <UploadProgressList />
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card title="Photos">
            <PhotoGallery items={photos} loading={mediaLoading} onDelete={handleDelete} />
          </Card>
          <Card title="Videos" className="mt-4">
            <VideoGallery items={videos} loading={mediaLoading} onDelete={handleDelete} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
