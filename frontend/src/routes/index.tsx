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
import { StudioProfilePage } from '@/pages/studio/StudioProfilePage';
import { CurrentPlanPage } from '@/pages/studio/CurrentPlanPage';
import { BillingDashboardPage } from '@/pages/studio/BillingDashboardPage';
import { AlbumsListPage } from '@/pages/studio/AlbumsListPage';
import { CreateAlbumPage } from '@/pages/studio/CreateAlbumPage';
import { EditAlbumPage } from '@/pages/studio/EditAlbumPage';
import { AlbumDetailsPage } from '@/pages/studio/AlbumDetailsPage';
import { AlbumMediaPage } from '@/pages/studio/AlbumMediaPage';
import { ArMappingsPage } from '@/pages/studio/ArMappingsPage';
import { CreateMappingPage } from '@/pages/studio/CreateMappingPage';
import { EditMappingPage } from '@/pages/studio/EditMappingPage';
import { StudioAnalyticsPage } from '@/pages/studio/StudioAnalyticsPage';
import { StudioReportsPage } from '@/pages/studio/StudioReportsPage';
import { AlbumInsightsPage } from '@/pages/studio/AlbumInsightsPage';
import { ViewerPage } from '@/pages/viewer/ViewerPage';
import { ViewerLayout } from '@/layouts/ViewerLayout';
import { PlansListPage } from '@/pages/admin/PlansListPage';
import { CreatePlanPage } from '@/pages/admin/CreatePlanPage';
import { EditPlanPage } from '@/pages/admin/EditPlanPage';
import { PlanDetailsPage } from '@/pages/admin/PlanDetailsPage';
import { SubscriptionsListPage } from '@/pages/admin/SubscriptionsListPage';
import { SubscriptionDetailsPage } from '@/pages/admin/SubscriptionDetailsPage';
import { PlatformAnalyticsPage } from '@/pages/admin/PlatformAnalyticsPage';
import { PlatformReportsPage } from '@/pages/admin/PlatformReportsPage';
import { RevenueDashboardPage } from '@/pages/admin/RevenueDashboardPage';
import { AdminPaymentsListPage } from '@/pages/admin/AdminPaymentsListPage';
import { AdminInvoicesListPage } from '@/pages/admin/AdminInvoicesListPage';
import { SubscriptionRevenuePage } from '@/pages/admin/SubscriptionRevenuePage';
import { JobMonitoringPage } from '@/pages/admin/JobMonitoringPage';
import { AdminNotificationMonitoringPage } from '@/pages/admin/AdminNotificationMonitoringPage';
import { NotificationCenterPage } from '@/pages/studio/NotificationCenterPage';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';
import { HomeRedirect } from '@/components/HomeRedirect';

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
          <Route path={ROUTES.STUDIO_PROFILE} element={<StudioProfilePage />} />
          <Route path={ROUTES.STUDIO_PLAN} element={<CurrentPlanPage />} />
          <Route path={ROUTES.STUDIO_BILLING} element={<BillingDashboardPage />} />
          <Route path={ROUTES.ALBUMS} element={<AlbumsListPage />} />
          <Route path={ROUTES.ALBUM_CREATE} element={<CreateAlbumPage />} />
          <Route path={ROUTES.ALBUM_EDIT} element={<EditAlbumPage />} />
          <Route path={ROUTES.ALBUM_DETAILS} element={<AlbumDetailsPage />} />
          <Route path={ROUTES.ALBUM_MEDIA} element={<AlbumMediaPage />} />
          <Route path={ROUTES.ALBUM_AR_MAPPINGS} element={<ArMappingsPage />} />
          <Route path={ROUTES.ALBUM_AR_MAPPING_CREATE} element={<CreateMappingPage />} />
          <Route path={ROUTES.ALBUM_AR_MAPPING_EDIT} element={<EditMappingPage />} />
          <Route path={ROUTES.STUDIO_ANALYTICS} element={<StudioAnalyticsPage />} />
          <Route path={ROUTES.STUDIO_ANALYTICS_REPORTS} element={<StudioReportsPage />} />
          <Route path={ROUTES.ALBUM_INSIGHTS} element={<AlbumInsightsPage />} />
          <Route path={ROUTES.NOTIFICATIONS} element={<NotificationCenterPage />} />
        </Route>
      </Route>

      <Route element={<ViewerLayout />}>
        <Route path={ROUTES.VIEWER} element={<ViewerPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
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
          <Route path={ROUTES.PLANS} element={<PlansListPage />} />
          <Route path={ROUTES.PLAN_CREATE} element={<CreatePlanPage />} />
          <Route path={ROUTES.PLAN_EDIT} element={<EditPlanPage />} />
          <Route path={ROUTES.PLAN_DETAILS} element={<PlanDetailsPage />} />
          <Route path={ROUTES.SUBSCRIPTIONS} element={<SubscriptionsListPage />} />
          <Route path={ROUTES.SUBSCRIPTION_DETAILS} element={<SubscriptionDetailsPage />} />
          <Route path={ROUTES.ADMIN_ANALYTICS} element={<PlatformAnalyticsPage />} />
          <Route path={ROUTES.ADMIN_ANALYTICS_REPORTS} element={<PlatformReportsPage />} />
          <Route path={ROUTES.ADMIN_BILLING} element={<RevenueDashboardPage />} />
          <Route path={ROUTES.ADMIN_BILLING_PAYMENTS} element={<AdminPaymentsListPage />} />
          <Route path={ROUTES.ADMIN_BILLING_INVOICES} element={<AdminInvoicesListPage />} />
          <Route path={ROUTES.ADMIN_BILLING_SUBSCRIPTIONS} element={<SubscriptionRevenuePage />} />
          <Route path={ROUTES.ADMIN_JOBS} element={<JobMonitoringPage />} />
          <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotificationMonitoringPage />} />
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
