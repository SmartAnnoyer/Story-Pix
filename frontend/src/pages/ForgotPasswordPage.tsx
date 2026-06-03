import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useForgotPasswordMutation } from '@/hooks/useAuthQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas';

const { Paragraph } = Typography;

export const ForgotPasswordPage = () => {
  const forgotMutation = useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (forgotMutation.isSuccess) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">Check your email</h1>
        <Paragraph type="secondary">
          If an account exists for that email, password reset instructions have been sent.
        </Paragraph>
        <Link to={ROUTES.LOGIN}>
          <Button type="link" className="!px-0">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit((v) => forgotMutation.mutate(v))} requiredMark={false}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Forgot password</h1>
      <Paragraph type="secondary" className="!mb-6">
        Enter your email and we&apos;ll send reset instructions.
      </Paragraph>

      {forgotMutation.isError ? (
        <Alert
          message={getErrorMessage(forgotMutation.error, 'Unable to process request')}
          type="error"
          showIcon
          className="mb-4"
        />
      ) : null}

      <Form.Item
        label="Email"
        validateStatus={errors.email ? 'error' : ''}
        help={errors.email?.message}
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} size="large" placeholder="you@studio.com" />}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" size="large" block loading={forgotMutation.isPending}>
        Send reset link
      </Button>

      <div className="mt-4 text-center">
        <Link to={ROUTES.LOGIN} className="text-sm text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </div>
    </Form>
  );
};
