// Conversational cooking: the script Chef talks you through, for any recipe.
//   mise en place (station tasks)  ->  cooking steps  ->  pantry sync
// Pure helpers only; CookingMode owns the state and the UI.

export const PREP_SECTION = 'Get everything ready'
const plain = (ins) => (ins.parts ? ins.text : `${ins.text || ''}${ins.highlight || ''}${ins.after || ''}`)

// Split a recipe into the two phases. Works for every recipe because the
// steps builder always puts the station setup first (lib/steps.js).
export function buildScript(recipe) {
  const all = recipe?.steps || []
  const prepStep = all.find(s => s.section === PREP_SECTION)
  return {
    prep: (prepStep?.instructions || []).map(ins => ({ ins, text: plain(ins) })),
    steps: all.filter(s => s.section !== PREP_SECTION),
    ingredients: recipe?.ingredients || [],
  }
}

// Ingredients mentioned in a line of text ("2 eggs" matches "Egg").
export function itemsIn(text, ingredients) {
  const t = ` ${String(text).toLowerCase()} `
  return ingredients.filter(ing => {
    const n = ing.display.toLowerCase()
    const stem = n.replace(/(es|s)$/, '')
    return t.includes(n) || (stem.length > 2 && new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(e?s)?\\b`).test(t))
  })
}

// Tested everyday swaps. Keyed by a word in the ingredient name.
const SUBS = {
  egg: 'For coating, use 3 tbsp milk or plain yogurt per egg. For batters, ¼ cup mashed banana or 3 tbsp unsweetened applesauce per egg works.',
  butter: 'Use the same amount of olive oil for cooking, or ¾ the amount of neutral oil in batters.',
  milk: 'Any unsweetened plant milk, or half water and half yogurt, swaps 1 to 1.',
  flour: 'Cornstarch works for coating (use ¾ the amount). For baking, a 1-to-1 gluten-free blend is the safest swap.',
  bread: 'Panko, crushed crackers or cornflakes make a great crumb.',
  breadcrumbs: 'Panko, crushed crackers or cornflakes make a great crumb.',
  mayonnaise: 'Greek yogurt with a squeeze of lemon swaps 1 to 1.',
  parmesan: 'Pecorino or any hard aged cheese. For dairy-free, 1 tbsp nutritional yeast per 10 g.',
  lemon: 'Lime juice, or half the amount of white wine vinegar.',
  lime: 'Lemon juice swaps 1 to 1.',
  honey: 'Maple syrup or agave, same amount.',
  yogurt: 'Sour cream or skyr swaps 1 to 1.',
  oil: 'Any neutral oil (canola, sunflower, avocado). Olive oil is fine below high heat.',
  garlic: '¼ tsp garlic powder per clove. Add it with the liquids so it doesn\u2019t burn.',
  onion: 'Shallot (use 2 per onion) or 1 tsp onion powder per ½ onion.',
  chili: 'A pinch of red pepper flakes per chili, or leave it out for no heat.',
  paprika: 'Chili powder (use half) or smoked paprika for a deeper flavour.',
  cumin: 'Ground coriander or curry powder, same amount.',
  ginger: '¼ tsp ground ginger per 1 tbsp fresh.',
  soy: 'Tamari (gluten-free) or coconut aminos, same amount.',
  cilantro: 'Flat-leaf parsley with a little extra lime.',
  spinach: 'Kale (remove stems, cook 2 minutes longer) or chard.',
  tomato: 'One 14 oz (400 g) can of chopped tomatoes per 3 fresh.',
  sugar: 'Brown sugar swaps 1 to 1 (slightly richer flavour).',
  chicken: 'Turkey breast or firm tofu (pressed dry) with the same timings. Tofu just needs to be golden.',
  salmon: 'Trout or arctic char, same timings.',
  shrimp: 'Diced chicken thigh (cook 4 to 5 minutes) or firm tofu.',
  rice: 'Cold cooked quinoa or cauliflower rice (fry it 2 minutes less).',
  spaghetti: 'Linguine or any long pasta with the same packet timing.',
  penne: 'Any short pasta: fusilli, rigatoni or farfalle.',
  pasta: 'Any shape works. Follow its packet time minus 1 minute.',
  potato: 'Sweet potato (roast 5 minutes less) or parsnips.',
  cheese: 'Any good melting cheese: cheddar, gruyère or mozzarella.',
  bacon: 'Pancetta, turkey bacon or smoked tofu.',
  tortilla: 'Large lettuce leaves or flatbread.',
  avocado: 'Mashed edamame with extra lime makes a bright stand-in.',
  banana: '½ cup unsweetened applesauce per banana.',
  berries: 'Any fresh or thawed frozen fruit.',
  pepper: 'Zucchini or mushrooms, same dice.',
  carrot: 'Frozen peas and carrots, or diced zucchini.',
  chickpeas: 'White beans or lentils, same amount.',
  croutons: 'Toasted torn bread or toasted nuts.',
  worcestershire: 'Soy sauce with a squeeze of lemon.',
  mustard: 'A little extra mayo with a pinch of mustard powder.',
}
const subKey = (name) => Object.keys(SUBS).find(k => String(name).toLowerCase().includes(k))
export const hasSub = (name) => !!subKey(name)
export function subAnswer(name) {
  const k = subKey(name)
  return k ? `Swap for ${name.toLowerCase()}: ${SUBS[k]}` : `I don\u2019t have a tested swap for ${name.toLowerCase()}. Keep it if you can, or skip it if it\u2019s only a garnish.`
}

// What did the user mean? (typed, tapped or spoken)
export function intent(raw) {
  const t = String(raw || '').toLowerCase().trim()
  if (!t) return { type: 'none' }
  const sub = t.match(/(?:\bsub(?:stitute)?|\bswap|\breplace|\binstead of|\bdon'?t have|\bout of)\s+(?:for\s+)?(?:the\s+|an?\s+|some\s+)?([a-z ]+?)\??$/)
  if (sub) return { type: 'sub', item: sub[1].trim() }
  const none = t.match(/^no ([a-z]+)\??$/) // "no eggs?"
  if (none) return { type: 'sub', item: none[1] }
  if (/\btimer\b/.test(t)) return { type: 'timer' } // before "start", which also means Done
  if (/^(done|did it|finished|ready|ok(ay)?|got it|yes|yep|next step|go|let'?s go|start|continue)\b/.test(t)) return { type: 'done' }
  if (/what'?s next|what next|coming up|after this/.test(t)) return { type: 'peek' }
  if (/repeat|again|say that|what was/.test(t)) return { type: 'repeat' }
  if (/^(back|previous|go back|undo)\b/.test(t)) return { type: 'back' }
  if (/how long|time left|how much time/.test(t)) return { type: 'time' }
  if (/timer/.test(t)) return { type: 'timer' }
  if (/^next\b/.test(t)) return { type: 'done' }
  return { type: 'unknown' }
}

const ACKS = ['Nice.', 'Great.', 'Perfect.', 'Got it.', 'Lovely.']
export const ack = (n) => ACKS[n % ACKS.length]
