import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        if (mode !== 'electron') return html;
        return html
          .replace(/\s+crossorigin\s*/gi, ' ')
          .replace(/\s+crossorigin="[^"]*"/gi, ' ');
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  base: mode === 'electron' ? './' : '/',
}));
