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
      message.success('Studio created successfully');
      message.info(`Temporary admin password: ${result.admin.temporaryPassword}`, 10);
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
        A Studio Admin account and trial plan will be created automatically.
      </Paragraph>

      <Card className="max-w-4xl">
        <Alert
          type="info"
          showIcon
          className="mb-6"
          message="Auto setup includes trial plan assignment and admin account creation."
          description="Welcome emails need a verified Resend domain. Until then, open the studio details page anytime to copy the admin login email and temporary password (while unchanged)."
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
