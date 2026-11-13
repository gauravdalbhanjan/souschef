// Kitchen staples: ingredients every recipe assumes you already have (salt,
// oil, flour…, see STAPLES in normalize.js and `staple` on recipe rows).
// Users can say "I'm out of this": an out staple counts like any other
// ingredient everywhere (match %, Missing / Restock, events, routines).
// A tracked amount is just a normal pantry row, so it depletes when you cook.
//
// Storage follows routines/events: per account in localStorage, guests in
// memory only. App calls configureStaples(key) when the session changes.
import { displayForCanonical } from './normalize.js'

let storageKey = null
let memOut = new Set()

export function configureStaples(key) { storageKey = key || null }
export function clearMemoryStaples() { memOut = new Set() }

export function outStaples() {
  if (!storageKey) return new Set(memOut)
  try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { return new Set() }
}

export function setStapleOut(canonical, out) {
  const s = outStaples()
  if (out) s.add(canonical); else s.delete(canonical)
  if (!storageKey) { memOut = s; return }
  try { localStorage.setItem(storageKey, JSON.stringify([...s])) } catch { /* storage full/blocked */ }
}

// Is this recipe ingredient still assumed to be on hand?
export const isStaple = (ing, out = outStaples()) => !!ing?.staple && !out.has(ing.canonical)

// Same catalog, with the user's "out" staples turned into regular ingredients.
export function applyStaples(byRecipe) {
  const out = outStaples()
  if (!out.size) return byRecipe
  const next = new Map()
  for (const [id, ings] of byRecipe) {
    next.set(id, ings.map(i => (i.staple && out.has(i.canonical) ? { ...i, staple: false } : i)))
  }
  return next
}

// Every staple the catalog assumes, with the recipes that lean on it.
// -> [{ canonical, display, unit, recipes: [name], out }] sorted by most used.
export function catalogStaples(recipes, byRecipe) {
  const names = new Map(recipes.map(r => [r.id, r.name]))
  const map = new Map()
  for (const [id, ings] of byRecipe) {
    for (const ing of ings) {
      if (!ing.staple) continue
      const cur = map.get(ing.canonical) || { canonical: ing.canonical, display: displayForCanonical(ing.canonical), unit: ing.unit, recipes: new Set() }
      if (names.has(id)) cur.recipes.add(names.get(id))
      map.set(ing.canonical, cur)
    }
  }
  const out = outStaples()
  return [...map.values()]
    .map(s => ({ ...s, recipes: [...s.recipes].sort(), out: out.has(s.canonical) }))
    .sort((a, b) => b.recipes.length - a.recipes.length || a.display.localeCompare(b.display))
}
