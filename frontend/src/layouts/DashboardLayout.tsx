import { useMemo, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Layout, Menu, theme, Grid } from 'antd';
import { BrandLogo } from '@/components/BrandLogo';
import {
  AppstoreOutlined,
  CrownOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PictureOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useLogoutMutation } from '@/hooks/useAuthQueries';
import { ROUTES } from '@/routes/paths';
import { UserRole } from '@/types/auth.types';
import type { MenuProps } from 'antd';
import './app-shell.css';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
};

export const DashboardLayout = () => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const primaryTabs: NavItem[] = useMemo(
    () =>
      isSuperAdmin
        ? [
            {
              key: 'home',
              label: 'Home',
              icon: <DashboardOutlined />,
              path: ROUTES.ADMIN_DASHBOARD,
            },
            { key: 'studios', label: 'Studios', icon: <TeamOutlined />, path: ROUTES.STUDIOS },
            { key: 'catalog', label: 'Catalog', icon: <CrownOutlined />, path: ROUTES.CATALOG },
          ]
        : [
            { key: 'home', label: 'Home', icon: <DashboardOutlined />, path: ROUTES.DASHBOARD },
            { key: 'albums', label: 'Albums', icon: <PictureOutlined />, path: ROUTES.ALBUMS },
            { key: 'packs', label: 'Packs', icon: <CrownOutlined />, path: ROUTES.STUDIO_PACKS },
          ],
    [isSuperAdmin],
  );

  const moreItems: NavItem[] = useMemo(
    () =>
      isSuperAdmin
        ? []
        : [
            {
              key: 'profile',
              label: 'Studio',
              icon: <ShopOutlined />,
              path: ROUTES.STUDIO_PROFILE,
            },
          ],
    [isSuperAdmin],
  );

  const desktopMenuItems: MenuProps['items'] = useMemo(
    () =>
      [...primaryTabs, ...moreItems].map((item) => ({
        key: item.path,
        icon: item.icon,
        label: item.label,
        onClick: () => navigate(item.path),
      })),
    [primaryTabs, moreItems, navigate],
  );

  const allNav = [...primaryTabs, ...moreItems];
  const catalogRelated =
    isSuperAdmin &&
    (location.pathname.startsWith('/admin/plans') ||
      location.pathname.startsWith('/admin/subscriptions') ||
      location.pathname.startsWith('/admin/packs') ||
      location.pathname.startsWith(ROUTES.CATALOG));

  const selectedPath =
    allNav
      .filter(
        (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.path ??
    (catalogRelated
      ? ROUTES.CATALOG
      : location.pathname.startsWith('/studio/albums')
        ? ROUTES.ALBUMS
        : undefined);

  const activeTab =
    primaryTabs.find(
      (tab) => location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`),
    )?.key ??
    (catalogRelated
      ? 'catalog'
      : location.pathname.startsWith('/studio/albums')
        ? 'albums'
        : undefined);

  const headerTitle = isSuperAdmin ? 'Admin' : 'Studio';
  const headerName = user ? user.firstName : 'Story-PIX';
  const showMore = moreItems.length > 0;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setMoreOpen(false);
      navigate(ROUTES.LOGIN);
    }
  };

  const go = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <Layout className="app-shell min-h-screen">
      {!isMobile ? (
        <Sider
          trigger={null}
          collapsible
          collapsed={desktopCollapsed}
          collapsedWidth={64}
          width={220}
          className="!fixed bottom-0 left-0 top-0 z-20 h-screen overflow-auto"
          style={{ background: token.colorBgContainer }}
        >
          <div className="flex h-16 items-center justify-center px-3">
            {desktopCollapsed ? (
              <BrandLogo variant="mark" height={32} />
            ) : (
              <BrandLogo variant="nav" height={34} />
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedPath ? [selectedPath] : []}
            items={desktopMenuItems}
          />
        </Sider>
      ) : null}

      <Layout
        className={`bg-transparent transition-all ${
          !isMobile && !desktopCollapsed ? 'lg:ml-[220px]' : !isMobile ? 'lg:ml-[64px]' : ''
        }`}
      >
        <Header
          className="app-shell__header !h-auto !leading-none"
          style={{ background: 'transparent', paddingInline: 0 }}
        >
          <div className="flex items-center gap-3">
            {!isMobile ? (
              <Button
                type="text"
                aria-label={desktopCollapsed ? 'Expand menu' : 'Collapse menu'}
                icon={desktopCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setDesktopCollapsed((value) => !value)}
              />
            ) : (
              <BrandLogo variant="mark" height={28} />
            )}
            <div>
              <p className="app-shell__title">{headerName}</p>
              <p className="app-shell__subtitle">{headerTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dropdown
              menu={{
                items: isSuperAdmin
                  ? [
                      {
                        key: 'logout',
                        icon: <LogoutOutlined />,
                        label: 'Log out',
                        onClick: () => void handleLogout(),
                      },
                    ]
                  : [
                      {
                        key: 'profile',
                        icon: <ShopOutlined />,
                        label: 'Studio profile',
                        onClick: () => navigate(ROUTES.STUDIO_PROFILE),
                      },
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
          </div>
        </Header>

        <Content className={isMobile ? 'app-shell__content' : 'app-shell__content--desktop'}>
          <Outlet />
        </Content>
      </Layout>

      {isMobile ? (
        <nav className="app-tabbar" aria-label="Main">
          {primaryTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`app-tabbar__item${activeTab === tab.key ? ' app-tabbar__item--active' : ''}`}
              onClick={() => go(tab.path)}
            >
              <span className="app-tabbar__icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          {showMore ? (
            <button
              type="button"
              className={`app-tabbar__item${
                moreOpen ||
                moreItems.some(
                  (item) =>
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`),
                )
                  ? ' app-tabbar__item--active'
                  : ''
              }`}
              onClick={() => setMoreOpen(true)}
            >
              <span className="app-tabbar__icon">
                {isSuperAdmin ? <AppstoreOutlined /> : <MoreOutlined />}
              </span>
              More
            </button>
          ) : null}
        </nav>
      ) : null}

      {showMore ? (
        <Drawer
          title="More"
          placement="bottom"
          height="auto"
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          styles={{ body: { paddingTop: 8, paddingBottom: 24 } }}
        >
          {moreItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="app-more-item"
              onClick={() => go(item.path)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="app-more-item app-more-item--danger"
            onClick={() => void handleLogout()}
          >
            <LogoutOutlined />
            Log out
          </button>
        </Drawer>
      ) : null}
    </Layout>
  );
};
