// "Ask Chef": a small, on-device intent engine for the home prompt.
// It understands dish names, ingredients ("something with chicken"), time
// ("under 15 minutes", "quick"), meal types, protein and "what can I make",
// plus "I bought …" / "scan a receipt" to start adding groceries.
// Nothing is sent anywhere; it ranks the user's own suggestions.
import { localCatalog } from './localCatalog.js'

const STOP = new Set(['with', 'and', 'the', 'some', 'something', 'make', 'cook', 'want', 'have', 'what', 'can',
  'for', 'that', 'this', 'meal', 'dish', 'food', 'like', 'please', 'today', 'tonight', 'give', 'show', 'find',
  'recipe', 'recipes', 'idea', 'ideas', 'quick', 'easy', 'fast', 'minutes', 'mins', 'minute', 'under', 'less',
  'than', 'mood', 'feel', 'feeling', 'craving', 'suggest', 'need', 'from', 'into', 'about', 'any', 'good'])

const CATEGORY_WORDS = {
  Breakfast: ['breakfast', 'morning', 'brunch'], Lunch: ['lunch'], Mains: ['dinner', 'main', 'supper'],
  Dessert: ['dessert', 'sweet', 'cake', 'treat'], Salad: ['salad'], Pasta: ['pasta', 'noodle', 'noodles'],
  Snack: ['snack', 'appetizer', 'party', 'dip'],
}
const PROTEIN_WORDS = {
  Vegetarian: ['vegetarian', 'veggie', 'meatless', 'vegan', 'plant'], Seafood: ['seafood', 'fish'],
  Chicken: ['chicken'], Eggs: ['egg', 'eggs'], Meat: ['meat', 'bacon', 'beef', 'pork'],
}

const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
const singular = (w) => (w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2)
  : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`)

// Shopping-style phrases mean "add groceries", not "find a recipe".
const BOUGHT = /\b(i (just )?(bought|got|picked up|purchased)|add (.+ )?to (my )?pantry|groceries|receipt|scan)\b/

export function askChef(text, { suggestions = [] } = {}) {
  const raw = String(text || '').trim()
  const q = raw.toLowerCase()
  if (!q) return null

  if (/^(hi|hey|hello|yo|hiya)\b/.test(q) && q.split(/\s+/).length <= 3) {
    return { reply: 'Hi! Tell me what you\u2019re in the mood for, or what you just bought.', recipes: [] }
  }
  if (/^(thanks|thank you|cheers)\b/.test(q)) return { reply: 'Anytime. Enjoy your meal!', recipes: [] }

  if (BOUGHT.test(q)) {
    const bought = raw.replace(/^.*?\b(bought|got|picked up|purchased)\b\s*/i, '')
    const items = /\b(bought|got|picked up|purchased)\b/i.test(raw) && !/^(some |my )?(groceries|stuff|food)\.?$/i.test(bought.trim())
      ? bought : ''
    return { reply: items ? 'Got it. Let\u2019s check those into your pantry.' : 'Let\u2019s add your groceries.', recipes: [], action: 'groceries', items }
  }

  const tokens = words(q).map(singular)
  let pool = [...suggestions]
  const said = []

  // Time
  const mins = q.match(/(\d+)\s*(m\b|min|mins|minute)/)
  if (mins) { const n = Number(mins[1]); pool = pool.filter(r => r.time_mins <= n); said.push(`${n}-minute`) }
  else if (/\b(quick|fast|easy|rush|hurry)\b/.test(q)) { pool = pool.filter(r => r.time_mins <= 15); said.push('quick') }

  // Meal type / category
  for (const [cat, ws] of Object.entries(CATEGORY_WORDS)) {
    if (ws.some(w => tokens.includes(singular(w)))) {
      const next = pool.filter(r => (r.categories || []).includes(cat))
      if (next.length || cat !== 'Pasta') { pool = next; said.push(cat.toLowerCase()) }
    }
  }

  // Protein
  if (/\bhigh[- ]?protein\b|\bprotein\b/.test(q)) { pool = pool.filter(r => (r.proteinG ?? 0) >= 25); said.push('high-protein') }
  for (const [p, ws] of Object.entries(PROTEIN_WORDS)) {
    if (p === 'Chicken' || p === 'Eggs') continue // treated as ingredients below
    if (ws.some(w => tokens.includes(singular(w)))) { pool = pool.filter(r => r.protein === p); said.push(p.toLowerCase()) }
  }

  // "What can I make?" -> prefer cookable now, but fall back to the closest
  // matches instead of saying nothing fits.
  let readyOnly = /\b(what can i (make|cook)|ready|right now|cook now|with what i have)\b/.test(q)
  if (readyOnly) {
    const cookable = pool.filter(r => r.haveAll)
    if (cookable.length) { pool = cookable; said.push('ready now') } else readyOnly = false
  }

  // Ingredients: recipes that use a mentioned ingredient
  const { recipes, byRecipe } = localCatalog()
  const ingWords = tokens.filter(w => w.length > 2 && !STOP.has(w))
  const ingHits = new Set()
  const ingNames = new Set()
  for (const r of recipes) {
    for (const ing of byRecipe.get(r.id) || []) {
      const c = ing.canonical
      const w = ingWords.find(t => c === t || c.split(' ').includes(t))
      if (w) { ingHits.add(r.slug); ingNames.add(w) }
    }
  }

  // Dish names: the whole name, or a distinctive (non-ingredient) word of it
  // ("salmon" alone is an ingredient search; "pancakes" or "caesar" is a dish).
  const named = pool.filter(r => {
    const nameWords = words(r.name).map(singular).filter(w => w.length > 2 && !STOP.has(w))
    const hitWords = nameWords.filter(w => tokens.includes(w))
    if (!nameWords.length || !hitWords.length) return false
    if (hitWords.length === nameWords.length) return true
    const distinctive = hitWords.filter(w => !ingNames.has(w))
    return distinctive.length >= 1 && hitWords.length / nameWords.length >= 0.5 && nameWords.length <= 3
  })

  let results = pool
  let lead
  if (named.length) {
    results = named
    lead = named.length === 1 ? `${named[0].name} it is.` : 'These match what you asked for.'
  } else if (ingNames.size) {
    results = pool.filter(r => ingHits.has(r.slug))
    lead = results.length ? `Here\u2019s what you can make with ${list([...ingNames])}.` : null
  } else if (readyOnly && said.length === 1) {
    lead = 'Here\u2019s what you can cook right now.'
  } else if (said.length) {
    lead = results.length ? `Here are some ${said.filter(s => s !== 'ready now').join(', ')} ideas${readyOnly ? ' you can cook right now' : ''}.` : null
  } else if (/\b(suggest|surprise|idea|hungry|anything|whatever|decide|recommend)\b/.test(q)) {
    results = pool
    lead = 'Here\u2019s what I\u2019d cook from your pantry.'
  } else {
    results = []
  }

  results = [...results].sort((a, b) => (a.haveAll !== b.haveAll ? (a.haveAll ? -1 : 1) : b.match - a.match)).slice(0, 10)
  if (!results.length) {
    return {
      reply: ingNames.size || said.length
        ? 'I couldn\u2019t find a dish that fits all of that. Try fewer details, like just an ingredient.'
        : 'I didn\u2019t catch a dish there. Try a dish, an ingredient, or \u201csomething quick\u201d.',
      recipes: [],
    }
  }
  const ready = results.filter(r => r.haveAll).length
  const tail = readyOnly ? ''
    : ready === results.length ? ' You have everything for all of them.'
    : ready ? ` ${ready} ${ready === 1 ? 'is' : 'are'} ready to cook now.`
    : ' You\u2019re missing a few ingredients for these.'
  return { reply: `${lead}${results.length === 1 ? (ready ? ' You have everything.' : '') : tail}`, recipes: results }
}

// Quick prompts under the input: "I bought groceries" and "Something in
// 10 mins" are always 1st and 2nd; the 3rd and 4th are a shuffled pick.
const PROMPT_POOL = ['What can I make now?', 'Vegetarian dinner', 'Breakfast ideas', 'High protein', 'Surprise me', 'Something with chicken']
// `seed` (0..1) keeps the pick stable across re-renders of one visit.
export function promptChips(pantryEmpty, seed = Math.random()) {
  let s = Math.floor(seed * 2147483646) + 1
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  // "What can I make now?" means nothing with an empty pantry.
  const pool = PROMPT_POOL.filter(p => !(pantryEmpty && p === 'What can I make now?'))
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return ['I bought groceries', 'Something in 10 mins', ...pool.slice(0, 2)]
}
