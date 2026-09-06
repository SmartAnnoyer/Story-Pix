/** Story-PIX brand tokens — aligned with official logo palette */
export const brand = {
  name: 'Story-PIX',
  shortName: 'SP',
  tagline: 'Turn photos into living stories',
  logos: {
    icon: '/brand/logo-icon.png',
    full: '/brand/logo-full.png',
    mark: '/brand/logo-mark.png',
    nav: '/brand/logo-nav.png',
  },
  colors: {
    primaryPurple: '#6B2CDB',
    primaryBlue: '#3B4FE8',
    accentPink: '#E93A8A',
    accentMagenta: '#FF4FA3',
    accentOrange: '#FF7A45',
    accentYellow: '#FFC233',
    bgDark: '#0A0A0F',
    bgLight: '#FFFFFF',
    textDark: '#1A1A2E',
    // Semantic aliases for components
    primary: '#6B2CDB',
    primaryHover: '#5A24BC',
    primaryLight: '#A78BFA',
    primaryMuted: '#f3e8ff',
    accent: '#E93A8A',
    accentLight: '#ffe8f3',
    surface: '#FFFFFF',
    surfaceAlt: '#f5f5f8',
    ink: '#1A1A2E',
    inkMuted: '#5c5c66',
    gradient: 'linear-gradient(135deg, #3B4FE8 0%, #6B2CDB 40%, #E93A8A 78%, #FF4FA3 100%)',
    scanGradient:
      'linear-gradient(90deg, transparent 0%, #6B2CDB 18%, #E93A8A 50%, #FF4FA3 82%, transparent 100%)',
  },
} as const;
