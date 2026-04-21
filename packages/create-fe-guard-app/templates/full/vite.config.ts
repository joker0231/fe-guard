import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import frontendGuard from 'fe-guard-vite-plugin';

export default defineConfig({
  plugins: [react(), frontendGuard()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});