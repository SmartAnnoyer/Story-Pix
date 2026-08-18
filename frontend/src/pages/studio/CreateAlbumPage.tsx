import { useNavigate } from 'react-router-dom';
import { Card, Typography, message } from 'antd';
import { AlbumForm } from '@/features/albums/components/AlbumForm';
import { useCreateAlbumMutation } from '@/hooks/useAlbumQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import type { CreateAlbumPayload } from '@/types/album.types';

const { Title, Paragraph } = Typography;

export const CreateAlbumPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAlbumMutation();

  const handleSubmit = async (values: CreateAlbumPayload) => {
    try {
      const album = await createMutation.mutateAsync(values);
      if (!album?.id) {
        message.warning(
          'Album created, but the response was missing an id. Open it from the albums list.',
        );
        navigate(ROUTES.ALBUMS);
        return;
      }
      message.success('Album created. Now add the printed photo and the video.');
      navigate(ROUTES.ALBUM_MEDIA.replace(':id', album.id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Unable to create album'));
    }
  };

  return (
    <div>
      <Title level={3} className="!mb-1">
        New album
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Name the event and the client. Next you will add a photo and a video.
      </Paragraph>
      <Card>
        <AlbumForm mode="create" onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
      </Card>
    </div>
  );
};
