import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { MappingForm } from '@/features/ar/components/MappingForm';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import { albumMediaPath, albumSharePath } from '@/features/albums/utils/album-delivery';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useCreateArTargetMutation, usePublishArTargetMutation } from '@/hooks/useArTargetQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MediaStatus, MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';

const { Title, Paragraph } = Typography;

const nameFromFile = (fileName?: string) =>
  (fileName ?? 'Photo').replace(/\.[^.]+$/, '').trim() || 'Photo';

export const CreateMappingPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: mediaData, isLoading: mediaLoading } = useAlbumMediaQuery(id, { limit: 100 });
  const createMutation = useCreateArTargetMutation();
  const publishMutation = usePublishArTargetMutation();

  const readyMedia = useMemo(
    () => (mediaData?.items ?? []).filter((item) => item.status === MediaStatus.READY),
    [mediaData],
  );

  const readyPhotos = useMemo(
    () => readyMedia.filter((item) => item.mediaType === MediaType.PHOTO),
    [readyMedia],
  );
  const readyVideos = useMemo(
    () => readyMedia.filter((item) => item.mediaType === MediaType.VIDEO),
    [readyMedia],
  );

  if (albumLoading || mediaLoading || !album) return <LoadingSpinner />;

  const needsUpload = readyPhotos.length === 0 || readyVideos.length === 0;
  const firstPhoto = readyPhotos[0];
  const firstVideo = readyVideos[0];

  const handleSubmit = async (values: {
    targetName: string;
    photoMediaId: string;
    videoMediaId: string;
    overlayFrame: { x: number; y: number; width: number; height: number };
  }) => {
    try {
      const created = await createMutation.mutateAsync({ albumId: id, ...values });
      await publishMutation.mutateAsync(created.id);
      message.success('Photo is linked. Now share the album with your client.');
      navigate(albumSharePath(id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not save the mapping'));
    }
  };

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="!mb-2 !px-0"
        onClick={() => navigate(albumSharePath(id))}
      >
        Back to album
      </Button>
      <Title level={3} className="!mb-1">
        {album.albumName}
      </Title>
      <Paragraph type="secondary" className="!mb-4 max-w-2xl">
        Pick the printed photo and the video that should play on it. Saving turns this on for
        guests.
      </Paragraph>

      <AlbumDeliveryGuide albumId={id} current="map" />

      {needsUpload ? (
        <Alert
          className="!mb-4 max-w-2xl"
          type="warning"
          showIcon
          message="Upload a photo and a video first"
          description={
            readyPhotos.length === 0 && readyVideos.length === 0
              ? 'This album has no ready photos or videos yet.'
              : readyPhotos.length === 0
                ? 'Add at least one printed photo.'
                : 'Add at least one video.'
          }
          action={
            <Button
              size="small"
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => navigate(albumMediaPath(id))}
            >
              Add photos & videos
            </Button>
          }
        />
      ) : (
        <Card className="max-w-xl">
          <MappingForm
            photos={readyMedia}
            videos={readyMedia}
            initialValues={{
              photoMediaId: firstPhoto?.id,
              videoMediaId: firstVideo?.id,
              targetName: nameFromFile(firstPhoto?.originalFileName),
            }}
            loading={createMutation.isPending || publishMutation.isPending}
            submitLabel="Save and continue"
            onSubmit={handleSubmit}
            onCancel={() => navigate(albumSharePath(id))}
          />
        </Card>
      )}
    </div>
  );
};
