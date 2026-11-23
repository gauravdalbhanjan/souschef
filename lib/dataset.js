// Open recipe datasets (currently: Wikibooks Cookbook, CC BY-SA 4.0), built
// offline by scripts/build-dataset.mjs. Loaded only once the pantry has items,
// then matched on the device; the first open of the app loads nothing.
// Credits are shown as text. Users are never sent to the source site.
import { stepsFromText } from './steps.js'
import { requiredTemp } from './guardrails/foodSafety.js'
import { ingredientIcon } from './cookCues.js'
import { ingredientNutrition } from './guardrails/nutrition.js'

// Filter fields the bundled recipes carry in recipes.json, derived for dataset
// recipes from their name, dish type and ingredients (deterministic).
const CATEGORY_BY_TYPE = { breakfast: 'Breakfast', dessert: 'Dessert', salad: 'Salad', snack: 'Snack', side: 'Snack', main: 'Mains', soup: 'Lunch', sandwich: 'Lunch', bowl: 'Lunch' }
export function categoriesFor(name, type, ingredients) {
  const n = String(name || '').toLowerCase()
  const out = new Set()
  if (CATEGORY_BY_TYPE[type]) out.add(CATEGORY_BY_TYPE[type])
  if (/pancake|waffle|omelet|porridge|oatmeal|granola|french toast|breakfast|frittata|scrambled/.test(n)) out.add('Breakfast')
  if (/cake|cookie|biscuit|brownie|pie\b|tart\b|pudding|muffin|ice cream|fudge|candy|custard|crumble|cobbler|sorbet|meringue/.test(n)) out.add('Dessert')
  if (/salad|slaw/.test(n)) out.add('Salad')
  if (/soup|stew|chowder|sandwich|wrap|burger|bisque/.test(n)) out.add('Lunch')
  if (/\b(dip|chips|crackers|snack|popcorn|nuts)\b/.test(n)) out.add('Snack')
  if (/pasta|spaghetti|penne|macaroni|lasagn|noodle|fettuccine|linguine|ravioli|gnocchi/.test(n) || ingredients.some(i => i.canonical === 'pasta')) out.add('Pasta')
  if (!out.size && ingredients.some(i => ['poultry', 'meat', 'seafood'].includes(ingredientIcon(i).key))) out.add('Mains')
  return [...out]
}
export function proteinFor(ingredients, categories) {
  const keys = new Set(ingredients.filter(i => !i.optional).map(i => ingredientIcon(i).key))
  if (keys.has('poultry')) return 'Chicken'
  if (keys.has('meat')) return 'Meat'
  if (keys.has('seafood')) return 'Seafood'
  if (keys.has('egg') && !categories.includes('Dessert')) return 'Eggs'
  return 'Vegetarian'
}
// "High protein (25g+)": a lower bound from the ingredients with USDA data, so
// it's only true when the known part alone reaches 25 g per serving.
function highProtein(ingredients, servings) {
  let g = 0
  for (const i of ingredients) { const n = ingredientNutrition(i); if (n.status === 'ok') g += n.protein_g }
  return g / Math.max(1, servings) >= 25
}
import META from './data/datasetMeta.json'

// Bundled with the app (tiny): the true total without downloading the file.
export const DATASET_META = META

export const DATASET_URL = '/data/recipes-wikibooks.json'
export const DATASET_ID_BASE = 200000
// Only recipes that are this close to the pantry are shown.
export const MIN_MATCH = 60
export const MAX_SHOWN = 150

let data = null
let loading = null
const listeners = new Set()
export const onDatasetLoaded = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const datasetLoaded = () => data

// Minutes when the page gives no time: rough, from the step count.
const estimateMinutes = (steps) => Math.min(120, Math.max(15, 10 + steps * 5))
const commonsPage = (file) => `commons.wikimedia.org/wiki/File:${String(file).replace(/ /g, '_')}`

export function shapeDataset(json) {
  if (!json || !Array.isArray(json.recipes)) return null
  const src = json.source || {}
  const recipes = []
  const byRecipe = new Map()
  json.recipes.forEach((r, i) => {
    if (!r || typeof r.slug !== 'string' || !Array.isArray(r.i) || !Array.isArray(r.st)) return
    const id = DATASET_ID_BASE + i
    const ingredients = r.i.map(x => ({ recipe_id: id, canonical: String(x.c), display: String(x.d), quantity: Number(x.q) || 0, unit: x.u || 'unit', optional: !!x.o, staple: !!x.s, ...(x.p ? { prep: String(x.p) } : {}) }))
    const categories = categoriesFor(r.n, r.ty, ingredients)
    recipes.push({
      id, slug: r.slug, name: String(r.n), categories, protein: proteinFor(ingredients, categories), highProtein: highProtein(ingredients, r.sv || 4), time_mins: r.tm || estimateMinutes(r.st.length), timeEstimated: !r.tm,
      servings: r.sv || 4, kcal: null, description: '', cuisine: r.cu || null, dishType: r.ty || null,
      dataset: {
        id: src.id || 'dataset', name: src.name || 'Open recipe dataset', license: src.license || '', licenseUrl: src.licenseUrl || '',
        authors: src.authors || '', note: src.note || '', page: `en.wikibooks.org/wiki/Cookbook:${r.n.replace(/ /g, '_')}`,
      },
      primary: r.img ? { url: r.img.u, author: r.img.a, license: r.img.l, page: commonsPage(r.img.f) } : null,
      rawSteps: r.st,
    })
    byRecipe.set(id, ingredients)
  })
  return { recipes, byRecipe }
}

// Steps in the app's step shape (built on open).
export function datasetSteps(recipe, ingredients) {
  return stepsFromText(recipe.slug, recipe.name, ingredients, recipe.rawSteps || [])
}
// USDA/FDA internal temperatures for the proteins in a dataset recipe.
export function datasetTemps(ingredients) {
  const seen = new Map()
  for (const ing of ingredients) {
    const t = requiredTemp(ing)
    if (t && !seen.has(ing.canonical)) seen.set(ing.canonical, { canonical: ing.canonical, f: t.f, rest: t.rest || 0, source: t.source })
  }
  return [...seen.values()]
}

export function loadDataset(fetchImpl = fetch) {
  if (data) return Promise.resolve(data)
  loading ??= fetchImpl(DATASET_URL, { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => { data = shapeDataset(j); if (data) listeners.forEach(l => l()); return data })
    .catch(() => null)
    .finally(() => { if (!data) loading = null })
  return loading
}
