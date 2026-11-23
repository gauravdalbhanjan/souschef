// Plausibility checks for AI recipes: banned pairs (owner-editable JSON) +
// "do the ingredients mostly fit this cuisine and dish type?".
import banned from './bannedPairs.json'

export const CUISINES = ['American', 'Indian', 'Mexican', 'Asian']
export const DISH_TYPES = ['breakfast', 'main', 'side', 'salad', 'soup', 'snack', 'dessert', 'sandwich', 'bowl']

// Neutral basics fit every cuisine.
const NEUTRAL = new Set(['salt', 'black pepper', 'oil', 'olive oil', 'water', 'onion', 'garlic', 'sugar', 'flour', 'butter', 'egg', 'rice', 'lemon', 'lime', 'tomato', 'chili', 'garlic powder', 'vinegar', 'honey'])

export const CUISINE_FIT = {
  American: ['chicken', 'beef', 'pork', 'bacon', 'potato', 'cheese', 'bread', 'lettuce', 'mayonnaise', 'milk', 'cream', 'mushroom', 'corn', 'beans', 'apple', 'berries', 'banana',
    'oats', 'pasta', 'broccoli', 'carrot', 'bell pepper', 'paprika', 'dijon mustard', 'worcestershire', 'salmon', 'shrimp', 'spinach', 'zucchini', 'yogurt', 'avocado', 'cucumber', 'tortilla', 'croutons', 'parmesan', 'basil'],
  Indian: ['chickpeas', 'beans', 'cumin', 'ginger', 'cilantro', 'yogurt', 'spinach', 'potato', 'chicken', 'paprika', 'cream', 'milk', 'bell pepper', 'carrot', 'cucumber', 'mango',
    'zucchini', 'broccoli', 'shrimp', 'salmon', 'tofu', 'mushroom', 'bread', 'tortilla', 'banana', 'tea', 'coffee'],
  Mexican: ['avocado', 'tortilla', 'beans', 'cilantro', 'cumin', 'bell pepper', 'cheese', 'chicken', 'beef', 'pork', 'shrimp', 'corn', 'mango', 'paprika', 'potato', 'zucchini',
    'cucumber', 'cream', 'yogurt', 'lettuce', 'egg', 'mushroom', 'spinach', 'salmon', 'chickpeas'],
  Asian: ['soy sauce', 'ginger', 'tofu', 'shrimp', 'chicken', 'pork', 'beef', 'broccoli', 'bell pepper', 'carrot', 'mushroom', 'spinach', 'cucumber', 'cilantro', 'basil',
    'zucchini', 'salmon', 'pasta', 'mango', 'egg', 'chili', 'tea', 'potato'],
}

const DESSERT_SWEET = ['sugar', 'honey', 'banana', 'berries', 'apple', 'mango', 'grapes', 'orange', 'yogurt', 'cream', 'milk', 'oats']
const MEAT_FISH = ['chicken', 'beef', 'pork', 'bacon', 'salmon', 'shrimp', 'worcestershire']

export function bannedPairIn(canonicals) {
  const set = new Set(canonicals)
  return banned.pairs.find(([a, b]) => set.has(a) && set.has(b)) || null
}

// -> { ok, reasons[] }
export function plausibility({ cuisine, dish_type, ingredients }) {
  const reasons = []
  const cs = ingredients.map(i => i.canonical)
  const pair = bannedPairIn(cs)
  if (pair) reasons.push(`banned-pair:${pair.join('+')}`)

  const fit = new Set(CUISINE_FIT[cuisine] || [])
  const core = cs.filter(c => !NEUTRAL.has(c))
  if (core.length) {
    const ratio = core.filter(c => fit.has(c)).length / core.length
    if (ratio < 0.6) reasons.push(`cuisine-fit:${ratio.toFixed(2)}`)
  }
  if (dish_type === 'dessert') {
    if (cs.some(c => MEAT_FISH.includes(c))) reasons.push('dessert-with-meat')
    if (!cs.some(c => DESSERT_SWEET.includes(c))) reasons.push('dessert-not-sweet')
  }
  return { ok: reasons.length === 0, reasons }
}
