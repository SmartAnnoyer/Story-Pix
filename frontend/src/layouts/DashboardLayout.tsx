import { useMemo, useState, type ReactNode } from 'react';
import { Layout } from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  LogoutOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { BrandLogo } from '@/components/BrandLogo';
import { ConfirmModal } from '@/components/ConfirmModal';
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
  icon?: ReactNode;
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

  if (
    pathname === ROUTES.ALBUMS ||
    pathname === ROUTES.STUDIO_PACKS ||
    pathname === ROUTES.DASHBOARD
  ) {
    return null;
  }

  if (pathname === ROUTES.ALBUM_CREATE) {
    return { label: 'Albums', path: ROUTES.ALBUMS };
  }

  const albumMatch = pathname.match(/^\/studio\/albums\/([^/]+)(\/.*)?$/);
  if (albumMatch) {
    const albumId = albumMatch[1];
    const rest = albumMatch[2] ?? '';
    if (!rest || rest === '/') {
      return { label: 'Albums', path: ROUTES.ALBUMS };
    }
    return { label: 'Album', path: ROUTES.ALBUM_MEDIA.replace(':id', albumId) };
  }

  if (pathname.startsWith('/settings')) {
    return { label: 'Albums', path: ROUTES.ALBUMS };
  }

  return { label: 'Albums', path: ROUTES.ALBUMS };
}

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const primaryTabs: NavItem[] = useMemo(
    () =>
      isSuperAdmin
        ? [
            { key: 'home', label: 'Home', path: ROUTES.ADMIN_DASHBOARD, icon: <HomeOutlined /> },
            {
              key: 'studios',
              label: 'Studios',
              path: ROUTES.STUDIOS,
              icon: <AppstoreOutlined />,
            },
            { key: 'catalog', label: 'Catalog', path: ROUTES.CATALOG, icon: <ShoppingOutlined /> },
          ]
        : [
            { key: 'albums', label: 'Albums', path: ROUTES.ALBUMS, icon: <AppstoreOutlined /> },
            {
              key: 'packs',
              label: 'Add living photos',
              path: ROUTES.STUDIO_PACKS,
              icon: <ShoppingOutlined />,
            },
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
  const homePath = isSuperAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.ALBUMS;
  const greetingName = user?.firstName?.trim() || user?.email?.split('@')[0] || 'there';

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setLogoutOpen(false);
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <Layout className="app-shell app-shell--admin min-h-screen">
      <Header className="app-shell__header app-shell__header--admin !h-auto !leading-none">
        <div className="app-shell__admin-left">
          {back ? (
            <button
              type="button"
              className="app-shell__back-btn"
              onClick={() => navigate(back.path)}
              aria-label={`Back to ${back.label}`}
            >
              <ArrowLeftOutlined />
              <span className="app-shell__back-label">{back.label}</span>
            </button>
          ) : null}
          <Link to={homePath} className="app-shell__brand-link" aria-label="Story-PIX home">
            <BrandLogo variant="nav" height={40} className="app-shell__brand-logo--desktop" />
            <BrandLogo variant="full" height={48} className="app-shell__brand-logo--mobile" />
          </Link>
          {!isSuperAdmin ? (
            <p className="app-shell__hello">
              Hi, <strong>{greetingName}</strong>
            </p>
          ) : null}
          <nav className="app-shell__admin-nav app-shell__admin-nav--desktop" aria-label="Main">
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
          <button
            type="button"
            className="app-shell__logout-btn"
            aria-label="Log out"
            onClick={() => setLogoutOpen(true)}
          >
            <LogoutOutlined />
          </button>
        </div>
      </Header>

      <Content className="app-shell__content app-shell__content--admin app-shell__content--with-tabbar">
        <Outlet />
      </Content>

      <nav className="app-tabbar" aria-label="Main">
        {primaryTabs.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`app-tabbar__item${activeTab === item.key ? ' app-tabbar__item--active' : ''}`}
          >
            <span className="app-tabbar__icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <ConfirmModal
        open={logoutOpen}
        title="Log out?"
        description="You can sign back in anytime with your email and password."
        confirmLabel="Log out"
        cancelLabel="Stay"
        tone="danger"
        loading={logoutMutation.isPending}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </Layout>
  );
};
