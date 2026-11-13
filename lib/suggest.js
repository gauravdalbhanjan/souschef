// Autocomplete for the manual "Item name" field: known pantry items first,
// then common ingredients from the normalizer dictionary. Starts at 2 letters.
import { DICT, displayForCanonical } from './normalize.js'

export const MIN_CHARS = 2

// Common ingredient names, title-cased once (canonical + a few useful aliases).
const COMMON = (() => {
  const out = new Set()
  for (const [canonical, , phrases] of DICT) {
    out.add(displayForCanonical(canonical))
    // Multi-word aliases only ("Baby Spinach", "Red Onion"); skips plural/spelling twins.
    for (const p of phrases.slice(1, 4)) if (p.includes(' ')) out.add(p.replace(/\b\w/g, c => c.toUpperCase()))
  }
  return [...out]
})()

// Rank: whole name starts with query > a word starts with query > contains it.
function score(name, q) {
  const n = name.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.split(/[\s-]+/).some(w => w.startsWith(q))) return 2
  if (q.length >= 3 && n.includes(q)) return 3
  return -1
}

// -> [{ name, inPantry }] (max `limit`), deduped case-insensitively.
export function suggestItems(query, pantryNames = [], limit = 6) {
  const q = String(query || '').trim().toLowerCase()
  if (q.length < MIN_CHARS) return []
  const seen = new Set()
  const ranked = []
  const consider = (name, inPantry) => {
    const key = name.toLowerCase()
    if (seen.has(key)) return
    const s = score(name, q)
    if (s < 0 || s === 0) return // nothing to suggest if it's already typed exactly
    seen.add(key)
    ranked.push({ name, inPantry, s: s - (inPantry ? 0.5 : 0) })
  }
  for (const n of pantryNames) if (n) consider(n, true)
  for (const n of COMMON) consider(n, false)
  return ranked.sort((a, b) => a.s - b.s || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit).map(({ name, inPantry }) => ({ name, inPantry }))
}
