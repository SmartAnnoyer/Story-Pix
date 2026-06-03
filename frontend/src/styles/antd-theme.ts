import type { ThemeConfig } from 'antd';
import { brand } from '@/styles/brand';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.colors.primary,
    colorLink: brand.colors.primary,
    colorLinkHover: brand.colors.primaryHover,
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgLayout: brand.colors.surface,
    colorText: brand.colors.ink,
    colorTextSecondary: brand.colors.inkMuted,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: brand.colors.surface,
      siderBg: '#ffffff',
    },
    Button: {
      controlHeight: 40,
    },
    Menu: {
      itemSelectedColor: brand.colors.primary,
      itemSelectedBg: brand.colors.primaryMuted,
    },
  },
};
