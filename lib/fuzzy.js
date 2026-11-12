// Fuzzy "closest pantry item" matcher.
//
// Receipt OCR is messy: "TOMATO ROMA", "GRND BEEF 80/20", "ORG BABY SPINACH".
// This maps a cleaned receipt string to the nearest known ingredient using a
// blend of token overlap (Jaccard) and normalized edit distance (Levenshtein).
// It's the lightweight, in-app version of the WineTone "closest concept"
// idea — no embeddings/DB, just string similarity against our dictionary.
import { DICT_ENTRIES } from './normalize.js'

// Common receipt abbreviations expanded before matching.
const ABBREV = {
  org: 'organic', grnd: 'ground', gr: 'ground', chkn: 'chicken', chick: 'chicken',
  bnls: 'boneless', sknls: 'skinless', bf: 'beef', tom: 'tomato', pot: 'potato',
  veg: 'vegetable', ched: 'cheddar', moz: 'mozzarella', yog: 'yogurt', bnana: 'banana',
  lb: '', lbs: '', ea: '', ct: '', pk: '', pkg: '', bag: '', box: '',
}

const STOP = new Set(['the', 'a', 'of', 'with', 'and', 'fresh', 'large', 'small', 'medium', 'pack', 'value', 'brand', 'natural'])

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(t => (ABBREV[t] !== undefined ? ABBREV[t] : t))
    .filter(t => t && !STOP.has(t) && !/^\d+$/.test(t))
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      prev = tmp
    }
  }
  return dp[m]
}

function tokenScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0
  const bSet = new Set(bTokens)
  let overlap = 0
  for (const t of aTokens) if (bSet.has(t)) overlap++
  const jaccard = overlap / (new Set([...aTokens, ...bTokens]).size)
  // best per-token edit similarity (catches "tomatos" vs "tomato")
  let best = 0
  for (const a of aTokens) for (const b of bTokens) {
    const d = levenshtein(a, b)
    const sim = 1 - d / Math.max(a.length, b.length)
    if (sim > best) best = sim
  }
  return 0.6 * jaccard + 0.4 * best
}

// Build searchable entries once from the dictionary phrases.
const ENTRIES = DICT_ENTRIES.flatMap(([canonical, category, phrases]) =>
  phrases.map(p => ({ canonical, category, phrase: p, tokens: tokens(p) })),
)

// Return the closest ingredient match for a raw/cleaned string.
// { canonical, category, display, score (0..1) } or null if nothing is close.
export function nearestIngredient(text) {
  const qTokens = tokens(text)
  if (!qTokens.length) return null

  let best = null
  for (const e of ENTRIES) {
    const score = tokenScore(qTokens, e.tokens)
    if (!best || score > best.score) best = { ...e, score }
  }
  if (!best || best.score < 0.34) return null
  return {
    canonical: best.canonical,
    category: best.category,
    display: best.phrase.replace(/\b\w/g, c => c.toUpperCase()),
    score: Math.round(best.score * 100) / 100,
  }
}
