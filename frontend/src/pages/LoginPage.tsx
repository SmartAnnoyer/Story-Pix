import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useLoginMutation } from '@/hooks/useAuthQueries';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    ROUTES.DASHBOARD;

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const result = await loginMutation.mutateAsync(values);
      const destination =
        result.user.role === UserRole.SUPER_ADMIN ? ROUTES.ADMIN_DASHBOARD : from;
      navigate(destination, { replace: true });
    } catch {
      // error surfaced via mutation state
    }
  };

  return (
    <LoginForm
      onSubmit={handleSubmit}
      errorMessage={
        loginMutation.isError
          ? getErrorMessage(loginMutation.error, 'Unable to sign in')
          : undefined
      }
      isSubmitting={loginMutation.isPending}
    />
  );
};
