// One ingredient name for matching dataset recipes against the pantry.
// Used by scripts/build-dataset.mjs (recipe side) and api.js (pantry side), so
// both sides reduce names the same way.
//   "Green Onions" -> onion        "potato starch" -> potato starch (not potato)
//   "Lentils"      -> lentil       "basmati rice"  -> rice
import { DICT, canonicalOf } from './normalize.js'

const PHRASE_WORDS = new Map(DICT.map(([c, , phrases]) => [c, new Set([c, ...phrases].flatMap(p => p.split(' ')))]))
const ADJ = /\b(fresh|large|small|medium|ripe|whole|chopped|minced|sliced|diced|finely|roughly|ground|dried|raw|boneless|skinless|cooked|plain|organic|light|dark|unsalted|salted|extra|virgin|lean)\b/g

function singular(s) {
  if (/[a-z]{2}ies$/.test(s)) return s.replace(/ies$/, 'y')
  if (/(tomato|potato|mango)es$|(ch|sh|x|ss)es$/.test(s)) return s.replace(/es$/, '')
  if (/[a-z]{2}[^su]s$/.test(s)) return s.replace(/s$/, '')
  return s
}

const ALIASES = { chile: 'chili', chilli: 'chili', 'chili pepper': 'chili', 'green chile': 'chili', scallion: 'onion', 'spring onion': 'onion', 'green onion': 'onion', coriander: 'cilantro' }
// Parse leftovers that aren't foods.
const JUNK = new Set(['each', 'unit', 'piece', 'pinch', 'dash', 'to taste', 'optional', 'handful', 'some', 'a few', 'more'])

export function canonicalFor(name) {
  const clean = String(name || '').toLowerCase().replace(/\(.*?\)/g, '').replace(ADJ, '').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean || JUNK.has(clean)) return ''
  const alias = ALIASES[clean] || ALIASES[singular(clean)]
  if (alias) return alias
  const hit = canonicalOf(clean)
  const last = clean.split(' ').pop()
  const words = PHRASE_WORDS.get(hit)
  // The app's canonical only when it's the same food (last word agrees).
  if (words && (words.has(last) || words.has(singular(last)))) return hit
  return singular(clean)
}
