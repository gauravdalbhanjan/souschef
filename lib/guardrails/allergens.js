// Allergen tags derived by CODE from ingredients (FDA major allergens, see
// sources.json "fda-allergens"). Never claims a recipe is "safe".
//
// contains:    the ingredient is (or always has) that allergen.
// mayContain:  packaged or processed items whose labels vary (soy sauce,
//              mayonnaise, bread...). Under ANY allergy filter these are
//              "couldn't be fully checked", so the recipe is hidden.
export const ALLERGY_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts' }, { id: 'tree-nuts', label: 'Tree nuts' }, { id: 'dairy', label: 'Dairy' },
  { id: 'eggs', label: 'Eggs' }, { id: 'gluten', label: 'Gluten' }, { id: 'soy', label: 'Soy' },
  { id: 'fish', label: 'Fish' }, { id: 'shellfish', label: 'Shellfish' }, { id: 'sesame', label: 'Sesame' },
]
export const ALLERGY_IDS = ALLERGY_OPTIONS.map(a => a.id)
export const allergyLabel = (id) => ALLERGY_OPTIONS.find(a => a.id === id)?.label || id

// canonical -> { contains: [], mayContain: true|false }
const T = (contains = [], mayContain = false) => ({ contains, mayContain })
export const ALLERGEN_TABLE = {
  // dairy
  milk: T(['dairy']), butter: T(['dairy']), cheese: T(['dairy']), parmesan: T(['dairy']), yogurt: T(['dairy']), cream: T(['dairy']),
  // eggs
  egg: T(['eggs']), mayonnaise: T(['eggs'], true),
  // gluten (wheat)
  flour: T(['gluten']), bread: T(['gluten'], true), pasta: T(['gluten'], true), tortilla: T([], true), croutons: T(['gluten'], true),
  oats: T([], true), // often processed alongside wheat
  // soy
  'soy sauce': T(['soy'], true), tofu: T(['soy']),
  // fish / shellfish
  salmon: T(['fish']), shrimp: T(['shellfish']), worcestershire: T(['fish'], true),
  // processed or blended
  'dijon mustard': T([], true), chili: T([], true), 'garlic powder': T([]), coffee: T([]), tea: T([]),
  bacon: T([], true), honey: T([]),
}
// Plain whole foods and single spices with no major allergen.
const PLAIN = ['tomato', 'onion', 'garlic', 'spinach', 'broccoli', 'bell pepper', 'carrot', 'zucchini', 'lettuce', 'potato', 'mushroom', 'cucumber',
  'avocado', 'lemon', 'lime', 'basil', 'cilantro', 'ginger', 'apple', 'banana', 'orange', 'berries', 'grapes', 'mango', 'chicken', 'beef', 'pork',
  'rice', 'beans', 'chickpeas', 'sugar', 'salt', 'black pepper', 'oil', 'olive oil', 'cumin', 'paprika', 'vinegar', 'water']
for (const c of PLAIN) if (!ALLERGEN_TABLE[c]) ALLERGEN_TABLE[c] = T([])

// -> { contains: Set, unknown: [canonical...] } for a list of ingredients.
export function allergenProfile(ingredients) {
  const contains = new Set()
  const unknown = []
  for (const ing of ingredients || []) {
    const row = ALLERGEN_TABLE[ing.canonical]
    if (!row) { unknown.push(ing.canonical); continue }
    row.contains.forEach(a => contains.add(a))
    if (row.mayContain) unknown.push(ing.canonical)
  }
  return { contains, unknown }
}

// Decide one recipe against the active allergy filter.
// -> { show: bool, reason: 'contains'|'unchecked'|null, found: [allergen] }
export function allergyCheck(ingredients, active) {
  if (!active?.length) return { show: true, reason: null, found: [] }
  const p = allergenProfile(ingredients)
  const found = active.filter(a => p.contains.has(a))
  if (found.length) return { show: false, reason: 'contains', found }
  if (p.unknown.length) return { show: false, reason: 'unchecked', found: [] }
  return { show: true, reason: null, found: [] }
}

export const allergyPageNote = (active) =>
  `No ${active.map(a => allergyLabel(a).toLowerCase()).join(', ')} ingredients found in this recipe\u2019s list. Hidden allergens are possible. Check labels.`
export const HIDDEN_NOTE = 'Some recipes are hidden because their ingredients couldn\u2019t be fully checked.'
