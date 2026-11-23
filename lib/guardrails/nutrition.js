// Nutrition estimates computed by CODE from the trimmed USDA FoodData Central
// table (lib/data/nutrition.json, CC0). Never a silent partial total: missing
// ingredients are listed.
import table from '../data/nutrition.json'
import { toGrams } from './convert.js'
import { canonicalOf } from '../normalize.js'

export const NUTRITION_META = table.meta

// One ingredient, for the amount the recipe uses (estimate, USDA FDC table).
// -> { status: 'ok', kcal, protein_g, carbs_g, fat_g, grams }
//  | { status: 'none' }      salt / water / to-taste amounts (about 0 kcal)
//  | { status: 'no-data' }   not in the local table
//  | { status: 'no-weight' } in the table, but this amount/unit can't be weighed
export function ingredientNutrition(ing) {
  if (!ing) return { status: 'no-data' }
  if (ing.canonical === 'water' || ing.canonical === 'salt') return { status: 'none' }
  const key = table.items[ing.canonical] ? ing.canonical : canonicalOf(ing.display || '')
  const item = table.items[key]
  if (!item?.per100g) return { status: 'no-data' }
  if (!(Number(ing.quantity) > 0)) return { status: 'none' }
  const g = toGrams(key, ing.quantity, ing.unit)
  if (g == null) return { status: 'no-weight' }
  const p = item.per100g
  const r = (v, d = 0) => Math.round((v || 0) * g / 100 * 10 ** d) / 10 ** d
  return { status: 'ok', kcal: r(p.kcal), protein_g: r(p.protein_g, 1), carbs_g: r(p.carbs_g, 1), fat_g: r(p.fat_g, 1), grams: Math.round(g) }
}

// -> { perServing: { kcal, protein_g, carbs_g, fat_g } | null, missing: [display], estimate: true, source: 'fdc' }
export function computeNutrition(ingredients, servings = 1) {
  const missing = []
  const sum = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  for (const ing of ingredients || []) {
    if (ing.canonical === 'water' || ing.canonical === 'salt') continue
    const item = table.items[ing.canonical]
    const g = item ? toGrams(ing.canonical, ing.quantity, ing.unit) : null
    if (!item || g == null || !item.per100g) { missing.push(ing.display || ing.canonical); continue }
    for (const k of Object.keys(sum)) sum[k] += (item.per100g[k] || 0) * g / 100
  }
  const s = Math.max(1, Number(servings) || 1)
  const perServing = missing.length ? null : {
    kcal: Math.round(sum.kcal / s / 10) * 10,       // nearest 10 kcal
    protein_g: Math.round(sum.protein_g / s),
    carbs_g: Math.round(sum.carbs_g / s),
    fat_g: Math.round(sum.fat_g / s),
  }
  return { perServing, missing, estimate: true, source: 'fdc', partialKcal: Math.round(sum.kcal / s) }
}
