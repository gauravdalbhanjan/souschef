// Ask Chef -> filter -> tiles. Code decides everything the user sees.
//   1. policy check (fixed refusals / medical note / blocked methods)
//   2. filter from the rule parser (on-device AI is off: lib/features.js)
//   3. apply to the recipes shown; never pad with unrelated recipes
// The AI parts (model filter, AI tiles) live in lib/aiSearch.js, unused.
import { checkRequest, MSG } from './guardrails/policy.js'
import { ruleFilter, applyFilter, filterChips } from './guardrails/filter.js'
import { allergyCheck } from './guardrails/allergens.js'
import { askChef } from './chef.js'
import { ingredientsBySlug } from '../api.js'

// -> { ok:false, message, sources? } | { ok:true, filter|null, fallback: [recipes]|null }
export async function understand(text, recipes) {
  const check = checkRequest(text)
  if (!check.ok) return { ok: false, message: check.message, sources: check.sources || null, kind: check.kind }
  const filter = ruleFilter(check.text, recipes)
  if (filter) return { ok: true, filter, fallback: null }
  // Existing rule-based Chef (dish names, "surprise me"...).
  const legacy = askChef(check.text, { suggestions: recipes })
  if (legacy.recipes?.length) return { ok: true, filter: null, fallback: legacy.recipes }
  return { ok: false, message: MSG.notUnderstood }
}

// Merge the filter-bar allergies into the request filter and apply.
export function results(recipes, filter, allergies = []) {
  const idx = ingredientsBySlug()
  const ingFor = (slug) => idx.get(slug) || []
  const f = allergies.length ? { ...(filter || {}), allergens: [...new Set([...(filter?.allergens || []), ...allergies])] } : filter
  const { shown, hiddenUnchecked } = applyFilter(recipes, f, ingFor)
  return { shown, hiddenUnchecked, chips: filterChips(filter) }
}

// Browse grid: only the allergy filter.
export function allergyFilter(recipes, allergies) {
  if (!allergies?.length) return { shown: recipes, hiddenUnchecked: 0 }
  const idx = ingredientsBySlug()
  let hiddenUnchecked = 0
  const shown = recipes.filter(r => {
    const a = allergyCheck(idx.get(r.slug) || [], allergies)
    if (!a.show && a.reason === 'unchecked') hiddenUnchecked++
    return a.show
  })
  return { shown, hiddenUnchecked }
}
