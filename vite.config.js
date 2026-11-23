import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'node:fs'

// Local preview of the Vercel function /api/image-search. Keys come from
// .env.local (gitignored), never from the client bundle (no VITE_ prefix).
function imageSearchDev(env) {
  return {
    name: 'image-search-dev',
    configureServer(server) {
      for (const k of ['PEXELS_API_KEY', 'PIXABAY_API_KEY', 'UNSPLASH_ACCESS_KEY']) if (env[k]) process.env[k] = env[k]
      server.middlewares.use('/api/image-search', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/image-search.js')
        req.url = `/api/image-search${req.url.startsWith('?') ? req.url : req.url.replace(/^\/?/, '?').replace(/^\?\?/, '?')}`
        return mod.default(req, res)
      })
    },
  }
}

// The production security headers (vercel.json), also applied to `vite preview`
// so the built app can be checked locally under the same CSP.
const prodHeaders = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')).headers[0].headers.map(h => [h.key, h.value]))
// Everything else runs in the browser.
export default defineConfig(({ mode }) => ({
  // `npm run dev:phone` serves HTTPS (self-signed) so a phone on the same WiFi
  // gets a secure context, which WebGPU (on-device AI) requires.
  plugins: [react(), imageSearchDev(loadEnv(mode, process.cwd(), '')), ...(mode === 'phone' ? [basicSsl()] : [])],
  // The on-device model runs in a module Web Worker (lib/llm.worker.js).
  worker: { format: 'es' },
  server: {
    host: true,   // reachable from a phone on the same WiFi
    port: 5180,
    strictPort: true,
  },
  preview: { headers: prodHeaders },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
}))
