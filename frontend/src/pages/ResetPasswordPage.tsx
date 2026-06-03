import { Link, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useResetPasswordMutation } from '@/hooks/useAuthQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas';

const { Paragraph } = Typography;

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetMutation = useResetPasswordMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div>
        <Alert
          message="Invalid reset link"
          description="This password reset link is invalid or has expired."
          type="error"
          showIcon
          className="mb-4"
        />
        <Link to={ROUTES.FORGOT_PASSWORD}>
          <Button type="primary">Request a new link</Button>
        </Link>
      </div>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">Password updated</h1>
        <Paragraph type="secondary">Your password has been reset successfully.</Paragraph>
        <Link to={ROUTES.LOGIN}>
          <Button type="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit((values) =>
        resetMutation.mutate({ token, password: values.password }),
      )}
      requiredMark={false}
    >
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Reset password</h1>
      <Paragraph type="secondary" className="!mb-6">
        Enter your new password below.
      </Paragraph>

      {resetMutation.isError ? (
        <Alert
          message={getErrorMessage(resetMutation.error, 'Unable to reset password')}
          type="error"
          showIcon
          className="mb-4"
        />
      ) : null}

      <Form.Item
        label="New password"
        validateStatus={errors.password ? 'error' : ''}
        help={errors.password?.message}
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password {...field} size="large" placeholder="Enter new password" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Confirm password"
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

      <Button type="primary" htmlType="submit" size="large" block loading={resetMutation.isPending}>
        Reset password
      </Button>
    </Form>
  );
};
