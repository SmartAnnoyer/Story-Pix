import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useChangePasswordMutation } from '@/hooks/useAuthQueries';
import { getErrorMessage } from '@/api/client';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/auth.schemas';

const { Title, Paragraph } = Typography;

export const ChangePasswordPage = () => {
  const changeMutation = useChangePasswordMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changeMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password changed successfully');
      reset();
    } catch {
      // error shown via mutation state
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Title level={3} className="!mb-1">
        Change Password
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Update your account password. You will remain signed in after changing it.
      </Paragraph>

      <Card>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} requiredMark={false}>
          {changeMutation.isError ? (
            <Alert
              message={getErrorMessage(changeMutation.error, 'Unable to change password')}
              type="error"
              showIcon
              className="mb-4"
            />
          ) : null}

          <Form.Item
            label="Current password"
            validateStatus={errors.currentPassword ? 'error' : ''}
            help={errors.currentPassword?.message}
          >
            <Controller
              name="currentPassword"
              control={control}
              render={({ field }) => (
                <Input.Password {...field} size="large" placeholder="Current password" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="New password"
            validateStatus={errors.newPassword ? 'error' : ''}
            help={errors.newPassword?.message}
          >
            <Controller
              name="newPassword"
              control={control}
              render={({ field }) => (
                <Input.Password {...field} size="large" placeholder="New password" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Confirm new password"
            validateStatus={errors.confirmPassword ? 'error' : ''}
            help={errors.confirmPassword?.message}
          >
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <Input.Password {...field} size="large" placeholder="Confirm new password" />
              )}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={changeMutation.isPending}>
            Update password
          </Button>
        </Form>
      </Card>
    </div>
  );
};
