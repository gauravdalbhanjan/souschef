// Export / import of on-device data as JSON. Imports are UNTRUSTED: size-limited,
// only known keys, every value validated against a schema before anything is written.
import { z } from 'zod'
import { allAppKeys, rawGet, rawSet, TABLES } from './deviceStore.js'
import { sanitizeImageUrl } from './safeImage.js'

export const BACKUP_FORMAT = 'souschef-backup'
export const BACKUP_VERSION = 1
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

const str = (n) => z.string().max(n)
const num = z.number().finite()
const PantryRow = z.object({ id: num, canonical: str(40), display: str(80), category: str(20), quantity: num.min(0).max(100000), unit: str(10),
  brand: str(60).nullable().optional(), purchased: str(10).nullable().optional(), image: str(500).nullable().optional(), checkOk: z.boolean().optional(), boughtQty: num.min(0).max(100000).optional() }).strict()
const CartRow = z.object({ id: num, canonical: str(40), display: str(80), quantity: num.min(0).max(100000), unit: str(10), category: str(20), source: str(80).nullable().optional() }).strict()

// Per-key validators. Keys not listed here are rejected.
const VALIDATORS = {
  [TABLES.pantry]: z.array(PantryRow).max(2000),
  [TABLES.cart]: z.array(CartRow).max(2000),
  [TABLES.sessions]: z.record(z.string(), z.object({ slug: str(80), servings: num, status: z.enum(['in_progress', 'completed', 'cancelled']) }).strict()),
  [TABLES.aiRecipes]: z.array(z.object({ slug: z.string().regex(/^ai-[a-z0-9-]{3,80}$/), name: str(80) }).passthrough()).max(500),
  [TABLES.feedback]: z.record(z.string(), z.object({ vote: z.enum(['up', 'down']), reasons: z.array(str(40)).max(6), at: str(30) }).strict()),
  [TABLES.reports]: z.array(z.object({ slug: str(90), reason: str(40), at: str(30) }).strict()).max(500),
  [TABLES.kitchen]: z.array(str(30)).max(40).nullable(),
  [TABLES.allergies]: z.array(str(20)).max(9),
  [TABLES.seq]: num.int().min(1),
  souschef_color_mode: z.enum(['light', 'dark']),
  souschef_filters: z.object({ time: str(10), protein: str(20), category: str(20), cuisine: str(40) }).partial().strict(),
  souschef_read_aloud: z.enum(['0', '1']),
  souschef_routines: z.array(z.object({ id: z.union([str(40), num]), dish: str(60) }).passthrough()).max(200),
  souschef_events: z.record(z.string(), z.unknown()),
  souschef_staples_out: z.array(str(40)).max(100),
  souschef_onboarded: z.enum(['1']),
  souschef_guest: z.enum(['1']),
  souschef_browse: z.enum(['0', '1']),
  souschef_broken_links: z.array(str(500)).max(500),
  // Image results: every URL must pass the same allow-list as at render time.
  souschef_img_cache: z.record(str(160), z.union([z.literal(2), z.object({
    url: str(2048).refine(u => sanitizeImageUrl(u) === u, 'url'), author: str(160).optional(), license: str(80).optional(), page: str(500).optional(),
    tier: z.enum(['primary', 'secondary']), approximate: z.boolean(),
  }).strict().nullable()])).refine(o => Object.keys(o).length <= 601, 'size'),
}
const RAW_STRING_KEYS = new Set(['souschef_color_mode', 'souschef_read_aloud', 'souschef_onboarded', 'souschef_guest', 'souschef_browse'])
// souschef_browse lives in sessionStorage (per visit); the rest in the device store.
const readKey = (k) => { if (k !== 'souschef_browse') return rawGet(k); try { return sessionStorage.getItem(k) } catch { return null } }

export function exportData() {
  const data = {}
  for (const k of allAppKeys()) {
    if (!VALIDATORS[k]) continue
    const v = readKey(k)
    if (v == null) continue
    data[k] = RAW_STRING_KEYS.has(k) ? v : safeParse(v)
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
}

const safeParse = (v) => { try { return JSON.parse(v) } catch { return null } }

// -> { ok: true, keys: n } | { ok: false, error }
export function importData(text) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'The file is too large or empty.' }
  const doc = safeParse(text)
  const Envelope = z.object({ format: z.literal(BACKUP_FORMAT), version: z.literal(BACKUP_VERSION), exportedAt: str(40), data: z.record(z.string(), z.unknown()) }).strict()
  const env = Envelope.safeParse(doc)
  if (!env.success) return { ok: false, error: 'This isn\u2019t a SousChef backup file.' }
  const writes = []
  for (const [k, v] of Object.entries(env.data.data)) {
    const val = VALIDATORS[k]
    if (!val) return { ok: false, error: 'The file contains data SousChef doesn\u2019t recognize.' }
    const p = val.safeParse(v)
    if (!p.success) return { ok: false, error: 'The file is damaged or was changed.' }
    writes.push([k, RAW_STRING_KEYS.has(k) ? p.data : JSON.stringify(p.data)])
  }
  // All-or-nothing: only write once every key is valid.
  for (const [k, v] of writes) {
    if (k === 'souschef_browse') { try { sessionStorage.setItem(k, v) } catch { /* blocked */ } continue }
    rawSet(k, v)
  }
  return { ok: true, keys: writes.length }
}
