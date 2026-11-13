// Per-recipe metadata that lives with the app (not the database): verified
// photo + credit, meal categories, protein source and approx protein grams.
// Both guest and signed-in modes read from here, so a stale database seed can
// never show an unverified photo.
import recipes from './recipes.json'

const bySlug = new Map(recipes.map(r => [r.slug, r]))

export function metaFor(slug) {
  const r = bySlug.get(slug)
  if (!r) return {}
  return {
    image: r.image,
    imageCredit: r.imageCredit || null,
    categories: r.categories || [],
    protein: r.protein || null,
    proteinG: r.proteinG ?? null,
  }
}

// ── Filters ─────────────────────────────────────────────────────────────────
export const TIME_FILTERS = [
  { id: 'any', label: 'Any time' },
  { id: 'u10', label: 'Under 10 min', test: m => m <= 10 },
  { id: 'u20', label: 'Under 20 min', test: m => m <= 20 },
  { id: 'u30', label: 'Under 30 min', test: m => m <= 30 },
  { id: 'o30', label: '30+ min', test: m => m > 30 },
]

export const PROTEIN_FILTERS = [
  { id: 'any', label: 'Any protein' },
  { id: 'high', label: 'High protein (25g+)', test: d => (d.proteinG ?? 0) >= 25 },
  { id: 'Chicken', label: 'Chicken', test: d => d.protein === 'Chicken' },
  { id: 'Meat', label: 'Meat', test: d => d.protein === 'Meat' },
  { id: 'Seafood', label: 'Seafood', test: d => d.protein === 'Seafood' },
  { id: 'Eggs', label: 'Eggs', test: d => d.protein === 'Eggs' },
  { id: 'Vegetarian', label: 'Vegetarian', test: d => d.protein === 'Vegetarian' },
]

export const CATEGORY_FILTERS = [
  { id: 'any', label: 'All dishes' },
  ...['Breakfast', 'Lunch', 'Mains', 'Pasta', 'Salad', 'Snack', 'Dessert']
    .map(c => ({ id: c, label: c, test: d => (d.categories || []).includes(c) })),
]

export function applyFilters(dishes, f) {
  const t = TIME_FILTERS.find(x => x.id === f.time)
  const p = PROTEIN_FILTERS.find(x => x.id === f.protein)
  const c = CATEGORY_FILTERS.find(x => x.id === f.category)
  return dishes.filter(d =>
    (!t?.test || t.test(d.time_mins)) &&
    (!p?.test || p.test(d)) &&
    (!c?.test || c.test(d)))
}
