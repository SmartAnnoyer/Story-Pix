/** Story-pix brand tokens — aligned with official logo palette */
export const brand = {
  name: 'Story-pix',
  shortName: 'SP',
  tagline: 'Turn photos into living stories',
  logos: {
    icon: '/brand/logo-icon.svg',
    full: '/brand/logo-full.svg',
    mark: '/brand/logo-mark.svg',
  },
  colors: {
    primaryPurple: '#8A2BE2',
    primaryBlue: '#2196F3',
    accentPink: '#FF4FA3',
    accentOrange: '#FF7A45',
    accentYellow: '#FFC233',
    bgDark: '#0F0F14',
    bgLight: '#FFFFFF',
    textDark: '#1A1A1A',
    // Semantic aliases for components
    primary: '#8A2BE2',
    primaryHover: '#7424c4',
    primaryLight: '#b57af0',
    primaryMuted: '#f3e8ff',
    accent: '#FF4FA3',
    accentLight: '#ffe8f3',
    surface: '#FFFFFF',
    surfaceAlt: '#f5f5f8',
    ink: '#1A1A1A',
    inkMuted: '#5c5c66',
    gradient:
      'linear-gradient(135deg, #8A2BE2 0%, #2196F3 38%, #FF4FA3 72%, #FF7A45 100%)',
  },
} as const;
