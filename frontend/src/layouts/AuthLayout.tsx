import { Typography } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { ROUTES } from '@/routes/paths';
import { brand } from '@/styles/brand';
import './app-shell.css';

const { Text } = Typography;

const WIDE_AUTH_PATHS = new Set<string>([ROUTES.SIGNUP]);

export const AuthLayout = () => {
  const { pathname } = useLocation();
  const wide = WIDE_AUTH_PATHS.has(pathname);

  return (
    <div className={`auth-app${wide ? ' auth-app--wide' : ''}`}>
      <div className="auth-app__hero">
        <BrandLogo variant="full" height={wide ? 88 : 104} />
        <Text type="secondary">{brand.tagline}</Text>
      </div>
      <div className="auth-app__card">
        <Outlet />
      </div>
    </div>
  );
};
