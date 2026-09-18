import { useNavigate } from 'react-router-dom';
import { Alert, Card, Typography, message } from 'antd';
import { StudioForm } from '@/features/studios/components/StudioForm';
import { useCreateStudioMutation } from '@/hooks/useStudioQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import type { CreateStudioPayload } from '@/types/studio.types';

const { Title, Paragraph } = Typography;

export const CreateStudioPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateStudioMutation();

  const handleSubmit = async (values: CreateStudioPayload) => {
    try {
      const result = await createMutation.mutateAsync(values);
      message.success(`Studio created. Admin can sign in as ${result.admin.email}`);
      navigate(ROUTES.STUDIO_DETAILS.replace(':id', result.studio.id));
    } catch {
      // error handled below
    }
  };

  return (
    <div>
      <Title level={3} className="!mb-1">
        Create Studio
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Creates the studio and a login for the studio admin.
      </Paragraph>

      <Card className="max-w-4xl">
        <Alert
          type="info"
          showIcon
          className="mb-6"
          message="Owner name becomes the admin display name"
          description="Set the admin email and password they will use to sign in. Assign album packs from Catalog after setup."
        />
        <StudioForm
          mode="create"
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          errorMessage={
            createMutation.isError
              ? getErrorMessage(createMutation.error, 'Unable to create studio')
              : undefined
          }
        />
      </Card>
    </div>
  );
};
