import { Layout, Typography } from 'antd';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { brand } from '@/styles/brand';

const { Content } = Layout;
const { Text } = Typography;

export const AuthLayout = () => {
  return (
    <Layout className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-accent-100">
      <Content className="flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo variant="full" height={44} className="mb-3" />
          <Text type="secondary">{brand.tagline}</Text>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-primary-50 bg-white p-6 shadow-lg shadow-primary-600/10 sm:p-8">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};
