// Pantry-match engine.
// For a recipe + pantry snapshot, computes:
//   - match %   (share of required, non-staple ingredients you have enough of)
//   - missing[] (what you lack, with the shortfall)
//   - haveAll   (can you cook it right now)
//   - maxServings (how many servings the pantry can support -> "what's left")
import { toBase } from './normalize.js'

// Core ingredients: the protein a dish is built around. A recipe is only
// "relevant" when every non-optional core ingredient is in the pantry, so a
// pantry without salmon never surfaces Teriyaki Salmon, however high the match.
const CORE = /\b(chicken|beef|steak|veal|pork|ham|bacon|sausage|lamb|mutton|goat|turkey|duck|venison|salmon|tuna|cod|tilapia|halibut|trout|fish|shrimp|prawn|crab|lobster|scallop|mussel|clam|oyster|squid|octopus|anchov\w*|sardine|tofu|tempeh|paneer|seitan)\b/
export const isCore = (canonical) => CORE.test(String(canonical || '').toLowerCase())

// Build a canonical -> { baseAmount per base unit } map from pantry rows.
// Sums stock across brands/units within the same measurement family.
function indexPantry(pantryRows) {
  const map = new Map()
  for (const row of pantryRows) {
    const { base, amount } = toBase(row.quantity, row.unit)
    const key = row.canonical
    const cur = map.get(key) || {}
    cur[base] = (cur[base] || 0) + amount
    map.set(key, cur)
  }
  return map
}

// available amount of `canonical` in the base family that `neededBase` uses
function availableInBase(pantryIndex, canonical, neededBase) {
  const entry = pantryIndex.get(canonical)
  if (!entry) return 0
  if (entry[neededBase] != null) return entry[neededBase]
  // If families differ (e.g. recipe wants "unit" but pantry stored "g"),
  // fall back to any positive stock so a real item isn't marked fully missing.
  const anyPositive = Object.values(entry).some(v => v > 0)
  return anyPositive ? Infinity : 0
}

export function scoreRecipe(recipe, ingredients, pantryIndex, servings = null) {
  const targetServings = servings || recipe.servings || 1
  const scale = targetServings / (recipe.servings || 1)

  let required = 0
  let have = 0
  const missing = []
  let minServingRatio = Infinity // limits maxServings
  const coreMissing = []

  for (const ing of ingredients) {
    const needBase = toBase(ing.quantity * scale, ing.unit)
    const avail = availableInBase(pantryIndex, ing.canonical, needBase.base)

    // per-serving requirement for maxServings math
    const perServing = toBase(ing.quantity / (recipe.servings || 1), ing.unit)

    if (ing.staple) {
      // staples don't count against match, but still deplete if tracked
      if (perServing.amount > 0 && avail !== Infinity && avail > 0) {
        minServingRatio = Math.min(minServingRatio, avail / perServing.amount)
      }
      continue
    }

    required++
    const need = needBase.amount || 0
    const enough = need === 0 ? avail > 0 : avail >= need
    if (enough) {
      have++
    } else {
      if (!ing.optional && isCore(ing.canonical)) coreMissing.push(ing.canonical)
      missing.push({
        canonical: ing.canonical,
        display: ing.display,
        needed: round(ing.quantity * scale),
        unit: ing.unit,
        haveAmount: avail === Infinity ? null : round(fromBase(avail, ing.unit)),
      })
    }

    // maxServings: how many servings this ingredient alone supports
    if (perServing.amount > 0) {
      const ratio = avail === Infinity ? Infinity : avail / perServing.amount
      minServingRatio = Math.min(minServingRatio, ratio)
    }
  }

  const match = required === 0 ? 100 : Math.round((have / required) * 100)
  const maxServings = minServingRatio === Infinity ? null : Math.floor(minServingRatio)

  return {
    match,
    haveAll: missing.length === 0,
    missing,
    coreMissing,
    relevant: coreMissing.length === 0,
    maxServings,
    matchColor: match >= 85 ? 'green' : match >= 60 ? 'amber' : 'red',
  }
}

// convert a base amount back to a display in the requested unit family (rough)
function fromBase(amount, unit) {
  const probe = toBase(1, unit)
  return probe.amount ? amount / probe.amount : amount
}
function round(n) { return Math.round(n * 100) / 100 }

// Rank all recipes against the pantry. Returns recipes decorated with scoring.
export function rankRecipes(recipes, ingredientsByRecipe, pantryRows) {
  const idx = indexPantry(pantryRows)
  return recipes
    .map(r => {
      const ings = ingredientsByRecipe.get(r.id) || []
      const score = scoreRecipe(r, ings, idx)
      return { ...r, ...score }
    })
    .sort((a, b) => {
      // cookable-now first, then has its core protein, then higher match, then fewer missing, then faster
      if (a.haveAll !== b.haveAll) return a.haveAll ? -1 : 1
      if (a.relevant !== b.relevant) return a.relevant ? -1 : 1
      if (b.match !== a.match) return b.match - a.match
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length
      return a.time_mins - b.time_mins
    })
}
