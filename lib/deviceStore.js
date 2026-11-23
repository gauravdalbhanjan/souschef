// On-device "tables" for the app, stored as JSON values in IndexedDB through
// lib/localStore.js (synchronous in-memory cache, persisted in the background).
// There is no account and no server: clearing the browser's site data erases it.
import { getJSON, setJSON, localStore } from './localStore.js'

export const TABLES = {
  pantry: 'souschef_db_pantry',          // [{ id, canonical, display, category, quantity, unit, brand, purchased, image, checkOk }]
  cart: 'souschef_db_cart',              // [{ id, canonical, display, quantity, unit, category, source }]
  sessions: 'souschef_db_sessions',      // { [id]: { recipeId, slug, servings, status } }
  aiRecipes: 'souschef_db_ai_recipes',   // saved AI recipes (lib/generate.js shape)
  aiIdeas: 'souschef_db_ai_ideas',       // AI dish names not yet written out (lib/aiIdeas.js)
  feedback: 'souschef_db_feedback',      // { [slug]: { vote, reasons, at } }
  reports: 'souschef_db_reports',        // local "unsafe" reports
  kitchen: 'souschef_db_kitchen',        // equipment the user owns
  allergies: 'souschef_db_allergies',    // active allergy filter
  seq: 'souschef_db_seq',                // id counter
}

const fallback = { pantry: [], cart: [], sessions: {}, aiRecipes: [], aiIdeas: [], feedback: {}, reports: [], kitchen: null, allergies: [], seq: 1 }

export const read = (table) => getJSON(TABLES[table], structuredClone(fallback[table]))
export const write = (table, value) => setJSON(TABLES[table], value)
export function nextId() {
  const n = read('seq')
  write('seq', n + 1)
  return n
}

// Every key the app owns on this device (for export / "erase everything").
export function allAppKeys() {
  const keys = new Set(Object.values(TABLES))
  for (const k of ['souschef_color_mode', 'souschef_filters', 'souschef_read_aloud', 'souschef_llm_model', 'souschef_downloads',
    'souschef_routines', 'souschef_events', 'souschef_staples_out', 'souschef_onboarded', 'souschef_geo_denied', 'souschef_today_collapsed',
    'souschef_img_cache', 'souschef_guest', 'souschef_browse', 'souschef_broken_links']) keys.add(k)
  return [...keys]
}
export const rawGet = (k) => localStore.getItem(k)
export const rawSet = (k, v) => localStore.setItem(k, v)
export const rawDel = (k) => localStore.removeItem(k)
