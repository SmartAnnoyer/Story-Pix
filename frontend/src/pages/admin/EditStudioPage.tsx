import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, message } from 'antd';
import { StudioForm } from '@/features/studios/components/StudioForm';
import { useStudioQuery, useUpdateStudioMutation } from '@/hooks/useStudioQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UpdateStudioPayload } from '@/types/studio.types';

const { Title } = Typography;

export const EditStudioPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: studio, isLoading } = useStudioQuery(id);
  const updateMutation = useUpdateStudioMutation(id);

  if (isLoading || !studio) return <LoadingSpinner />;

  const handleSubmit = async (values: UpdateStudioPayload) => {
    try {
      await updateMutation.mutateAsync(values);
      message.success('Studio updated');
      navigate(ROUTES.STUDIO_DETAILS.replace(':id', id));
    } catch {
      // error below
    }
  };

  return (
    <div>
      <Title level={3} className="!mb-6">
        Edit Studio
      </Title>
      <Card className="max-w-4xl">
        <StudioForm
          mode="edit"
          initialValues={{
            studioName: studio.studioName,
            ownerName: studio.ownerName,
            email: studio.email,
            phone: studio.phone ?? '',
            address: studio.address ?? '',
            website: studio.website ?? '',
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          errorMessage={
            updateMutation.isError
              ? getErrorMessage(updateMutation.error, 'Unable to update studio')
              : undefined
          }
        />
      </Card>
    </div>
  );
};
