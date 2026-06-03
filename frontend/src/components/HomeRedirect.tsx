import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';

export const HomeRedirect = () => {
  const { user, isInitialized, isAuthenticated } = useAuthStore();

  if (!isInitialized) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  return <Navigate to={ROUTES.DASHBOARD} replace />;
};
