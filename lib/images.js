// One photo per AI recipe, found once at creation and saved with the recipe.
// Search order: Pexels, Pixabay, Unsplash, Wikimedia Commons (via
// /api/image-search, which holds the keys). Only a generic dish description is
// sent: cuisine + dish type + up to 3 main ingredient names.
import { buildQuery, scoreImage, MATCH_THRESHOLD } from './imageScore.js'

export const ORDER = ['pexels', 'pixabay', 'unsplash', 'commons']

// -> photo | null. photo: { url, thumb, author, authorUrl, page, credit, license, source, score, blurred, id }
export async function findPhoto(dish, { exclude = [], fetchImpl = fetch } = {}) {
  const q = buildQuery(dish)
  if (q.length < 3) return null
  let best = null
  for (const source of ORDER) {
    let body
    try {
      const r = await fetchImpl(`/api/image-search?source=${source}&q=${encodeURIComponent(q)}`)
      if (!r.ok) continue
      body = await r.json()
    } catch { continue }
    for (const c of body.results || []) {
      if (!c.thumb || exclude.includes(c.id)) continue
      const s = scoreImage(c.text, dish)
      if (s.rejected) continue
      if (!best || s.score > best.score) best = { ...c, source, score: s.score }
    }
    if (best && best.score >= MATCH_THRESHOLD) break // good enough: stop at this source
  }
  if (!best) return null
  let thumb = best.thumb
  // Pixabay forbids hotlinking: fetch the bytes once and store them with the recipe.
  if (!best.hotlink) {
    try {
      const r = await fetchImpl(`/api/image-search?proxy=${encodeURIComponent(best.thumb)}`)
      if (!r.ok) return null
      thumb = await blobToDataUrl(await r.blob())
    } catch { return null }
  }
  // Unsplash requires a download ping when a photo is used.
  if (best.track) fetchImpl(`/api/image-search?track=${encodeURIComponent(best.track)}`).catch(() => {})
  return {
    id: best.id, thumb, url: best.hotlink ? best.full : thumb, author: best.author, authorUrl: best.authorUrl, page: best.page,
    credit: best.credit, license: best.license, source: best.source, score: best.score, blurred: best.score < MATCH_THRESHOLD,
  }
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader()
  fr.onload = () => resolve(fr.result)
  fr.onerror = reject
  fr.readAsDataURL(blob)
})
