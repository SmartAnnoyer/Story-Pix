import { useMemo, useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, theme } from 'antd';
import { BrandLogo } from '@/components/BrandLogo';
import {
  BarChartOutlined,
  BellOutlined,
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

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const { token } = theme.useToken();
  const { data: unreadNotifications = [] } = useUnreadNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const menuItems = useMemo(() => {
    if (isSuperAdmin) {
      return [
        {
          key: ROUTES.ADMIN_DASHBOARD,
          icon: <DashboardOutlined />,
          label: 'Dashboard',
          onClick: () => navigate(ROUTES.ADMIN_DASHBOARD),
        },
        {
          key: ROUTES.STUDIOS,
          icon: <TeamOutlined />,
          label: 'Studios',
          onClick: () => navigate(ROUTES.STUDIOS),
        },
        {
          key: ROUTES.PLANS,
          icon: <CrownOutlined />,
          label: 'Plans',
          onClick: () => navigate(ROUTES.PLANS),
        },
        {
          key: ROUTES.SUBSCRIPTIONS,
          icon: <CrownOutlined />,
          label: 'Subscriptions',
          onClick: () => navigate(ROUTES.SUBSCRIPTIONS),
        },
        {
          key: ROUTES.ADMIN_BILLING,
          icon: <DollarOutlined />,
          label: 'Billing',
          onClick: () => navigate(ROUTES.ADMIN_BILLING),
        },
        {
          key: ROUTES.ADMIN_JOBS,
          icon: <BellOutlined />,
          label: 'Jobs',
          onClick: () => navigate(ROUTES.ADMIN_JOBS),
        },
        {
          key: ROUTES.ADMIN_NOTIFICATIONS,
          icon: <BellOutlined />,
          label: 'Notifications',
          onClick: () => navigate(ROUTES.ADMIN_NOTIFICATIONS),
        },
        {
          key: ROUTES.ADMIN_ANALYTICS,
          icon: <BarChartOutlined />,
          label: 'Analytics',
          onClick: () => navigate(ROUTES.ADMIN_ANALYTICS),
        },
        {
          key: ROUTES.CHANGE_PASSWORD,
          icon: <LockOutlined />,
          label: 'Change Password',
          onClick: () => navigate(ROUTES.CHANGE_PASSWORD),
        },
      ];
    }

    return [
      {
        key: ROUTES.DASHBOARD,
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: () => navigate(ROUTES.DASHBOARD),
      },
      {
        key: ROUTES.STUDIO_PROFILE,
        icon: <ShopOutlined />,
        label: 'Studio Profile',
        onClick: () => navigate(ROUTES.STUDIO_PROFILE),
      },
      {
        key: ROUTES.STUDIO_BILLING,
        icon: <CreditCardOutlined />,
        label: 'Billing',
        onClick: () => navigate(ROUTES.STUDIO_BILLING),
      },
      {
        key: ROUTES.STUDIO_PLAN,
        icon: <CrownOutlined />,
        label: 'Plan & Usage',
        onClick: () => navigate(ROUTES.STUDIO_PLAN),
      },
      {
        key: ROUTES.ALBUMS,
        icon: <PictureOutlined />,
        label: 'Albums',
        onClick: () => navigate(ROUTES.ALBUMS),
      },
      {
        key: ROUTES.STUDIO_ANALYTICS,
        icon: <BarChartOutlined />,
        label: 'Analytics',
        onClick: () => navigate(ROUTES.STUDIO_ANALYTICS),
      },
      {
        key: ROUTES.NOTIFICATIONS,
        icon: <BellOutlined />,
        label: 'Notifications',
        onClick: () => navigate(ROUTES.NOTIFICATIONS),
      },
      {
        key: ROUTES.CHANGE_PASSWORD,
        icon: <LockOutlined />,
        label: 'Change Password',
        onClick: () => navigate(ROUTES.CHANGE_PASSWORD),
      },
    ];
  }, [isSuperAdmin, navigate]);

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={0}
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        className="!fixed bottom-0 left-0 top-0 z-20 h-screen overflow-auto"
        style={{ background: token.colorBgContainer }}
      >
        <div className="flex h-16 items-center justify-center px-3">
          {collapsed ? (
            <BrandLogo variant="mark" height={32} />
          ) : (
            <BrandLogo variant="full" height={32} />
          )}
        </div>
        <Menu mode="inline" selectedKeys={selectedKey ? [selectedKey] : []} items={menuItems} />
      </Sider>

      <Layout className={`transition-all ${collapsed ? 'lg:ml-0' : 'lg:ml-[200px]'}`}>
        <Header
          className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6"
          style={{ background: token.colorBgContainer }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden"
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
