import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    optimizeDeps: {
      include: ['@reduxjs/toolkit', 'react-redux'],
    },

    server: {
      host: true,
      port: 5173,

      allowedHosts: [
        'swimming-endurable-pedometer.ngrok-free.dev',
        '.ngrok-free.dev',
      ],

      // Dev-only proxy: the browser calls same-origin /api/v1, Vite forwards it
      // to the backend, so the backend's CORS allow-list doesn't apply.
      proxy: {
        '/api': {
          target: 'https://api.dev.crm.yaacreations.com',
          changeOrigin: true,
          secure: true,
        },
      },

      hmr: process.env.DISABLE_HMR !== 'true',

      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});