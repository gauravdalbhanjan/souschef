import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    // Proxy /api to the local backend in dev only.
    // Remove this block when deploying a full-stack version (Option B).
    proxy: {
      '^/api/': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})

