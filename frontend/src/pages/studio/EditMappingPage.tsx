import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { MappingForm } from '@/features/ar/components/MappingForm';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useArTargetQuery, useUpdateArTargetMutation } from '@/hooks/useArTargetQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ArTargetStatus } from '@/types/ar-target.types';
import { MediaStatus } from '@/types/media.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

const { Title } = Typography;

export const EditMappingPage = () => {
  const { id = '', mappingId = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: mapping, isLoading: mappingLoading } = useArTargetQuery(mappingId);
  const { data: mediaData, isLoading: mediaLoading } = useAlbumMediaQuery(id, { limit: 100 });
  const updateMutation = useUpdateArTargetMutation();

  const readyMedia = useMemo(
    () => (mediaData?.items ?? []).filter((item) => item.status === MediaStatus.READY),
    [mediaData],
  );

  if (albumLoading || mappingLoading || mediaLoading || !album || !mapping) {
    return <LoadingSpinner />;
  }

  if (mapping.status !== ArTargetStatus.DRAFT) {
    return (
      <Card>
        <Title level={4}>This mapping cannot be edited</Title>
        <Button onClick={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}>
          Back to mappings
        </Button>
      </Card>
    );
  }

  const handleSubmit = async (values: { targetName: string; photoMediaId: string; videoMediaId: string }) => {
    try {
      await updateMutation.mutateAsync({ id: mappingId, payload: values });
      message.success('Mapping updated');
      navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Update failed'));
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
      <Title level={3} className="!mb-4">
        Edit AR Mapping
      </Title>
      <Card className="max-w-xl">
        <MappingForm
          photos={readyMedia}
          videos={readyMedia}
          initialValues={{
            targetName: mapping.targetName,
            photoMediaId: mapping.photoMediaId,
            videoMediaId: mapping.videoMediaId,
          }}
          loading={updateMutation.isPending}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
        />
      </Card>
    </div>
  );
};
