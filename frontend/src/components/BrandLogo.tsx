import { brand } from '@/styles/brand';

type BrandLogoVariant = 'full' | 'icon' | 'mark' | 'nav';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  height?: number;
}

const srcByVariant: Record<BrandLogoVariant, string> = {
  full: brand.logos.full,
  icon: brand.logos.icon,
  mark: brand.logos.mark,
  nav: brand.logos.nav,
};

export const BrandLogo = ({ variant = 'nav', className = '', height = 36 }: BrandLogoProps) => {
  const src = srcByVariant[variant];

  return (
    <img
      src={src}
      alt={brand.name}
      className={className}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
      draggable={false}
    />
  );
};
