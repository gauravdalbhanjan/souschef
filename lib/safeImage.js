// Dish images with a tiered fallback. Nothing is stored in the repo:
//   1. primary   the recipe's own credited image (e.g. Wikibooks/Commons)
//   2. secondary a keyless, pre-approved API queried from the browser
//                (Wikimedia Commons search; CORS, no secrets in the client)
//   3. local     the app's fallback illustration (FALLBACK_THUMB, same origin)
// Every URL is sanitized against an allow-list (https only, approved hosts,
// no credentials/ports, no data:/javascript:/svg), and every image is
// decoded and its dimensions checked BEFORE it is rendered. A broken image at
// render time moves to the next tier. Results are cached on the device.
import { useEffect, useState } from 'react'
import { getJSON, setJSON } from './localStore.js'

// Hosts images may be loaded from. Keep in sync with img-src in vercel.json.
export const IMAGE_HOSTS = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org', 'images.unsplash.com', 'plus.unsplash.com', 'images.pexels.com', 'cdn.pixabay.com'])
// The only API the browser may query for a secondary image.
export const SECONDARY_API = 'https://commons.wikimedia.org/w/api.php'

// Tier 3: the app's own illustration (public/images, from Fallback_thumbnail.png).
export const FALLBACK_THUMB = '/images/fallback-thumbnail.jpg'

// Light blur for approximate (partial-match) photos.
export const BLUR_PX = 2

const BLOCKED_EXT = /\.(svg|svgz|html?|xml|js|mjs|php|exe|pdf)(\?|$)/i

// -> clean https URL string, or null
export function sanitizeImageUrl(raw, hosts = IMAGE_HOSTS) {
  if (typeof raw !== 'string' || raw.length > 2048) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s"'<>`\\]/.test(raw)) return null
  // App files on this site ("/icons/egg.png"): same origin only.
  if (/^\/(?!\/)[\w\-./%]+$/.test(raw) && !raw.includes('..')) return BLOCKED_EXT.test(raw) ? null : raw
  let u
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null
  if (!hosts.has(u.hostname)) return null
  if (BLOCKED_EXT.test(u.pathname)) return null
  u.hash = ''
  return u.toString()
}

// Size / shape rules for a decoded image.
export const LIMITS = { minW: 96, minH: 72, maxW: 8000, maxH: 8000, minAspect: 1 / 3, maxAspect: 3 }
export function checkDimensions(w, h, L = LIMITS) {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return false
  if (w < L.minW || h < L.minH || w > L.maxW || h > L.maxH) return false
  const a = w / h
  return a >= L.minAspect && a <= L.maxAspect
}

// Loads + decodes the image off-screen. Resolves { ok, w, h }.
export function validateImage(url, { timeoutMs = 8000 } = {}) {
  const clean = sanitizeImageUrl(url)
  if (!clean || typeof Image === 'undefined') return Promise.resolve({ ok: false })
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      clearTimeout(timer)
      const w = img.naturalWidth, h = img.naturalHeight
      img.src = ''
      resolve({ ok: ok && checkDimensions(w, h), w, h })
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    img.referrerPolicy = 'no-referrer'
    img.decoding = 'async'
    img.onerror = () => finish(false)
    img.onload = () => (img.decode ? img.decode().then(() => finish(true), () => finish(false)) : finish(true))
    img.src = clean
  })
}

// ── tier 2: Wikimedia Commons search (keyless, CORS) ────────────────────────
const words = (s) => (String(s || '').toLowerCase().match(/[a-z]{3,}/g) || []).filter(w => !['and', 'the', 'with', 'recipe', 'style'].includes(w))
const plain = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
// Food photos only: anything whose title, description or categories point to
// people (portraits, selfies, crowds, families) is rejected, so a search like
// "Diwali" never shows someone's face.
export const PEOPLE = /\b(portraits?|selfies?|faces?|people|persons?|man|men|woman|women|girls?|boys?|child(ren)?|kids?|bab(y|ies)|famil(y|ies)|couples?|crowds?|wedding|bride|groom|actor|actress|politician|minister|singer|celebrit\w*|head ?shot|smiling|posing|mr\.?|mrs\.?|ms\.?|sri|smt)\b/i
// Events (festival / party names) need a food word too, else festival photos win.
export const FOODISH = /\b(food|foods|dish(es)?|cuisine|meal|sweets?|dessert|snacks?|cake|curry|rice|bread|soup|salad|platter|thali|mithai|ladd?oo|barfi|halwa|cookies?|pie|roast|feast|dinner|lunch|breakfast|plate|bowl|cooking|cooked|fried|baked|grilled|recipe)\b/i
// Not a photo of food: book scans, drawings, posters, maps.
const NOT_PHOTO = /\b(book|page|scan(ned)?|illustration|drawing|engraving|lithograph|painting|poster|advertisement|advert|diagram|map|logo|stamp|label|menu card|newspaper|magazine)\b/i
const NEG = '-portrait -selfie -people -woman -man -girl -boy -family -wedding -crowd'
export async function secondaryCandidates(dish, fetchImpl = fetch) {
  const q = words(dish.name).slice(0, 4).join(' ')
  if (!q) return []
  const event = dish.kind === 'event'
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search', gsrnamespace: '6', gsrlimit: event ? '20' : '12',
    gsrsearch: `filetype:bitmap ${q} food ${NEG}`,
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '480', iiextmetadatafilter: 'Artist|LicenseShortName|ImageDescription|Categories',
  })
  let j
  try {
    const r = await fetchImpl(`${SECONDARY_API}?${params}`, { credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) return []
    j = await r.json()
  } catch { return [] }
  const want = new Set(words(dish.name))
  return (j?.query?.pages || [])
    .map(p => ({ p, ii: p.imageinfo?.[0] }))
    .filter(({ ii }) => ii && /^image\/(jpeg|png|webp)$/.test(ii.mime) && checkDimensions(ii.thumbwidth, ii.thumbheight))
    .map(({ p, ii }) => {
      const hits = words(p.title).filter(w => want.has(w)).length
      const about = [p.title, ii.extmetadata?.ImageDescription?.value, ii.extmetadata?.Categories?.value].map(x => String(x || '').replace(/<[^>]+>/g, ' ')).join(' | ')
      return { url: ii.thumburl, page: ii.descriptionurl, author: plain(ii.extmetadata?.Artist?.value) || 'Unknown author',
        license: plain(ii.extmetadata?.LicenseShortName?.value), score: hits / Math.max(1, want.size), title: p.title,
        people: PEOPLE.test(about) || NOT_PHOTO.test(p.title), food: FOODISH.test(about) }
    })
    .filter(c => c.license && c.score > 0 && !c.people && (!event || c.food) && sanitizeImageUrl(c.url))
    .sort((a, b) => b.score - a.score)
}

// ── resolver ────────────────────────────────────────────────────────────────
const CACHE_KEY = 'souschef_img_cache'
const CACHE_MAX = 600
// Bump when the search rules change: the whole cache is redone (v2: no people photos).
const CACHE_V = 2
const readCache = () => { const c = getJSON(CACHE_KEY, {}); return c.__v === CACHE_V ? c : { __v: CACHE_V } }
// Cached results are re-checked on read (the cache can come from an imported file).
const cacheGet = (k) => {
  const v = readCache()[k]
  if (v == null) return v
  return sanitizeImageUrl(v.url) ? { ...v, url: sanitizeImageUrl(v.url) } : undefined
}
function cacheSet(k, v) {
  const c = readCache()
  c[k] = v
  const keys = Object.keys(c).filter(x => x !== '__v')
  if (keys.length > CACHE_MAX) for (const old of keys.slice(0, keys.length - CACHE_MAX)) delete c[old]
  setJSON(CACHE_KEY, c)
}
const inflight = new Map()

// dish: { slug, name, kind?: 'event', primary?: { url, author, license, page } }
// -> { url, author, license, page, tier: 'primary'|'secondary', approximate } | null
export function resolveImage(dish, { skipPrimary = false } = {}) {
  const key = `${dish.slug || dish.name}${skipPrimary ? '#2' : ''}`
  const hit = cacheGet(key)
  if (hit !== undefined) return Promise.resolve(hit)
  if (inflight.has(key)) return inflight.get(key)
  const p = (async () => {
    if (!skipPrimary && dish.primary?.url && (await validateImage(dish.primary.url)).ok) {
      return { ...dish.primary, url: sanitizeImageUrl(dish.primary.url), tier: 'primary', approximate: false }
    }
    for (const c of (await secondaryCandidates(dish)).slice(0, 3)) {
      if ((await validateImage(c.url)).ok) {
        return { url: sanitizeImageUrl(c.url), author: c.author, license: c.license, page: c.page, tier: 'secondary', approximate: c.score < 1 }
      }
    }
    return null
  })().then(v => { cacheSet(key, v); return v }, () => null).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// React hook. Returns { photo, onError } — photo null => render the placeholder.
export function useDishImage(dish) {
  const [state, setState] = useState({ key: null, photo: null, skipPrimary: false })
  const key = dish ? `${dish.slug || dish.name}` : null
  useEffect(() => {
    if (!dish) return
    let alive = true
    resolveImage(dish, { skipPrimary: state.key === key && state.skipPrimary }).then(photo => { if (alive) setState(s => ({ ...s, key, photo })) })
    return () => { alive = false }
  }, [key, state.skipPrimary]) // eslint-disable-line react-hooks/exhaustive-deps
  const photo = state.key === key ? state.photo : null
  // Broken at render time: drop the cached result and move down a tier.
  const onError = () => {
    if (!photo) return
    if (photo.tier === 'primary') cacheSet(key, undefined) // re-resolve, starting at tier 2
    else cacheSet(`${key}#2`, null)                        // tier 2 broke too: placeholder
    setState({ key, photo: null, skipPrimary: true })
  }
  return { photo, onError }
}
