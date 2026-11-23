// Vercel serverless function: GET /api/image-search?source=<id>&q=<text>
// Holds the image API keys (env vars PEXELS_API_KEY, PIXABAY_API_KEY,
// UNSPLASH_ACCESS_KEY; never in the client or repo). Accepts ONLY a short
// text query, rate-limits per visitor, caches results, applies each API's
// safe-search option, and returns normalized candidates with credit data.
//
// GET /api/image-search?track=<unsplash download_location>   (Unsplash usage ping)
// GET /api/image-search?proxy=<pixabay image url>            (Pixabay forbids hotlinking: we fetch the bytes once for the client to store)
const MAX_Q = 100
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const CACHE_MS = 24 * 3600_000 // Pixabay requires caching results for 24 h
const hits = new Map()   // visitor -> [timestamps] (per warm instance; best effort)
const cache = new Map()  // key -> { at, body }
const UA = 'SousChef/1.0 (recipe app image search; https://souschef-hvj5.vercel.app)'

const json = (res, status, body, maxAge = 0) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', maxAge ? `public, s-maxage=${maxAge}, max-age=${maxAge}` : 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS)
  list.push(now)
  hits.set(ip, list)
  return list.length > MAX_PER_WINDOW
}

const clean = (q) => String(q || '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_Q)
const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').trim()

async function search(source, q, env) {
  if (source === 'pexels') {
    if (!env.PEXELS_API_KEY) return { skipped: 'no-key' }
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=10&orientation=square`, { headers: { Authorization: env.PEXELS_API_KEY } })
    if (!r.ok) return { error: r.status }
    const d = await r.json()
    return { results: (d.photos || []).map(p => ({ id: `pexels:${p.id}`, thumb: p.src?.medium, full: p.src?.large, author: p.photographer, authorUrl: p.photographer_url, page: p.url,
      text: `${p.alt || ''}`, credit: `Photo by ${p.photographer} on Pexels`, license: 'Pexels License', hotlink: true })) }
  }
  if (source === 'pixabay') {
    if (!env.PIXABAY_API_KEY) return { skipped: 'no-key' }
    const r = await fetch(`https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&image_type=photo&category=food&safesearch=true&per_page=10`)
    if (!r.ok) return { error: r.status }
    const d = await r.json()
    return { results: (d.hits || []).map(p => ({ id: `pixabay:${p.id}`, thumb: p.webformatURL, full: p.webformatURL, author: p.user, authorUrl: `https://pixabay.com/users/${p.user}-${p.user_id}/`, page: p.pageURL,
      text: p.tags || '', credit: `Image by ${p.user} from Pixabay`, license: 'Pixabay Content License', hotlink: false })) }
  }
  if (source === 'unsplash') {
    if (!env.UNSPLASH_ACCESS_KEY) return { skipped: 'no-key' }
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=10&content_filter=high`, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } })
    if (!r.ok) return { error: r.status }
    const d = await r.json()
    const utm = '?utm_source=souschef&utm_medium=referral'
    return { results: (d.results || []).map(p => ({ id: `unsplash:${p.id}`, thumb: p.urls?.small, full: p.urls?.regular, author: p.user?.name, authorUrl: `${p.user?.links?.html}${utm}`, page: `${p.links?.html}${utm}`,
      text: `${p.alt_description || ''} ${p.description || ''} ${(p.tags || []).map(t => t.title).join(' ')}`, credit: `Photo by ${p.user?.name} on Unsplash`, license: 'Unsplash License',
      hotlink: true, track: p.links?.download_location })) }
  }
  if (source === 'commons') {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!r.ok) return { error: r.status }
    const d = await r.json()
    const pages = Object.values(d.query?.pages || {})
    return { results: pages.map(p => {
      const ii = p.imageinfo?.[0] || {}
      const md = ii.extmetadata || {}
      const author = stripTags(md.Artist?.value) || 'Unknown author'
      const lic = md.LicenseShortName?.value || 'See file page'
      return { id: `commons:${p.pageid}`, thumb: ii.thumburl, full: ii.url, author, authorUrl: ii.descriptionurl, page: ii.descriptionurl,
        text: `${p.title || ''} ${stripTags(md.ImageDescription?.value)} ${stripTags(md.Categories?.value)}`, credit: `${author}, ${lic}, via Wikimedia Commons`, license: lic, hotlink: true }
    }).filter(x => x.thumb && /^(CC|Public domain|PD)/i.test(x.license)) }
  }
  return { error: 'unknown-source' }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method' })
  const url = new URL(req.url, 'http://x')
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (limited(ip)) return json(res, 429, { error: 'rate-limited' })
  const env = process.env

  const track = url.searchParams.get('track')
  if (track) {
    if (!/^https:\/\/api\.unsplash\.com\/photos\/[\w-]+\/download/.test(track) || !env.UNSPLASH_ACCESS_KEY) return json(res, 400, { error: 'bad-track' })
    await fetch(track, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }).catch(() => {})
    return json(res, 200, { ok: true })
  }
  const proxy = url.searchParams.get('proxy')
  if (proxy) {
    if (!/^https:\/\/pixabay\.com\/get\/[\w./-]+\.(jpg|jpeg|png)$/i.test(proxy)) return json(res, 400, { error: 'bad-proxy' })
    const r = await fetch(proxy)
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return json(res, 502, { error: 'fetch' })
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > 600_000) return json(res, 413, { error: 'too-large' })
    res.statusCode = 200
    res.setHeader('Content-Type', r.headers.get('content-type'))
    res.setHeader('Cache-Control', 'no-store')
    return res.end(buf)
  }

  const source = url.searchParams.get('source')
  const q = clean(url.searchParams.get('q'))
  if (!['pexels', 'pixabay', 'unsplash', 'commons'].includes(source) || q.length < 3) return json(res, 400, { error: 'bad-request' })
  const key = `${source}|${q}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return json(res, 200, hit.body, 86400)
  try {
    const body = await search(source, q, env)
    if (body.results) cache.set(key, { at: Date.now(), body })
    return json(res, body.error ? 502 : 200, body, body.results ? 86400 : 0)
  } catch {
    return json(res, 502, { error: 'upstream' })
  }
}
