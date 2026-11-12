// Ingredient normalization: turn messy real-world strings (receipt lines,
// recipe ingredient lines, email rows) into a canonical, comparable form.
//
// Output shape: { canonical, display, category, quantity, unit, brand }

// ── Unit vocabulary ─────────────────────────────────────────────────────────
const UNIT_ALIASES = {
  g: 'g', gram: 'g', grams: 'g', gm: 'g',
  kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg',
  mg: 'mg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', '#': 'lb',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', ltr: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup',
  clove: 'clove', cloves: 'clove',
  can: 'can', cans: 'can',
  pack: 'pack', packs: 'pack', packet: 'pack', pkg: 'pack',
  bunch: 'bunch', bunches: 'bunch',
  head: 'head', heads: 'head',
  slice: 'slice', slices: 'slice',
  dozen: 'dozen',
  ct: 'unit', count: 'unit', ea: 'unit', each: 'unit', pcs: 'unit', piece: 'unit', pieces: 'unit',
}

// Rough conversion to a base unit within a "family" so we can compare
// recipe requirements vs pantry stock. Families: mass(g), volume(ml), count(unit).
const TO_BASE = {
  g: { base: 'g', factor: 1 }, kg: { base: 'g', factor: 1000 }, mg: { base: 'g', factor: 0.001 },
  oz: { base: 'g', factor: 28.35 }, lb: { base: 'g', factor: 453.59 },
  ml: { base: 'ml', factor: 1 }, l: { base: 'ml', factor: 1000 },
  tsp: { base: 'ml', factor: 4.93 }, tbsp: { base: 'ml', factor: 14.79 }, cup: { base: 'ml', factor: 236.6 },
  unit: { base: 'unit', factor: 1 }, dozen: { base: 'unit', factor: 12 },
  clove: { base: 'unit', factor: 1 }, can: { base: 'unit', factor: 1 },
  pack: { base: 'unit', factor: 1 }, bunch: { base: 'unit', factor: 1 },
  head: { base: 'unit', factor: 1 }, slice: { base: 'unit', factor: 1 },
}

export function toBase(quantity, unit) {
  const u = UNIT_ALIASES[String(unit || '').toLowerCase()] || 'unit'
  const conv = TO_BASE[u] || TO_BASE.unit
  return { base: conv.base, amount: (Number(quantity) || 0) * conv.factor }
}

// ── Category + canonical dictionary ─────────────────────────────────────────
// Maps many surface forms -> a canonical key + category. Keeps matching robust
// across receipts ("TOMATO ROMA"), recipes ("roma tomatoes"), etc.
export const DICT = [
  // Veggies
  ['tomato', 'Veggies', ['tomato', 'tomatoes', 'roma', 'cherry tomato']],
  ['onion', 'Veggies', ['onion', 'onions', 'red onion', 'yellow onion']],
  ['garlic', 'Veggies', ['garlic', 'garlic clove']],
  ['spinach', 'Veggies', ['spinach', 'baby spinach']],
  ['broccoli', 'Veggies', ['broccoli']],
  ['bell pepper', 'Veggies', ['bell pepper', 'capsicum', 'red pepper', 'green pepper']],
  ['carrot', 'Veggies', ['carrot', 'carrots']],
  ['zucchini', 'Veggies', ['zucchini', 'courgette']],
  ['lettuce', 'Veggies', ['lettuce', 'romaine', 'romaine lettuce', 'iceberg']],
  ['potato', 'Veggies', ['potato', 'potatoes']],
  ['mushroom', 'Veggies', ['mushroom', 'mushrooms']],
  ['avocado', 'Veggies', ['avocado', 'avocados']],
  ['cucumber', 'Veggies', ['cucumber']],
  ['basil', 'Veggies', ['basil', 'fresh basil']],
  ['cilantro', 'Veggies', ['cilantro', 'coriander']],
  ['ginger', 'Veggies', ['ginger']],
  ['chili', 'Veggies', ['chili', 'chilli', 'jalapeno', 'green chili']],
  // Fruits
  ['apple', 'Fruits', ['apple', 'apples']],
  ['banana', 'Fruits', ['banana', 'bananas']],
  ['lemon', 'Fruits', ['lemon', 'lemons']],
  ['lime', 'Fruits', ['lime', 'limes']],
  ['orange', 'Fruits', ['orange', 'oranges']],
  ['berries', 'Fruits', ['berries', 'strawberry', 'strawberries', 'blueberry', 'blueberries']],
  ['grapes', 'Fruits', ['grape', 'grapes']],
  ['mango', 'Fruits', ['mango', 'mangoes']],
  // Meat / protein
  ['chicken', 'Meat', ['chicken', 'chicken breast', 'chicken thigh', 'chicken strips']],
  ['beef', 'Meat', ['beef', 'ground beef', 'steak', 'mince']],
  ['pork', 'Meat', ['pork', 'pork chop']],
  ['bacon', 'Meat', ['bacon']],
  ['salmon', 'Meat', ['salmon']],
  ['shrimp', 'Meat', ['shrimp', 'prawn', 'prawns']],
  ['egg', 'Meat', ['egg', 'eggs']],
  ['tofu', 'Meat', ['tofu']],
  ['chickpeas', 'Meat', ['chickpea', 'chickpeas', 'garbanzo']],
  // Dairy
  ['milk', 'Dairy', ['milk', 'whole milk', 'skim milk']],
  ['butter', 'Dairy', ['butter']],
  ['cheese', 'Dairy', ['cheese', 'cheddar', 'mozzarella']],
  ['parmesan', 'Dairy', ['parmesan', 'parmesan cheese', 'parmigiano']],
  ['yogurt', 'Dairy', ['yogurt', 'greek yogurt', 'curd']],
  ['cream', 'Dairy', ['cream', 'heavy cream', 'sour cream']],
  ['mayonnaise', 'Dairy', ['mayonnaise', 'mayo']],
  // Staples
  ['pasta', 'Staples', ['pasta', 'spaghetti', 'penne', 'macaroni', 'noodles']],
  ['rice', 'Staples', ['rice', 'basmati', 'jasmine rice']],
  ['bread', 'Staples', ['bread', 'loaf', 'baguette', 'bread slice']],
  ['tortilla', 'Staples', ['tortilla', 'tortillas', 'wrap', 'flatbread']],
  ['flour', 'Staples', ['flour', 'all purpose flour', 'all-purpose flour']],
  ['sugar', 'Staples', ['sugar', 'brown sugar', 'caster sugar']],
  ['croutons', 'Staples', ['crouton', 'croutons']],
  ['beans', 'Staples', ['beans', 'black beans', 'kidney beans']],
  // Spices / oils (mostly staples -> assumed present)
  ['olive oil', 'Spices', ['olive oil', 'extra virgin olive oil', 'evoo']],
  ['oil', 'Spices', ['oil', 'vegetable oil', 'canola oil']],
  ['salt', 'Spices', ['salt', 'sea salt', 'kosher salt']],
  ['black pepper', 'Spices', ['black pepper', 'pepper', 'peppercorn']],
  ['cumin', 'Spices', ['cumin']],
  ['paprika', 'Spices', ['paprika']],
  ['garlic powder', 'Spices', ['garlic powder']],
  ['dijon mustard', 'Spices', ['dijon', 'dijon mustard', 'mustard']],
  ['worcestershire', 'Spices', ['worcestershire', 'worcestershire sauce']],
  ['soy sauce', 'Spices', ['soy sauce']],
  ['vinegar', 'Spices', ['vinegar', 'balsamic', 'red wine vinegar']],
  ['honey', 'Spices', ['honey']],
]

// Exposed for the fuzzy matcher (lib/fuzzy.js)
export const DICT_ENTRIES = DICT

// Typical shelf life (days) per canonical ingredient, from purchase.
// Perishables run out fast (few days); staples/spices last a long time.
// Used to compute "days left" and flag low/expiring items.
const SHELF_LIFE = {
  // Veggies
  tomato: 5, onion: 21, garlic: 30, spinach: 4, broccoli: 5, 'bell pepper': 10,
  carrot: 21, zucchini: 7, lettuce: 5, potato: 30, mushroom: 5, avocado: 4,
  cucumber: 7, basil: 5, cilantro: 5, ginger: 21, chili: 10,
  // Fruits
  apple: 14, banana: 5, lemon: 14, lime: 14, orange: 14, berries: 4, grapes: 7, mango: 5,
  // Meat / protein
  chicken: 3, beef: 3, pork: 3, bacon: 7, salmon: 2, shrimp: 2, egg: 21, tofu: 7, chickpeas: 365,
  // Dairy
  milk: 7, butter: 30, cheese: 21, parmesan: 30, yogurt: 10, cream: 10, mayonnaise: 60,
  // Staples
  pasta: 365, rice: 365, bread: 5, flour: 180, sugar: 720, croutons: 30, beans: 365, tortilla: 10,
  // Spices / oils
  'olive oil': 365, oil: 365, salt: 3650, 'black pepper': 720, cumin: 720, paprika: 720,
  'garlic powder': 720, 'dijon mustard': 180, worcestershire: 365, 'soy sauce': 365, vinegar: 720, honey: 3650,
}
export function shelfLifeDays(canonical) {
  return SHELF_LIFE[canonical] || 14 // sensible default for unknown items
}

// Clean, human display name for a canonical key (first phrase, title-cased).
const CANON_DISPLAY = new Map(DICT.map(([canonical, , phrases]) => [
  canonical,
  (phrases[0] || canonical).replace(/\b\w/g, c => c.toUpperCase()),
]))
export function displayForCanonical(canonical) {
  return CANON_DISPLAY.get(canonical) ||
    String(canonical || '').replace(/\b\w/g, c => c.toUpperCase())
}

// Ingredients we assume are always in the kitchen (don't hurt match score much)
export const STAPLES = new Set([
  'salt', 'black pepper', 'oil', 'olive oil', 'sugar', 'flour', 'water',
  'garlic powder', 'vinegar',
])

// Build a lookup from every surface phrase -> {canonical, category}
const PHRASE_MAP = new Map()
for (const [canonical, category, phrases] of DICT) {
  PHRASE_MAP.set(canonical, { canonical, category })
  for (const p of phrases) PHRASE_MAP.set(p, { canonical, category })
}
// Longest phrases first so "olive oil" beats "oil"
const PHRASES_BY_LEN = [...PHRASE_MAP.keys()].sort((a, b) => b.length - a.length)

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, dozen: 12 }

function parseFraction(s) {
  // "1/2", "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const num = Number(s)
  return Number.isFinite(num) ? num : null
}

// Detect a leading quantity + unit: "2 lbs", "1/2 cup", "3", "two"
function extractQtyUnit(text) {
  let t = text.trim()
  let quantity = 1
  let unit = 'unit'

  // leading number / fraction
  const qtyMatch = t.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))\s*/)
  if (qtyMatch) {
    const q = parseFraction(qtyMatch[1].trim())
    if (q != null) { quantity = q; t = t.slice(qtyMatch[0].length) }
  } else {
    const w = t.match(/^([a-z]+)\s+/i)
    if (w && NUM_WORDS[w[1].toLowerCase()] != null) {
      quantity = NUM_WORDS[w[1].toLowerCase()]
      t = t.slice(w[0].length)
    }
  }

  // unit token
  const unitMatch = t.match(/^([a-z#]+)\.?\s+/i)
  if (unitMatch) {
    const u = UNIT_ALIASES[unitMatch[1].toLowerCase()]
    if (u) { unit = u; t = t.slice(unitMatch[0].length) }
  }
  return { quantity, unit, rest: t.trim() }
}

// Common receipt brand tokens to peel off the front of a line
const BRAND_HINTS = [
  'organic', 'great value', "trader joe's", 'kirkland', '365 by whole foods',
  '365', 'whole foods', 'private selection', 'simple truth', 'signature',
  'store brand', "nature's promise", 'good & gather',
]

function extractBrand(text) {
  const lower = text.toLowerCase()
  for (const b of BRAND_HINTS) {
    if (lower.startsWith(b)) {
      return { brand: titleCase(b), rest: text.slice(b.length).trim() }
    }
  }
  return { brand: null, rest: text }
}

function titleCase(s) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function findCanonical(text) {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' '
  for (const phrase of PHRASES_BY_LEN) {
    if (lower.includes(' ' + phrase + ' ')) return PHRASE_MAP.get(phrase)
  }
  return null
}

// Main entry: parse a free-form ingredient / receipt line.
export function normalizeLine(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  let text = rawText.replace(/\s+/g, ' ').trim()
  if (!text) return null

  // Peel brand first (so store brands like "365" aren't read as a quantity),
  // then a leading quantity + unit.
  const { brand, rest: afterBrand } = extractBrand(text)
  const { quantity, unit, rest: afterQty } = extractQtyUnit(afterBrand)
  const hit = findCanonical(afterQty) || findCanonical(text)

  const canonical = hit ? hit.canonical : afterQty.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const category = hit ? hit.category : 'Other'
  if (!canonical) return null

  // Clean the display label: drop trailing weight/qty noise and dangling dashes.
  const displayRaw = (afterQty || canonical)
    .replace(/\b\d+(\.\d+)?\s*(lb|lbs|kg|oz|g|gal|ml|l|ct|count|pack|pk)\b.*$/i, '')
    .replace(/[-–—\s]+$/,'')
    .trim()

  return {
    canonical,
    display: titleCase(displayRaw || canonical) || titleCase(canonical),
    category,
    quantity,
    unit,
    brand,
    staple: STAPLES.has(canonical),
  }
}

// Normalize just a name (recipe ingredient without a fancy quantity string)
export function canonicalOf(name) {
  const hit = findCanonical(name)
  return hit ? hit.canonical : String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function categoryOf(name) {
  const hit = findCanonical(name)
  return hit ? hit.category : 'Other'
}
