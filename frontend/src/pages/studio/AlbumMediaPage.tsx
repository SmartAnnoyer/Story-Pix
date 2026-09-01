import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Row, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery, useDeleteMediaMutation } from '@/hooks/useMediaQueries';
import { UploadArea } from '@/features/media/components/UploadArea';
import { UploadProgressList } from '@/features/media/components/UploadProgressList';
import { PhotoGallery } from '@/features/media/components/PhotoGallery';
import { VideoGallery } from '@/features/media/components/VideoGallery';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import {
  albumMapPath,
  albumSharePath,
  getReadyMediaCounts,
} from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumStatus } from '@/types/album.types';
import { MediaStatus, MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';

const { Title, Paragraph, Text } = Typography;

export const AlbumMediaPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const {
    data: mediaData,
    isLoading: mediaLoading,
    refetch,
  } = useAlbumMediaQuery(id, { limit: 100 });
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });
  const deleteMutation = useDeleteMediaMutation();

  const { photos, videos, readyPhotos, readyVideos, processing } = useMemo(
    () => getReadyMediaCounts(mediaData?.items),
    [mediaData],
  );

  if (albumLoading || !album) return <LoadingSpinner />;

  const isArchived = album.status === AlbumStatus.ARCHIVED;
  const canMap = readyPhotos.length > 0 && readyVideos.length > 0;
  const hasMappings = (mappings?.items.length ?? 0) > 0;
  const waitingPhotos = photos.some((item) => item.status !== MediaStatus.READY);
  const waitingVideos = videos.some((item) => item.status !== MediaStatus.READY);

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMutation.mutateAsync(mediaId);
      message.success('Removed');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="!px-0"
        onClick={() => navigate(albumSharePath(id))}
      >
        Back to album
      </Button>
      <Title level={3} className="!mb-1">
        {album.albumName}
      </Title>
      <Paragraph type="secondary" className="!mb-4">
        Guests will point their phone at the printed photo. Upload that print, then the video that
        should play on it.
      </Paragraph>

      <AlbumDeliveryGuide albumId={id} current="media" />

      {!canMap ? (
        <Alert
          className="!mb-4"
          type="info"
          showIcon
          message={
            photos.length === 0 && videos.length === 0
              ? 'You need one photo and one video'
              : photos.length === 0
                ? 'Add the printed photo next'
                : videos.length === 0
                  ? 'Add the video next'
                  : processing || waitingPhotos || waitingVideos
                    ? 'Wait until upload finishes'
                    : 'Photo and video must finish processing before you can map them'
          }
          description="The photo is what they print. The video is what plays when they scan it."
        />
      ) : (
        <Alert
          className="!mb-4"
          type="success"
          showIcon
          message="Photo and video are ready"
          description="Next, choose which video plays when a guest scans that photo."
          action={
            <Button type="primary" onClick={() => navigate(albumMapPath(id, hasMappings))}>
              Next: map to video
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="1. Printed photo"
            extra={<Text type="secondary">{readyPhotos.length} ready</Text>}
          >
            <Paragraph type="secondary" className="!text-sm">
              Use the same photo you will print for the client.
            </Paragraph>
            {isArchived ? null : (
              <UploadArea
                albumId={id}
                mediaType={MediaType.PHOTO}
                onComplete={() => void refetch()}
              />
            )}
            <div className="mt-4">
              <PhotoGallery
                items={photos}
                loading={mediaLoading}
                onDelete={handleDelete}
                onMediaUpdated={() => void refetch()}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="2. Video" extra={<Text type="secondary">{readyVideos.length} ready</Text>}>
            <Paragraph type="secondary" className="!text-sm">
              This is what plays on the photo in the guest’s camera.
            </Paragraph>
            {isArchived ? null : (
              <UploadArea
                albumId={id}
                mediaType={MediaType.VIDEO}
                onComplete={() => void refetch()}
              />
            )}
            <div className="mt-4">
              <VideoGallery
                items={videos}
                loading={mediaLoading}
                onDelete={handleDelete}
                onMediaUpdated={() => void refetch()}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="mt-4">
        <UploadProgressList />
      </Card>

      {canMap ? (
        <div className="mt-4">
          <Button
            type="primary"
            size="large"
            onClick={() => navigate(albumMapPath(id, hasMappings))}
          >
            Next: map to video
          </Button>
        </div>
      ) : null}
    </div>
  );
};
