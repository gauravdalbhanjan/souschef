// Frontend API client for the SousChef backend.
// Same-origin by default: Vite proxies /api -> the Node backend in dev, so this
// works over HTTPS on a phone with no mixed-content issues.
// On Vercel (Option A, frontend-only) API calls return a friendly 404 and the
// UI shows an empty-state rather than crashing.
const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(path, opts = {}) {
  try {
    const res = await fetch(BASE + path, {
      headers: opts.body && !(opts.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : undefined,
      ...opts,
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const j = await res.json(); msg = j.error || msg } catch { /* ignore */ }
      throw new Error(msg)
    }
    return res.json()
  } catch (err) {
    // Surface as a typed error so callers can show an empty state gracefully.
    err.noBackend = err.message.includes('Failed to fetch') || err.message.includes('404')
    throw err
  }
}

export const api = {
  base: BASE,
  health: () => req('/health'),

  // suggestions & recipes
  suggestions: () => req('/suggestions').then(r => r.suggestions),
  recipe: (slug) => req(`/recipes/${slug}`),

  // pantry
  pantry: () => req('/pantry').then(r => r.items),
  addPantry: (item) => req('/pantry', { method: 'POST', body: JSON.stringify(item) }),
  updatePantry: (id, quantity) => req(`/pantry/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  deletePantry: (id) => req(`/pantry/${id}`, { method: 'DELETE' }),
  commit: (items, receiptId) => req('/pantry/commit', { method: 'POST', body: JSON.stringify({ items, receiptId }) }),

  // ingestion
  scanReceipt: (file) => {
    const fd = new FormData()
    fd.append('image', file)
    return req('/receipts/scan', { method: 'POST', body: fd })
  },
  parseReceiptText: (text) => req('/receipts/text', { method: 'POST', body: JSON.stringify({ text }) }),
  parseEmail: (text) => req('/receipts/email', { method: 'POST', body: JSON.stringify({ text }) }),

  // cooking (with depletion)
  startCook: (slug, servings) => req('/cook/start', { method: 'POST', body: JSON.stringify({ slug, servings }) }),
  completeCook: (sessionId) => req('/cook/complete', { method: 'POST', body: JSON.stringify({ sessionId }) }),

  // cart + grocery handoff
  cart: () => req('/cart').then(r => r.items),
  addToCart: (items) => req('/cart', { method: 'POST', body: JSON.stringify({ items }) }),
  removeFromCart: (id) => req(`/cart/${id}`, { method: 'DELETE' }),
  clearCart: () => req('/cart', { method: 'DELETE' }),
  checkout: () => req('/cart/checkout', { method: 'POST' }),
}
