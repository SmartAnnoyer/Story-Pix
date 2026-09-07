import { useMemo } from 'react';
import { Avatar, Button, Dropdown, Layout } from 'antd';
import { BrandLogo } from '@/components/BrandLogo';
import { ArrowLeftOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useLogoutMutation } from '@/hooks/useAuthQueries';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';
import './app-shell.css';

const { Header, Content } = Layout;

type NavItem = {
  key: string;
  label: string;
  path: string;
};

function getBackTarget(
  pathname: string,
  isSuperAdmin: boolean,
): { label: string; path: string } | null {
  if (isSuperAdmin) {
    if (pathname === ROUTES.ADMIN_DASHBOARD) return null;

    if (pathname.startsWith(ROUTES.CATALOG) || pathname.startsWith('/admin/packs')) {
      return { label: 'Home', path: ROUTES.ADMIN_DASHBOARD };
    }

    if (pathname === ROUTES.STUDIOS || pathname === ROUTES.STUDIO_CREATE) {
      return { label: 'Home', path: ROUTES.ADMIN_DASHBOARD };
    }

    if (pathname.startsWith('/admin/studios/')) {
      return { label: 'Studios', path: ROUTES.STUDIOS };
    }

    return { label: 'Home', path: ROUTES.ADMIN_DASHBOARD };
  }

  if (pathname === ROUTES.DASHBOARD || pathname === ROUTES.ALBUMS) return null;

  if (pathname.startsWith('/studio/albums')) {
    return { label: 'Albums', path: ROUTES.ALBUMS };
  }

  if (pathname.startsWith('/settings')) {
    return { label: 'Home', path: ROUTES.DASHBOARD };
  }

  return { label: 'Home', path: ROUTES.DASHBOARD };
}

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const primaryTabs: NavItem[] = useMemo(
    () =>
      isSuperAdmin
        ? [
            { key: 'home', label: 'Home', path: ROUTES.ADMIN_DASHBOARD },
            { key: 'studios', label: 'Studios', path: ROUTES.STUDIOS },
            { key: 'catalog', label: 'Catalog', path: ROUTES.CATALOG },
          ]
        : [
            { key: 'home', label: 'Home', path: ROUTES.DASHBOARD },
            { key: 'albums', label: 'Albums', path: ROUTES.ALBUMS },
          ],
    [isSuperAdmin],
  );

  const catalogRelated =
    isSuperAdmin &&
    (location.pathname.startsWith('/admin/packs') || location.pathname.startsWith(ROUTES.CATALOG));

  const activeTab =
    primaryTabs.find(
      (tab) => location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`),
    )?.key ??
    (catalogRelated
      ? 'catalog'
      : location.pathname.startsWith('/studio/albums')
        ? 'albums'
        : undefined);

  const back = getBackTarget(location.pathname, isSuperAdmin);
  const homePath = isSuperAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD;
  const navLabel = isSuperAdmin ? 'Admin' : 'Studio';

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate(ROUTES.LOGIN);
    }
  };

  const userMenu = (
    <Dropdown
      menu={{
        items: [
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Log out',
            onClick: () => void handleLogout(),
          },
        ],
      }}
      placement="bottomRight"
    >
      <Avatar icon={<UserOutlined />} className="cursor-pointer" />
    </Dropdown>
  );

  return (
    <Layout className="app-shell app-shell--admin min-h-screen">
      <Header className="app-shell__header app-shell__header--admin !h-auto !leading-none">
        <div className="app-shell__admin-left">
          <Link to={homePath} className="app-shell__brand-link" aria-label="Home">
            <BrandLogo variant="nav" height={40} />
          </Link>
          <nav className="app-shell__admin-nav" aria-label={navLabel}>
            {primaryTabs.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`app-shell__admin-link${
                  activeTab === item.key ? ' app-shell__admin-link--on' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="app-shell__admin-right">
          {back ? (
            <Button
              type="text"
              className="app-shell__back"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(back.path)}
            >
              {back.label}
            </Button>
          ) : null}
          {userMenu}
        </div>
      </Header>

      <Content className="app-shell__content app-shell__content--admin">
        <Outlet />
      </Content>
    </Layout>
  );
};
