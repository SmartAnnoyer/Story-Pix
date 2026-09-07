import { brand } from '@/styles/brand';
import './BrandLogo.css';

type BrandLogoVariant = 'full' | 'icon' | 'mark' | 'nav';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  /** Max height in px — width scales so the full artwork stays visible */
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
  const wide = variant === 'full' || variant === 'nav';

  return (
    <img
      src={src}
      alt={brand.name}
      className={`brand-logo brand-logo--${variant}${className ? ` ${className}` : ''}`}
      style={{
        maxHeight: height,
        maxWidth: wide ? Math.max(Math.round(height * 3.6), 160) : height,
      }}
      draggable={false}
    />
  );
};
