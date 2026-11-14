
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Identity Service (auth, profile, admin user management)
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

      // Application Service (must come before generic /api proxy)
      '/api/v1/applications': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },

      // Scholarship Service
      '/api/v1/scholarships': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },

      // Review Service
      '/api/reviews': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },

      // Monolith fallback for remaining /api/v1/* routes
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
