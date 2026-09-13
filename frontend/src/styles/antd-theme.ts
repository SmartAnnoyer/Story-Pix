import type { ThemeConfig } from 'antd';
import { brand } from '@/styles/brand';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.colors.primary,
    colorLink: brand.colors.primary,
    colorLinkHover: brand.colors.primaryHover,
    borderRadius: 14,
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif",
    colorBgLayout: brand.colors.surfaceAlt,
    colorText: brand.colors.ink,
    colorTextSecondary: brand.colors.inkMuted,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: brand.colors.surfaceAlt,
      siderBg: '#ffffff',
    },
    Button: {
      controlHeight: 48,
      borderRadius: 999,
      fontWeight: 700,
    },
    Menu: {
      itemSelectedColor: brand.colors.primary,
      itemSelectedBg: brand.colors.primaryMuted,
    },
  },
};
