import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/routes/paths';

export const GuestRoute = () => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingSpinner fullScreen tip="Initializing session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
};
