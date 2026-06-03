/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          500: '#b57af0',
          600: '#8A2BE2',
          700: '#7424c4',
          800: '#5e1d9e',
        },
        blue: {
          brand: '#2196F3',
        },
        accent: {
          pink: '#FF4FA3',
          orange: '#FF7A45',
          yellow: '#FFC233',
          100: '#ffe8f3',
          500: '#FF4FA3',
        },
        brand: {
          surface: '#FFFFFF',
          dark: '#0F0F14',
          ink: '#1A1A1A',
        },
      },
      screens: {
        xs: '480px',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #8A2BE2 0%, #2196F3 38%, #FF4FA3 72%, #FF7A45 100%)',
      },
    },
  },
  plugins: [],
};
