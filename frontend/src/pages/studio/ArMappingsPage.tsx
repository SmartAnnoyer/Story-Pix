import { useNavigate, useParams } from 'react-router-dom';
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

  const handlePublish = async (mappingId: string) => {
    try {
      await publishMutation.mutateAsync(mappingId);
      message.success('Mapping published');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Publish failed'));
    }
  };

  const handleArchive = async (mappingId: string) => {
    try {
      await archiveMutation.mutateAsync(mappingId);
      message.success('Mapping archived');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Archive failed'));
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await deleteMutation.mutateAsync(mappingId);
      message.success('Mapping deleted');
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
            {album.albumName} — AR Mappings
          </Title>
          <Paragraph type="secondary">
            Link printed photos to videos for the public WebAR viewer.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
        >
          Create Mapping
        </Button>
      </div>

      <Card>
        <MappingTable
          items={data?.items ?? []}
          loading={isLoading}
          onEdit={(mappingId) =>
            navigate(ROUTES.ALBUM_AR_MAPPING_EDIT.replace(':id', id).replace(':mappingId', mappingId))
          }
          onDelete={handleDelete}
          onPublish={handlePublish}
          onArchive={handleArchive}
        />
      </Card>
    </div>
  );
};
