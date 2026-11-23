// DISABLED IN THE APP (lib/features.js): kept in the repo for a future tier.
// Not imported by any runtime module; only tests use it.
// AI tiles: generate up to `max` new recipes for this filter, one at a time,
// and the model-proposed filter for Ask Chef.
import { applyFilter } from './guardrails/filter.js'
import { aiFilter, aiRecipe } from './aiTasks.js'
import { aiReady, generationAllowed, getLLMState } from './llm.js'
import { read } from './deviceStore.js'
import { saveAiRecipe, likedTitles, dishFor } from './aiRecipes.js'
import { findPhoto } from './images.js'

export const modelFilter = (text, recipes) => (aiReady() ? aiFilter(text, recipes) : Promise.resolve(null))

// onRecipe(recipe) is called as each one passes validation and the filter.
export async function generateTiles({ filter, pantry, staples, allergies = [], max = 2, onRecipe, onStatus, isCancelled, tag = null, timeoutMs, background = false, avoidTitles = [] }) {
  if (!generationAllowed()) return { made: 0, reason: getLLMState().killSwitch.generation ? 'off' : 'kill-switch' }
  const f = { ...(filter || {}), ...(allergies.length ? { allergens: [...new Set([...(filter?.allergens || []), ...allergies])] } : {}) }
  let made = 0
  for (let i = 0; i < max && !isCancelled?.(); i++) {
    onStatus?.(i)
    const res = await aiRecipe({ pantry, staples, kitchen: read('kitchen'), filter: f, likedTitles: likedTitles(), timeoutMs, background, avoidTitles })
    if (!res.ok && import.meta.env?.DEV) console.debug('[ai-recipe rejected]', res.errors?.slice(0, 4).join(' | '))
    if (!res.ok) { if (res.errors?.includes('cancelled')) break; continue }
    const r = res.recipe
    // Re-check the finished recipe against the same filter (code, not the model).
    const ok = applyFilter([{ ...r, cuisine: r.ai.cuisine, categories: r.ai.categories }], f, () => r.ingredients).shown.length === 1
    if (!ok) continue
    if (tag) Object.assign(r.ai, tag)
    r.ai.photo = await findPhoto(dishFor(r)).catch(() => null)
    saveAiRecipe(r)
    made++
    onRecipe?.(r)
  }
  return { made }
}
