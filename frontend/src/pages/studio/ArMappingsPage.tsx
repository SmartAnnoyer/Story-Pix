import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import {
  useAlbumArTargetsQuery,
  useArchiveArTargetMutation,
  useDeleteArTargetMutation,
  usePublishArTargetMutation,
} from '@/hooks/useArTargetQueries';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { MappingTable } from '@/features/ar/components/MappingTable';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import { albumSharePath } from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

const { Title, Paragraph } = Typography;

export const ArMappingsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data, isLoading, refetch } = useAlbumArTargetsQuery(id, { limit: 100 });
  const publishMutation = usePublishArTargetMutation();
  const archiveMutation = useArchiveArTargetMutation();
  const deleteMutation = useDeleteArTargetMutation();

  if (albumLoading || !album) return <LoadingSpinner />;

  if (!isLoading && (data?.items.length ?? 0) === 0) {
    return <Navigate to={ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id)} replace />;
  }

  const handlePublish = async (mappingId: string) => {
    try {
      await publishMutation.mutateAsync(mappingId);
      message.success('This photo is now live for guests');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not turn on'));
    }
  };

  const handleArchive = async (mappingId: string) => {
    try {
      await archiveMutation.mutateAsync(mappingId);
      message.success('Turned off');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not turn off'));
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await deleteMutation.mutateAsync(mappingId);
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
        Each row is one printed photo and the video that plays when a guest scans it.
      </Paragraph>

      <AlbumDeliveryGuide albumId={id} current="map" />

      <div className="mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
        >
          Map another photo
        </Button>
      </div>

      <Card>
        <MappingTable
          items={data?.items ?? []}
          loading={isLoading}
          onEdit={(mappingId) =>
            navigate(
              ROUTES.ALBUM_AR_MAPPING_EDIT.replace(':id', id).replace(':mappingId', mappingId),
            )
          }
          onDelete={handleDelete}
          onPublish={handlePublish}
          onArchive={handleArchive}
        />
      </Card>
    </div>
  );
};
