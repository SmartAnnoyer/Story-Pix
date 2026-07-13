import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { MappingForm } from '@/features/ar/components/MappingForm';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useCreateArTargetMutation } from '@/hooks/useArTargetQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MediaStatus, MediaType } from '@/types/media.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

const { Title, Paragraph } = Typography;

export const CreateMappingPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: mediaData, isLoading: mediaLoading } = useAlbumMediaQuery(id, { limit: 100 });
  const createMutation = useCreateArTargetMutation();

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

  const mediaRoute = ROUTES.ALBUM_MEDIA.replace(':id', id);
  const needsUpload = readyPhotos.length === 0 || readyVideos.length === 0;

  const handleSubmit = async (values: {
    targetName: string;
    photoMediaId: string;
    videoMediaId: string;
  }) => {
    try {
      await createMutation.mutateAsync({ albumId: id, ...values });
      message.success('Mapping created');
      navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Create failed'));
    }
  };

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="!mb-4 !px-0"
        onClick={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
      >
        Back to mappings
      </Button>
      <Title level={3} className="!mb-1">
        Create AR Mapping
      </Title>
      <Paragraph type="secondary" className="!mb-4 max-w-2xl">
        Upload photos and videos under <strong>Manage Media</strong> first. This screen only links
        an existing photo (print target) to a video. Publish each mapping, then publish the album so
        the AR scan file builds before you print the QR.
      </Paragraph>

      <Alert
        className="!mb-4 max-w-2xl"
        type="info"
        showIcon
        message="Workflow"
        description={
          <ol className="mb-0 list-decimal pl-4">
            <li>Album → Manage Media — upload photo(s) and video(s) until status is ready.</li>
            <li>Create mapping here — pick photo + video + name (saved as draft).</li>
            <li>AR Mappings list — Publish each mapping, then publish the album.</li>
            <li>Wait for the AR scan file / QR on the album page, then share or print the QR.</li>
          </ol>
        }
      />

      {needsUpload ? (
        <Alert
          className="!mb-4 max-w-2xl"
          type="warning"
          showIcon
          message="Upload media before mapping"
          description={
            readyPhotos.length === 0 && readyVideos.length === 0
              ? 'No ready photos or videos in this album yet.'
              : readyPhotos.length === 0
                ? 'Add at least one ready photo.'
                : 'Add at least one ready video.'
          }
          action={
            <Button
              size="small"
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => navigate(mediaRoute)}
            >
              Manage Media
            </Button>
          }
        />
      ) : null}

      <Card className="max-w-xl">
        <MappingForm
          photos={readyMedia}
          videos={readyMedia}
          loading={createMutation.isPending}
          submitLabel="Create Mapping"
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
        />
      </Card>
    </div>
  );
};
