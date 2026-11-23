// Scaling a recipe for a party size (code-owned rules, source "app-rules").
// Most ingredients scale linearly. Salt, spices and leavening scale less than
// linearly past double; cook times don't scale (larger batches are cooked in
// batches or take longer) so they are flagged, not multiplied.
export const MAX_SERVINGS = 24
const SEASONING = new Set(['salt', 'black pepper', 'cumin', 'paprika', 'chili', 'garlic powder', 'nutmeg', 'ginger'])
const LEAVENING = /baking (powder|soda)|yeast/i

// -> { recipe, flags: [{ canonical, note }] }
export function scaleRecipe(recipe, servings) {
  const target = Math.min(MAX_SERVINGS, Math.max(1, Math.round(Number(servings) || recipe.servings || 1)))
  const factor = target / (recipe.servings || 1)
  const flags = []
  const ingredients = recipe.ingredients.map(ing => {
    let f = factor
    if (factor > 2 && (SEASONING.has(ing.canonical) || LEAVENING.test(ing.display || ''))) {
      f = 2 + (factor - 2) * 0.5 // half rate beyond double, then taste and adjust
      flags.push({ canonical: ing.canonical, note: `${ing.display}: scaled less than linearly. Taste and add more if needed.` })
    }
    return { ...ing, quantity: Math.round(ing.quantity * f * 100) / 100 }
  })
  if (factor > 2) flags.push({ canonical: null, note: 'Cooking times don\u2019t scale: cook in batches so pans aren\u2019t crowded, and use the doneness cues and temperatures.' })
  return { recipe: { ...recipe, servings: target, ingredients }, flags, factor }
}
