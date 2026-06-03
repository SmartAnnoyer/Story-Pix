import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, message } from 'antd';
import { AlbumForm } from '@/features/albums/components/AlbumForm';
import { useAlbumQuery, useUpdateAlbumMutation } from '@/hooks/useAlbumQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import type { UpdateAlbumPayload } from '@/types/album.types';

const { Title } = Typography;

export const EditAlbumPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading } = useAlbumQuery(id);
  const updateMutation = useUpdateAlbumMutation(id);

  if (isLoading || !album) return <LoadingSpinner />;

  const handleSubmit = async (values: UpdateAlbumPayload) => {
    try {
      await updateMutation.mutateAsync(values);
      message.success('Album updated');
      navigate(ROUTES.ALBUM_DETAILS.replace(':id', id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Unable to update album'));
    }
  };

  return (
    <div>
      <Title level={3} className="!mb-6">
        Edit Album
      </Title>
      <Card>
        <AlbumForm
          mode="edit"
          initialValues={{
            albumName: album.albumName,
            eventType: album.eventType,
            customerName: album.customerName,
            customerPhone: album.customerPhone ?? '',
            customerEmail: album.customerEmail ?? '',
            eventDate: album.eventDate.split('T')[0],
            coverImage: album.coverImage ?? '',
            description: album.description ?? '',
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </Card>
    </div>
  );
};
