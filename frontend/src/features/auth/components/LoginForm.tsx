import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/paths';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth.schemas';

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  errorMessage?: string;
  isSubmitting?: boolean;
}

export const LoginForm = ({ onSubmit, errorMessage, isSubmitting }: LoginFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} requiredMark={false}>
      <h1 className="mb-1 text-[1.65rem] font-bold tracking-tight text-gray-900">Sign in</h1>
      <p className="mb-6 text-sm text-gray-500">Studio or admin — use your email.</p>

      {errorMessage ? (
        <Alert message={errorMessage} type="error" showIcon className="mb-4" />
      ) : null}

      <Form.Item
        label="Email"
        validateStatus={errors.email ? 'error' : ''}
        help={errors.email?.message}
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              size="large"
              inputMode="email"
              autoComplete="email"
              placeholder="you@studio.com"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Password"
        validateStatus={errors.password ? 'error' : ''}
        help={errors.password?.message}
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              size="large"
              autoComplete="current-password"
              placeholder="Password"
            />
          )}
        />
      </Form.Item>

      <div className="mb-5 text-right">
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
        Continue
      </Button>
    </Form>
  );
};

export type { LoginFormValues };
