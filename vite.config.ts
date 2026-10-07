import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { createApiApp } from './server';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-middleware',
    configureServer(server) {
      server.middlewares.use(createApiApp());
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      expressApiPlugin(),
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: true,
      port: 5173,

      allowedHosts: [
        'swimming-endurable-pedometer.ngrok-free.dev',
        '.ngrok-free.dev',
      ],

      hmr: false,

      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});