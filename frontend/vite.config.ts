import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (
              id.includes('react-router') ||
              id.includes('react-dom') ||
              id.includes('/react/')
            ) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
});
