import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { GuestRoute } from '@/components/GuestRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { StudiosListPage } from '@/pages/admin/StudiosListPage';
import { CreateStudioPage } from '@/pages/admin/CreateStudioPage';
import { EditStudioPage } from '@/pages/admin/EditStudioPage';
import { StudioDetailsPage } from '@/pages/admin/StudioDetailsPage';
import { AlbumsListPage } from '@/pages/studio/AlbumsListPage';
import { CreateAlbumPage } from '@/pages/studio/CreateAlbumPage';
import { EditAlbumPage } from '@/pages/studio/EditAlbumPage';
import { AlbumDetailsPage } from '@/pages/studio/AlbumDetailsPage';
import { AlbumMediaPage } from '@/pages/studio/AlbumMediaPage';
import { ArMappingsPage } from '@/pages/studio/ArMappingsPage';
import { CreateMappingPage } from '@/pages/studio/CreateMappingPage';
import { EditMappingPage } from '@/pages/studio/EditMappingPage';
import { AlbumInsightsPage } from '@/pages/studio/AlbumInsightsPage';
import { AdminCatalogPage } from '@/pages/admin/AdminCatalogPage';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';
import { LandingPage } from '@/pages/LandingPage';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRole.STUDIO_ADMIN]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route
              path={ROUTES.STUDIO_PROFILE}
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route path={ROUTES.STUDIO_PLAN} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            <Route
              path={ROUTES.STUDIO_PACKS}
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route path={ROUTES.ALBUMS} element={<AlbumsListPage />} />
            <Route path={ROUTES.ALBUM_CREATE} element={<CreateAlbumPage />} />
            <Route path={ROUTES.ALBUM_EDIT} element={<EditAlbumPage />} />
            <Route path={ROUTES.ALBUM_DETAILS} element={<AlbumDetailsPage />} />
            <Route path={ROUTES.ALBUM_MEDIA} element={<AlbumMediaPage />} />
            <Route path={ROUTES.ALBUM_AR_MAPPINGS} element={<ArMappingsPage />} />
            <Route path={ROUTES.ALBUM_AR_MAPPING_CREATE} element={<CreateMappingPage />} />
            <Route path={ROUTES.ALBUM_AR_MAPPING_EDIT} element={<EditMappingPage />} />
            <Route
              path={ROUTES.STUDIO_ANALYTICS}
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route
              path={ROUTES.STUDIO_ANALYTICS_REPORTS}
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route path={ROUTES.ALBUM_INSIGHTS} element={<AlbumInsightsPage />} />
            <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={ROUTES.STUDIOS} element={<StudiosListPage />} />
            <Route path={ROUTES.STUDIO_CREATE} element={<CreateStudioPage />} />
            <Route path={ROUTES.STUDIO_EDIT} element={<EditStudioPage />} />
            <Route path={ROUTES.STUDIO_DETAILS} element={<StudioDetailsPage />} />
            <Route path={ROUTES.CATALOG} element={<AdminCatalogPage />} />
            <Route path={ROUTES.PACKS} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route
              path={ROUTES.PACK_LEDGER}
              element={<Navigate to={`${ROUTES.CATALOG}?tab=history`} replace />}
            />
            <Route path={ROUTES.PLANS} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route path={ROUTES.PLAN_CREATE} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route path={ROUTES.PLAN_EDIT} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route path={ROUTES.PLAN_DETAILS} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route path={ROUTES.SUBSCRIPTIONS} element={<Navigate to={ROUTES.CATALOG} replace />} />
            <Route
              path={ROUTES.SUBSCRIPTION_DETAILS}
              element={<Navigate to={ROUTES.CATALOG} replace />}
            />
          </Route>
        </Route>

        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
