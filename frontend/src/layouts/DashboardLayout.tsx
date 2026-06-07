import { useMemo, useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, theme, Drawer, Grid } from 'antd';
import { BrandLogo } from '@/components/BrandLogo';
import {
  BarChartOutlined,
  BellOutlined,
  CloseOutlined,
  DashboardOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CrownOutlined,
  CreditCardOutlined,
  DollarOutlined,
  PictureOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useLogoutMutation } from '@/hooks/useAuthQueries';
import { useUnreadNotificationsQuery, useMarkNotificationReadMutation } from '@/hooks/useNotificationQueries';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export const DashboardLayout = () => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const { data: unreadNotifications = [] } = useUnreadNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const closeMobileNav = () => setMobileNavOpen(false);

  const goTo = (path: string) => {
    navigate(path);
    closeMobileNav();
  };

  const menuItems: MenuProps['items'] = useMemo(() => {
    if (isSuperAdmin) {
      return [
        {
          key: ROUTES.ADMIN_DASHBOARD,
          icon: <DashboardOutlined />,
          label: 'Dashboard',
          onClick: () => goTo(ROUTES.ADMIN_DASHBOARD),
        },
        {
          key: ROUTES.STUDIOS,
          icon: <TeamOutlined />,
          label: 'Studios',
          onClick: () => goTo(ROUTES.STUDIOS),
        },
        {
          key: ROUTES.PLANS,
          icon: <CrownOutlined />,
          label: 'Plans',
          onClick: () => goTo(ROUTES.PLANS),
        },
        {
          key: ROUTES.SUBSCRIPTIONS,
          icon: <CrownOutlined />,
          label: 'Subscriptions',
          onClick: () => goTo(ROUTES.SUBSCRIPTIONS),
        },
        {
          key: ROUTES.ADMIN_BILLING,
          icon: <DollarOutlined />,
          label: 'Billing',
          onClick: () => goTo(ROUTES.ADMIN_BILLING),
        },
        {
          key: ROUTES.ADMIN_JOBS,
          icon: <BellOutlined />,
          label: 'Jobs',
          onClick: () => goTo(ROUTES.ADMIN_JOBS),
        },
        {
          key: ROUTES.ADMIN_NOTIFICATIONS,
          icon: <BellOutlined />,
          label: 'Notifications',
          onClick: () => goTo(ROUTES.ADMIN_NOTIFICATIONS),
        },
        {
          key: ROUTES.ADMIN_ANALYTICS,
          icon: <BarChartOutlined />,
          label: 'Analytics',
          onClick: () => goTo(ROUTES.ADMIN_ANALYTICS),
        },
        {
          key: ROUTES.CHANGE_PASSWORD,
          icon: <LockOutlined />,
          label: 'Change Password',
          onClick: () => goTo(ROUTES.CHANGE_PASSWORD),
        },
      ];
    }

    return [
      {
        key: ROUTES.DASHBOARD,
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: () => goTo(ROUTES.DASHBOARD),
      },
      {
        key: ROUTES.STUDIO_PROFILE,
        icon: <ShopOutlined />,
        label: 'Studio Profile',
        onClick: () => goTo(ROUTES.STUDIO_PROFILE),
      },
      {
        key: ROUTES.STUDIO_BILLING,
        icon: <CreditCardOutlined />,
        label: 'Billing',
        onClick: () => goTo(ROUTES.STUDIO_BILLING),
      },
      {
        key: ROUTES.STUDIO_PLAN,
        icon: <CrownOutlined />,
        label: 'Plan & Usage',
        onClick: () => goTo(ROUTES.STUDIO_PLAN),
      },
      {
        key: ROUTES.ALBUMS,
        icon: <PictureOutlined />,
        label: 'Albums',
        onClick: () => goTo(ROUTES.ALBUMS),
      },
      {
        key: ROUTES.STUDIO_ANALYTICS,
        icon: <BarChartOutlined />,
        label: 'Analytics',
        onClick: () => goTo(ROUTES.STUDIO_ANALYTICS),
      },
      {
        key: ROUTES.NOTIFICATIONS,
        icon: <BellOutlined />,
        label: 'Notifications',
        onClick: () => goTo(ROUTES.NOTIFICATIONS),
      },
      {
        key: ROUTES.CHANGE_PASSWORD,
        icon: <LockOutlined />,
        label: 'Change Password',
        onClick: () => goTo(ROUTES.CHANGE_PASSWORD),
      },
    ];
  }, [isSuperAdmin, navigate]);

  const selectedKey = menuItems?.find(
    (item) => item && 'key' in item && location.pathname.startsWith(String(item.key)),
  )?.key as string | undefined;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      closeMobileNav();
      navigate(ROUTES.LOGIN);
    }
  };

  const navMenu = (
    <Menu mode="inline" selectedKeys={selectedKey ? [selectedKey] : []} items={menuItems} />
  );

  const brandHeader = (showClose: boolean) => (
    <div className="flex h-16 items-center justify-between px-3">
      <BrandLogo variant="full" height={32} />
      {showClose ? (
        <Button
          type="text"
          aria-label="Close menu"
          icon={<CloseOutlined />}
          onClick={closeMobileNav}
        />
      ) : null}
    </div>
  );

  return (
    <Layout className="min-h-screen">
      {!isMobile ? (
        <Sider
          trigger={null}
          collapsible
          collapsed={desktopCollapsed}
          collapsedWidth={64}
          width={200}
          className="!fixed bottom-0 left-0 top-0 z-20 h-screen overflow-auto"
          style={{ background: token.colorBgContainer }}
        >
          <div className="flex h-16 items-center justify-center px-3">
            {desktopCollapsed ? (
              <BrandLogo variant="mark" height={32} />
            ) : (
              <BrandLogo variant="full" height={32} />
            )}
          </div>
          {navMenu}
        </Sider>
      ) : (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          onClose={closeMobileNav}
          open={mobileNavOpen}
          width={260}
          styles={{ body: { padding: 0 } }}
        >
          {brandHeader(true)}
          {navMenu}
        </Drawer>
      )}

      <Layout
        className={`transition-all ${!isMobile && !desktopCollapsed ? 'lg:ml-[200px]' : !isMobile ? 'lg:ml-[64px]' : ''}`}
      >
        <Header
          className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 sm:px-6"
          style={{ background: token.colorBgContainer }}
        >
          <Button
            type="text"
            aria-label={isMobile ? 'Open menu' : desktopCollapsed ? 'Expand menu' : 'Collapse menu'}
            icon={
              isMobile ? (
                mobileNavOpen ? (
                  <CloseOutlined />
                ) : (
                  <MenuUnfoldOutlined />
                )
              ) : desktopCollapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() => {
              if (isMobile) {
                setMobileNavOpen((open) => !open);
              } else {
                setDesktopCollapsed((collapsed) => !collapsed);
              }
            }}
          />

          <div className="ml-auto flex items-center gap-3">
            {!isSuperAdmin ? (
              <NotificationBell onClick={() => setDrawerOpen(true)} />
            ) : null}
            <Text className="hidden sm:inline">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </Text>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Logout',
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Avatar icon={<UserOutlined />} className="cursor-pointer" />
            </Dropdown>
          </div>
        </Header>

        <Content className="m-4 min-h-[280px] rounded-lg bg-white p-4 sm:m-6 sm:p-6">
          <Outlet />
        </Content>
      </Layout>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={unreadNotifications}
        onMarkRead={(id) => markReadMutation.mutate(id)}
      />
    </Layout>
  );
};
