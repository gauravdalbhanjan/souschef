// Scoring an image result against the dish (shared by the client and the
// /api/image-search function). One threshold and one blur constant.
export const MATCH_THRESHOLD = 0.5
export const BLUR_PX = 2 // CSS blur(2px) = 20% on a 0-10px scale

// Words that mean the result isn't a food photo (or isn't appropriate).
const REJECT = ['nude', 'naked', 'sexy', 'lingerie', 'bikini', 'blood', 'gore', 'weapon', 'gun', 'knife attack', 'drug', 'cigarette', 'smoking', 'alcohol', 'beer', 'wine',
  'cocktail', 'person', 'woman', 'man', 'girl', 'boy', 'child', 'portrait', 'selfie', 'model', 'fashion', 'dog', 'cat', 'pet', 'car', 'logo', 'text', 'meme', 'cartoon', 'illustration', 'drawing', 'map']
const FOOD = ['food', 'dish', 'meal', 'plate', 'bowl', 'cuisine', 'recipe', 'cooking', 'cooked', 'dinner', 'lunch', 'breakfast', 'dessert', 'salad', 'soup', 'curry', 'taco', 'rice',
  'pasta', 'noodle', 'sandwich', 'wrap', 'stew', 'roast', 'fried', 'grilled', 'baked', 'snack', 'homemade', 'delicious', 'tasty', 'vegetable', 'chicken', 'meat', 'fish']

export const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(w => w.length > 2)

// Only a generic description is ever searched: cuisine + dish type + up to 3
// main ingredient names. Never pantry amounts, brands or allergy details.
export function buildQuery({ cuisine, dishType, ingredients }) {
  const main = (ingredients || []).filter(Boolean).slice(0, 3)
  return [cuisine, dishType, ...main].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

// text: tags/alt/title of the result. -> { score 0..1, rejected }
export function scoreImage(text, { cuisine, dishType, ingredients }) {
  const t = new Set(tokens(text))
  const has = (w) => tokens(w).some(x => t.has(x) || [...t].some(y => y.startsWith(x) || x.startsWith(y)))
  if (REJECT.some(w => tokens(w).every(x => t.has(x)))) return { score: 0, rejected: true }
  const parts = [[cuisine, 1], [dishType, 1], ...(ingredients || []).slice(0, 3).map(i => [i, 2])].filter(([w]) => w)
  const total = parts.reduce((s, [, w]) => s + w, 0) || 1
  const got = parts.reduce((s, [w, wt]) => s + (has(w) ? wt : 0), 0)
  const foodish = FOOD.some(has) || (ingredients || []).some(has)
  if (!foodish) return { score: 0, rejected: true }
  return { score: Math.round((got / total) * 100) / 100, rejected: false }
}
