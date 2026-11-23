// Local state on this device, stored in IndexedDB (DB "souschef", store "kv").
//
// The app reads state synchronously (routines, event plans, staples, filters,
// preferences…), so the whole store is loaded into memory once at startup by
// hydrateLocalStore() (main.jsx awaits it before rendering). Reads hit the
// in-memory cache; writes update the cache immediately and are persisted to
// IndexedDB in the background.
//
// • First run on a device that used the old localStorage keys ("souschef_*")
//   migrates them into IndexedDB once, then removes them from localStorage.
// • If IndexedDB is unavailable (some private modes), it falls back to
//   localStorage so nothing breaks.
// • Guests still store nothing: guest data uses in-memory stores and never
//   calls this module with a key.

const DB_NAME = 'souschef'
const STORE = 'kv'
const PREFIX = 'souschef_'
// Read by the inline script in index.html before React loads (no theme flash).
const MIRROR_TO_LOCALSTORAGE = new Set(['souschef_color_mode'])

const cache = new Map()
let db = null
let backend = 'memory' // 'indexeddb' | 'localstorage' | 'memory'

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'))
    const open = indexedDB.open(DB_NAME, 1)
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE) }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
    open.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch { /* blocked / full */ } }
const lsDel = (k) => { try { localStorage.removeItem(k) } catch { /* blocked */ } }
const lsKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)) } catch { return [] } }

let hydrating = null
export function hydrateLocalStore() {
  if (hydrating) return hydrating
  hydrating = (async () => {
    try {
      db = await openDb()
      const tx = db.transaction(STORE, 'readonly').objectStore(STORE)
      const [keys, values] = await Promise.all([req(tx.getAllKeys()), req(tx.getAll())])
      keys.forEach((k, i) => cache.set(String(k), values[i]))
      backend = 'indexeddb'

      // One-time migration of the old localStorage keys.
      const legacy = lsKeys().filter(k => !cache.has(k))
      if (legacy.length) {
        const w = db.transaction(STORE, 'readwrite')
        const os = w.objectStore(STORE)
        for (const k of legacy) { const v = lsGet(k); if (v != null) { cache.set(k, v); os.put(v, k) } }
        await new Promise((resolve, reject) => { w.oncomplete = resolve; w.onerror = () => reject(w.error) })
        for (const k of legacy) if (!MIRROR_TO_LOCALSTORAGE.has(k)) lsDel(k)
      }
    } catch (e) {
      // No IndexedDB here: keep working on localStorage.
      console.warn('IndexedDB unavailable, using localStorage:', e?.message)
      backend = 'localstorage'
      for (const k of lsKeys()) cache.set(k, lsGet(k))
    }
  })()
  return hydrating
}

function persist(key, value) {
  if (MIRROR_TO_LOCALSTORAGE.has(key)) { if (value == null) lsDel(key); else lsSet(key, value) }
  if (backend === 'localstorage') { if (value == null) lsDel(key); else lsSet(key, value); return }
  if (backend !== 'indexeddb' || !db) return
  try {
    const os = db.transaction(STORE, 'readwrite').objectStore(STORE)
    if (value == null) os.delete(key); else os.put(value, key)
  } catch (e) { console.warn('IndexedDB write failed:', e?.message) }
}

// localStorage-shaped API (string values), synchronous via the cache.
export const localStore = {
  getItem(key) { return cache.has(key) ? cache.get(key) : null },
  setItem(key, value) { const v = String(value); cache.set(key, v); persist(key, v) },
  removeItem(key) { cache.delete(key); persist(key, null) },
  get backend() { return backend },
}

// "Erase everything": every souschef_* key in IndexedDB, localStorage and
// sessionStorage, plus the in-memory cache. Resolves when the deletes are
// committed; the caller reloads the page to reset all in-memory state.
export async function eraseAll() {
  for (const k of [...cache.keys()]) if (k.startsWith(PREFIX)) cache.delete(k)
  for (const k of lsKeys()) lsDel(k)
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIX)) sessionStorage.removeItem(k) } catch { /* blocked */ }
  if (backend === 'indexeddb' && db) {
    const tx = db.transaction(STORE, 'readwrite')
    const os = tx.objectStore(STORE)
    const keys = await req(os.getAllKeys())
    for (const k of keys) if (String(k).startsWith(PREFIX)) os.delete(k)
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
  }
}

// JSON helpers
export function getJSON(key, fallback) {
  const raw = localStore.getItem(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}
export const setJSON = (key, value) => localStore.setItem(key, JSON.stringify(value))
