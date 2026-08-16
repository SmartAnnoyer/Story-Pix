import { Typography } from 'antd';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { brand } from '@/styles/brand';
import './app-shell.css';

const { Text } = Typography;

export const AuthLayout = () => {
  return (
    <div className="auth-app">
      <div className="auth-app__hero">
        <BrandLogo variant="full" height={40} className="mb-2" />
        <Text type="secondary">{brand.tagline}</Text>
      </div>
      <div className="auth-app__card">
        <Outlet />
      </div>
    </div>
  );
};
