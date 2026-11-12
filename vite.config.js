import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app talks to Supabase directly from the browser, so there is no /api
// backend to proxy to any more.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // reachable from a phone on the same WiFi
    port: 5180,
    strictPort: true,
  },
})
