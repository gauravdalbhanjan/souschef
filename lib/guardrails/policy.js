// Request policy, applied by CODE before any model sees the text.
// Fixed messages are written by us; the model never writes refusals.
import { DICT } from '../normalize.js'

export const RULES_VERSION = 'guardrails-2026-11-17'

export const MSG = {
  refuse: 'I can only help with cooking and recipes. Try different keywords.',
  medical: 'I can\u2019t give medical or diet advice. Please ask a professional.',
  notUnderstood: 'I didn\u2019t catch that. Try different keywords.',
  noMatch: 'No recipes match all filters',
}

const has = (text, words) => words.some(w => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text))

// Medical / special-needs topics -> fixed note, no advice.
const MEDICAL = ['diabet\\w*', 'insulin', 'blood sugar', 'pregnan\\w*', 'breastfeed\\w*', 'nursing mother', 'baby', 'babies', 'infant\\w*',
  'toddler\\w*', 'newborn', 'kidney disease', 'renal', 'dialysis', 'weight[- ]loss', 'lose weight', 'diet plan', 'meal plan for (losing|weight)',
  'choking', 'choke', 'safe age', 'what age', 'months old', 'cholesterol', 'blood pressure', 'hypertension', 'cancer', 'chemo\\w*',
  'allergic reaction', 'anaphyla\\w*', 'medication', 'medicine', 'cure (my|for|cancer|diabetes|disease|illness)', 'treat my', 'gout', 'ibs', 'celiac', 'eating disorder', 'anorexi\\w*', 'bulimi\\w*']

// Methods we never write (fixed text + source instead).
export const BLOCKED_METHODS = [
  { id: 'canning', words: ['canning', 'can (my own )?(tomatoes|beans|vegetables|meat|soup|corn|peaches|peppers|salsa|jam|fish|chicken)', 'home[- ]can\\w*', 'pressure[- ]can\\w*', 'water[- ]bath', 'jar(red)? (beans|meat|vegetables|soup)', 'preserv(e|ing) in jars', 'low[- ]acid preserv\\w*'], sources: ['nchfp', 'who-botulism'] },
  { id: 'curing', words: ['cur(e|ed|ing) (meat|ham|bacon|salmon|fish|sausage)', 'salt[- ]cur\\w*', 'dry[- ]cur\\w*', 'home[- ]cured', 'charcuterie', 'biltong', 'jerky', 'pemmican', 'dried (and salted )?meat', 'air[- ]dried (meat|ham|beef)', 'prosciutto at home', 'make (my own )?(salami|pastrami|bresaola)'], sources: ['who-botulism'] },
  { id: 'raw-fish', words: ['sushi', 'sashimi', 'ceviche', 'poke', 'crudo', 'tartare', 'carpaccio', 'raw (fish|salmon|tuna|seafood|oysters?|shrimp)', 'gravlax'], sources: ['fda-seafood'] },
  { id: 'ferment-meat-fish', words: ['ferment(ed|ing)? (meat|fish|sausage|shrimp|salmon)', 'fish sauce at home', 'surstr\\w+', 'rakfisk', 'garum'], sources: ['who-botulism'] },
  { id: 'raw-egg-meat', words: ['raw egg\\w*', 'runny egg', 'undercooked', 'rare (chicken|pork|burger)', 'pink chicken', 'steak tartare', 'eggnog', 'raw (meat|chicken|beef|pork)', 'cookie dough', 'raw dough', 'raw batter', 'raw flour'], sources: ['fda-safe-handling', 'fda-raw-flour'] },
]

export const BLOCKED_TEXT = {
  canning: 'Home canning and low-acid preserving can cause botulism when the method isn\u2019t lab-tested. SousChef doesn\u2019t write canning recipes. Use a tested method from the source below.',
  curing: 'Curing meat or fish at home has a botulism risk. SousChef doesn\u2019t write curing recipes. See the source below.',
  'raw-fish': 'SousChef only writes fully cooked recipes, so it doesn\u2019t write raw-fish dishes. See the source below about raw seafood.',
  'ferment-meat-fish': 'Fermenting meat or fish at home has a botulism risk. SousChef doesn\u2019t write these recipes. See the source below.',
  'raw-egg-meat': 'SousChef only writes fully cooked recipes: no raw or undercooked eggs, meat, fish or raw dough. See the source below.',
}

// Never food / harmful.
const HARMFUL = ['bleach', 'ammonia', 'chlorine', 'drain cleaner', 'detergent', 'antifreeze', 'poison\\w*', 'toxic', 'hemlock', 'nightshade berries', 'foxglove',
  'oleander', 'death cap', 'wild mushrooms?', 'forag\\w*', 'mushrooms? i found', 'puffer ?fish', 'fugu', 'elderberr(y|ies) raw', 'rhubarb leaves', 'apple seeds', 'apricot (kernels?|pits?)',
  'bitter almonds?', 'raw cassava', 'cassava leaves raw', 'jimson', 'datura', 'castor beans?', 'mistletoe', 'drug\\w*', 'cannabis', 'weed brownies?', 'edibles', 'thc', 'magic mushrooms?',
  'psilocybin', 'alcohol for (kids|children)', 'spike', 'roofie', 'weapon', 'explosive', 'meth', 'kill', 'hurt someone', 'laxative prank']
const PET = ['dog food', 'cat food', 'for (my |the )?(dog|cat|puppy|kitten|pet|bird|parrot|rabbit|hamster|horse|fish tank)', 'pet food', 'for pets?', 'dog treats?', 'cat treats?']

// Prompt-injection shapes: treat as not-a-cooking-request.
const INJECTION = ['ignore (all |the )?(previous|prior|above) (instructions|rules|prompts?)', 'disregard (the |all )?(rules|instructions)', 'system prompt', 'you are now',
  'act as', 'pretend (to be|you are)', 'developer mode', 'jailbreak', 'reveal (your|the) (prompt|instructions)', 'new instructions', '</?system>', 'assistant:']

// Food / cooking vocabulary: ingredients from the dictionary + cooking words.
const COOKING = ['cook\\w*', 'recipe\\w*', 'dish(es)?', 'meal\\w*', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack\\w*', 'dessert\\w*', 'bake\\w*', 'baking', 'roast\\w*', 'grill\\w*',
  'fry', 'fried', 'saut\\w*', 'boil\\w*', 'simmer\\w*', 'steam\\w*', 'stir', 'soup', 'stew', 'curry', 'salad', 'sandwich\\w*', 'wrap\\w*', 'pasta', 'noodle\\w*', 'rice', 'taco\\w*',
  'burrito\\w*', 'quesadilla\\w*', 'omelet\\w*', 'pancake\\w*', 'cake\\w*', 'cookie\\w*', 'bowl\\w*', 'food', 'eat', 'hungry', 'quick', 'easy', 'healthy', 'spicy', 'vegetarian',
  'vegan', 'gluten', 'dairy', 'protein', 'calorie\\w*', 'kcal', 'cuisine', 'indian', 'mexican', 'asian', 'american', 'chinese', 'thai', 'japanese', 'italian', 'party', 'guests?',
  'people', 'servings?', 'minutes?', 'mins?', 'tonight', 'leftovers?', 'pantry', 'ingredients?', 'similar', 'like', 'without', 'allerg\\w*', 'nut\\w*', 'peanut\\w*', 'sesame',
  'shellfish', 'fish', 'egg\\w*', 'meat', 'chicken', 'beef', 'pork', 'tofu', 'beans?', 'veggies', 'vegetables?', 'fruit\\w*', 'sweet', 'savory', 'comfort', 'light', 'filling',
  'lazy', 'tired', 'date night', 'kids?', 'family', 'picnic', 'bbq', 'barbecue', 'brownies?', 'muffins?', 'bread', 'toast', 'dip', 'sauce', 'marinat\\w*']
const FOOD_WORDS = [...new Set(DICT.flatMap(([c, , phrases]) => [c, ...phrases]).map(w => w.toLowerCase()))]

// English-only for now: common words from a few languages with no English words.
const ENGLISH = ['the', 'a', 'an', 'and', 'with', 'for', 'something', 'some', 'make', 'what', 'can', 'i', 'my', 'me', 'to', 'of', 'in', 'no', 'without', 'under', 'quick', 'want', 'need', 'please', 'recipe', 'dinner', 'lunch', 'breakfast', 'easy']
const FOREIGN = ['el', 'la', 'los', 'las', 'con', 'sin', 'para', 'receta', 'comida', 'quiero', 'und', 'mit', 'ohne', 'rezept', 'ich', 'le', 'les', 'avec', 'sans', 'recette', 'je', 'des', 'du', 'il', 'di', 'per', 'ricetta', 'voglio', 'com', 'sem', 'receita', 'eu', 'het', 'een', 'met', 'zonder', 've', 'bir', 'ile']

function isEnglish(text) {
  const letters = text.replace(/[^\p{L}]/gu, '')
  if (!letters.length) return false
  const ascii = letters.replace(/[^a-z]/gi, '').length
  if (ascii / letters.length < 0.85) return false
  const words = text.toLowerCase().match(/[a-z']+/g) || []
  const en = words.filter(w => ENGLISH.includes(w)).length
  const fo = words.filter(w => FOREIGN.includes(w)).length
  return !(fo >= 2 && fo > en)
}

const isFoodText = (text) => has(text, COOKING) || has(text, FOOD_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

// -> { ok: true } or { ok: false, kind, message, sources? }
export function checkRequest(raw) {
  const text = String(raw || '').slice(0, 300).trim()
  if (text.length < 2) return { ok: false, kind: 'empty', message: MSG.notUnderstood }
  if (!isEnglish(text)) return { ok: false, kind: 'language', message: MSG.notUnderstood }
  if (has(text, INJECTION)) return { ok: false, kind: 'injection', message: MSG.refuse }
  if (has(text, MEDICAL)) return { ok: false, kind: 'medical', message: MSG.medical }
  if (has(text, PET) || has(text, HARMFUL)) return { ok: false, kind: 'refuse', message: MSG.refuse }
  for (const m of BLOCKED_METHODS) {
    if (has(text, m.words)) return { ok: false, kind: 'blocked', method: m.id, message: BLOCKED_TEXT[m.id], sources: m.sources }
  }
  if (!isFoodText(text)) return { ok: false, kind: 'refuse', message: MSG.refuse }
  return { ok: true, text }
}

// The same harmful / blocked checks, for model OUTPUT text (titles, steps).
export function outputViolations(text) {
  const t = String(text || '')
  const out = []
  if (has(t, INJECTION)) out.push('injection')
  if (has(t, HARMFUL)) out.push('harmful')
  for (const m of BLOCKED_METHODS) if (has(t, m.words)) out.push(`blocked:${m.id}`)
  if (/https?:\/\/|www\.|\.com\b|\.org\b/i.test(t)) out.push('url')
  return out
}
