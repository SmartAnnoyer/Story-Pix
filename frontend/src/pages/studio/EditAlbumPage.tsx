import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { AlbumForm } from '@/features/albums/components/AlbumForm';
import { useAlbumQuery, useUpdateAlbumMutation } from '@/hooks/useAlbumQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import type { UpdateAlbumPayload } from '@/types/album.types';

const { Title, Paragraph } = Typography;

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
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="!px-0"
        onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', id))}
      >
        Back to album
      </Button>
      <Title level={3} className="!mb-2">
        Edit album
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Change the album or client name. Photos and videos stay as they are.
      </Paragraph>
      <Card>
        <AlbumForm
          mode="edit"
          initialValues={{
            albumName: album.albumName,
            customerName: album.customerName,
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </Card>
    </div>
  );
};
