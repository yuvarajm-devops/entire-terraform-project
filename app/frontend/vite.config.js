import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.BACKEND_PORT || '8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true
      },
      '/health': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true
      }
    }
  }
});
