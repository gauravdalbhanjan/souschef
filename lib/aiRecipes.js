// Saved AI recipes + on-device feedback. Feedback re-ranks results and picks
// prompt examples for this user; it never changes the model or any safety rule.
import { read, write } from './deviceStore.js'
import { findPhoto } from './images.js'

export const FEEDBACK_REASONS = [
  { id: 'ingredients', label: 'Wrong ingredients' }, { id: 'taste', label: 'Didn\u2019t taste good' },
  { id: 'steps', label: 'Steps unclear' }, { id: 'unsafe', label: 'Unsafe or wrong temperature' }, { id: 'photo', label: 'Photo doesn\u2019t match' },
]
export const FEEDBACK_NOTE = 'Your feedback stays on this device and helps order your suggestions.'

export const savedAiRecipes = () => read('aiRecipes').filter(r => !r.hidden)
export function saveAiRecipe(recipe) {
  const list = read('aiRecipes').filter(r => r.slug !== recipe.slug)
  list.unshift(recipe)
  write('aiRecipes', list.slice(0, 200))
}
export function updateAiRecipe(slug, patch) {
  write('aiRecipes', read('aiRecipes').map(r => (r.slug === slug ? { ...r, ...patch, ai: { ...r.ai, ...(patch.ai || {}) } } : r)))
}

export const feedbackFor = (slug) => read('feedback')[slug] || null
export function setFeedback(slug, vote, reasons = []) {
  const fb = read('feedback')
  fb[slug] = { vote, reasons: reasons.slice(0, 6), at: new Date().toISOString() }
  write('feedback', fb)
  if (reasons.includes('unsafe')) {
    // Hide at once and keep a local report.
    updateAiRecipe(slug, { hidden: true })
    write('reports', [...read('reports'), { slug, reason: 'unsafe', at: new Date().toISOString() }])
  }
}

// Liked AI recipe titles -> prompt examples (on device only).
export function likedTitles() {
  const fb = read('feedback')
  return savedAiRecipes().filter(r => fb[r.slug]?.vote === 'up').map(r => r.name).slice(0, 3)
}

// Thumbs up first, thumbs down last, otherwise keep order.
export function rerank(list) {
  const fb = read('feedback')
  const w = (r) => (fb[r.slug]?.vote === 'up' ? -1 : fb[r.slug]?.vote === 'down' ? 1 : 0)
  return [...list].map((r, i) => [r, i]).sort((a, b) => w(a[0]) - w(b[0]) || a[1] - b[1]).map(x => x[0])
}

// What an export contains (shown before exporting).
export function feedbackExport() {
  const fb = read('feedback')
  const names = new Map(read('aiRecipes').map(r => [r.slug, r.name]))
  return { feedback: Object.entries(fb).map(([slug, v]) => ({ recipe: names.get(slug) || slug, vote: v.vote, reasons: v.reasons, at: v.at })), reports: read('reports') }
}

// "Photo doesn't match": search again, excluding photos already shown.
export async function replacePhoto(recipe) {
  const tried = [...(recipe.ai?.photoTried || []), recipe.ai?.photo?.id].filter(Boolean)
  const photo = await findPhoto(dishFor(recipe), { exclude: tried })
  updateAiRecipe(recipe.slug, { ai: { photo, photoTried: tried } })
  return photo
}

export const dishFor = (r) => ({
  cuisine: r.ai?.cuisine, dishType: r.ai?.dish_type,
  ingredients: r.ingredients.filter(i => !i.staple).map(i => i.display.toLowerCase()).slice(0, 3),
})
