
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Identity Service
      '/api/v1/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/v1/profile': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/v1/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },

      // Application Service
      '/api/v1/applications': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },

      // Review Service
      '/api/reviews': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },

      // Old backend routes (temporary)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
