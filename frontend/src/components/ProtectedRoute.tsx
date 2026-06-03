import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  if (!isInitialized) {
    return <LoadingSpinner fullScreen tip="Initializing session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};
