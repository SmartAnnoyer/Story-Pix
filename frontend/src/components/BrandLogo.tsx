import { brand } from '@/styles/brand';

type BrandLogoVariant = 'full' | 'icon' | 'mark';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  height?: number;
}

const srcByVariant: Record<BrandLogoVariant, string> = {
  full: brand.logos.full,
  icon: brand.logos.icon,
  mark: brand.logos.mark,
};

export const BrandLogo = ({ variant = 'full', className = '', height = 36 }: BrandLogoProps) => {
  const src = srcByVariant[variant];

  return (
    <img
      src={src}
      alt={brand.name}
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
      draggable={false}
    />
  );
};
