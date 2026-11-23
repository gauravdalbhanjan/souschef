import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
// Self-hosted font (latin subset, weights used by the app).
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/montserrat/latin-900.css'
import './theme.css' // design tokens (colours, surfaces, text) — one place
import './index.css'
import { hydrateLocalStore } from './lib/localStore.js'

// Local state lives in IndexedDB: load it into memory first so every screen
// can read it synchronously, then start the app.
hydrateLocalStore().finally(async () => {
  const { default: App } = await import('./App.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
      <Analytics />
    </React.StrictMode>,
  )
})
