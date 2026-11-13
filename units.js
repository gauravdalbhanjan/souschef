// Quantity-picker units. Defaults to US units (pounds when nothing more
// specific fits) and suggests the unit each item is actually sold in:
//   spinach -> oz (bag) · lettuce -> head · milk -> gallon · oil -> fl oz
//   sugar/flour/rice -> lb · eggs -> dozen · tomatoes/onions -> each
// The suggested unit is preselected and listed first; related units follow.
import { canonicalOf, categoryOf } from './lib/normalize.js'

const WEIGHT_LB = ['lb', 'oz', 'kg', 'g']
const WEIGHT_OZ = ['oz', 'lb', 'g', 'kg']
const LIQUID = ['fl oz', 'gal', 'qt', 'pt', 'cup', 'l', 'ml']
const LEAFY = ['bunch', 'oz', 'lb', 'head']
const EACH = ['each', 'lb', 'oz', 'kg']

// canonical -> [defaultUnit, options]
const KINDS = {
  // leafy greens & herbs
  spinach: ['oz', LEAFY], cilantro: ['bunch', LEAFY], basil: ['bunch', LEAFY],
  lettuce: ['head', ['head', 'bunch', 'oz', 'lb']], broccoli: ['head', ['head', 'lb', 'oz']],
  // produce bought by the piece
  tomato: ['each', EACH], onion: ['each', EACH], potato: ['each', EACH], 'bell pepper': ['each', EACH],
  carrot: ['each', EACH], zucchini: ['each', EACH], cucumber: ['each', EACH], avocado: ['each', EACH],
  chili: ['each', EACH], apple: ['each', EACH], banana: ['each', EACH], lemon: ['each', EACH],
  lime: ['each', EACH], orange: ['each', EACH], mango: ['each', EACH],
  garlic: ['bulb', ['bulb', 'clove', 'oz']], ginger: ['oz', WEIGHT_OZ], mushroom: ['oz', WEIGHT_OZ],
  berries: ['oz', ['oz', 'pt', 'lb']], grapes: ['lb', WEIGHT_LB],
  // proteins
  chicken: ['lb', WEIGHT_LB], beef: ['lb', WEIGHT_LB], pork: ['lb', WEIGHT_LB], salmon: ['lb', WEIGHT_LB],
  shrimp: ['lb', WEIGHT_LB], bacon: ['slice', ['slice', 'lb', 'oz', 'pack']], tofu: ['oz', WEIGHT_OZ],
  egg: ['dozen', ['dozen', 'each']], chickpeas: ['can', ['can', 'oz', 'lb']], beans: ['can', ['can', 'oz', 'lb']],
  // dairy
  milk: ['gal', LIQUID], cream: ['pt', LIQUID], yogurt: ['oz', WEIGHT_OZ], butter: ['lb', ['lb', 'oz', 'tbsp']],
  cheese: ['oz', WEIGHT_OZ], parmesan: ['oz', WEIGHT_OZ], mayonnaise: ['oz', ['oz', 'fl oz', 'cup']],
  // dry staples
  sugar: ['lb', WEIGHT_LB], flour: ['lb', WEIGHT_LB], rice: ['lb', WEIGHT_LB], pasta: ['lb', WEIGHT_LB],
  oats: ['oz', WEIGHT_OZ], coffee: ['oz', WEIGHT_OZ], tea: ['each', ['each', 'oz', 'pack']],
  bread: ['loaf', ['loaf', 'slice']], tortilla: ['each', ['each', 'pack']], croutons: ['oz', WEIGHT_OZ],
  // liquids, oils & sauces
  'olive oil': ['fl oz', LIQUID], oil: ['fl oz', LIQUID], vinegar: ['fl oz', LIQUID],
  'soy sauce': ['fl oz', LIQUID], worcestershire: ['fl oz', LIQUID], honey: ['oz', ['oz', 'fl oz', 'lb']],
  // spices
  salt: ['oz', WEIGHT_OZ], 'black pepper': ['oz', WEIGHT_OZ], cumin: ['oz', WEIGHT_OZ],
  paprika: ['oz', WEIGHT_OZ], 'garlic powder': ['oz', WEIGHT_OZ], 'dijon mustard': ['oz', WEIGHT_OZ],
}

const BY_CATEGORY = {
  Veggies: ['each', EACH], Fruits: ['each', EACH], Meat: ['lb', WEIGHT_LB],
  Dairy: ['oz', WEIGHT_OZ], Spices: ['oz', WEIGHT_OZ], Staples: ['lb', WEIGHT_LB],
}

export const DEFAULT_UNIT = 'lb'
export const ALL_UNITS = ['lb', 'oz', 'each', 'dozen', 'bunch', 'head', 'bulb', 'clove', 'can', 'pack',
  'slice', 'loaf', 'gal', 'qt', 'pt', 'fl oz', 'cup', 'tbsp', 'kg', 'g', 'l', 'ml']

// Returns { unit, options, qty } for an item name (or canonical key).
export function suggestUnit(nameOrCanonical, category) {
  const canonical = canonicalOf(nameOrCanonical || '')
  const hit = KINDS[canonical] || BY_CATEGORY[category || categoryOf(nameOrCanonical || '')]
  const [unit, related] = hit || [DEFAULT_UNIT, WEIGHT_LB]
  const options = [...new Set([unit, ...related, ...ALL_UNITS])]
  return { unit, options, qty: DEFAULT_QTY[unit] || '1' }
}

// Sensible starting quantity per unit (one bag of spinach ≈ 5 oz, etc.).
const DEFAULT_QTY = { oz: '8', 'fl oz': '16', each: '3', slice: '8', bunch: '1', head: '1', gal: '1', lb: '1', dozen: '1' }

// Display labels: internal "unit" means "each"; "floz" is "fl oz".
export function unitLabel(u) {
  if (!u || u === 'unit') return 'each'
  if (u === 'floz') return 'fl oz'
  return u
}

export const QTY_OPTIONS = ['0.25', '0.5', '0.75', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '7', '8', '9', '10',
  '12', '14', '16', '20', '24', '28', '32', '48', '64']
