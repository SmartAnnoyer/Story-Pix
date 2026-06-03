import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { queryClient } from '@/api/queryClient';
import { AppRoutes } from '@/routes';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { antdTheme } from '@/styles/antd-theme';
import '@/styles/globals.css';

const App = () => {
  useAuthBootstrap();
  return <AppRoutes />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme}>
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);
