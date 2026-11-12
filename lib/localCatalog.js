// Recipe catalog bundled with the app (same data as supabase/seed_recipes.sql).
// Used by guest sessions so they work with no account and no database.
import recipesJson from './recipes.json'
import { stepsFor } from './steps.js'
import { canonicalOf, STAPLES } from './normalize.js'

let cached = null

export function localCatalog() {
  if (cached) return cached
  const recipes = []
  const byRecipe = new Map()
  recipesJson.forEach((r, idx) => {
    const id = idx + 1
    recipes.push({
      id, slug: r.slug, name: r.name, image: r.image, time_mins: r.time_mins,
      kcal: r.kcal, servings: r.servings, description: r.description || '',
      steps: stepsFor(r.slug, r.name, r.ingredients), source: r.source || 'bundled',
    })
    byRecipe.set(id, r.ingredients.map(ing => {
      const canonical = canonicalOf(ing.display)
      return {
        recipe_id: id, canonical, display: ing.display,
        quantity: Number(ing.quantity) || 0, unit: ing.unit || 'unit',
        optional: !!ing.optional, staple: !!ing.staple || STAPLES.has(canonical),
      }
    }))
  })
  cached = { recipes, byRecipe }
  return cached
}
