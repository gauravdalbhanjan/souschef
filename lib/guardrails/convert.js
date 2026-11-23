// One internal unit system (code-owned). Families: mass (g), volume (ml),
// count (unit). Cross-family conversion (cups -> grams) only through the
// gram weights in the USDA FoodData Central table (lib/data/nutrition.json).
import { toBase } from '../normalize.js'
import nutrition from '../data/nutrition.json'

export const ML_PER = { tsp: 4.93, tbsp: 14.79, cup: 236.6 }

// Same family only. Returns null when the units can't be compared.
export function convert(quantity, from, to) {
  const a = toBase(1, from), b = toBase(1, to)
  if (a.base !== b.base || !b.amount) return null
  return round((Number(quantity) || 0) * a.amount / b.amount, 4)
}

export const fToC = (f) => Math.round(((f - 32) * 5) / 9)
export const cToF = (c) => Math.round((c * 9) / 5 + 32)

// Grams for an ingredient amount, or null if the table has no weight for it.
export function toGrams(canonical, quantity, unit) {
  const q = Number(quantity) || 0
  const b = toBase(q, unit)
  if (b.base === 'g') return b.amount
  const item = nutrition.items[canonical]
  if (!item) return null
  const g = item.grams || {}
  if (b.base === 'ml') {
    for (const u of ['cup', 'tbsp', 'tsp']) if (g[u]?.g) return round((b.amount / ML_PER[u]) * g[u].g, 2)
    return null
  }
  // Count units: a weight for that exact unit (clove, slice, head, bunch) wins;
  // otherwise count single items (a dozen = 12) times the weight of one "unit".
  const key = String(unit || 'unit').toLowerCase()
  if (key !== 'unit' && g[key]?.g) return round(q * g[key].g, 2)
  if (!g.unit?.g) return null
  return round(b.amount * g.unit.g, 2)
}

export function round(n, dp = 2) { const f = 10 ** dp; return Math.round(n * f) / f }
