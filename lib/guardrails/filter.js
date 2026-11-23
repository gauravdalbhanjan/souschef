// Chat -> structured filter -> tiles. The model may PROPOSE a filter (JSON);
// code validates it and applies it. A rule-based parser does the same with AI Off.
import { z } from 'zod'
import { DICT, canonicalOf } from '../normalize.js'
import { ALLERGY_IDS, allergyCheck, allergyLabel } from './allergens.js'
import { DIETS, dietTags } from './diet.js'
import { CUISINES, DISH_TYPES } from './plausibility.js'
import { regionOf, cuisineOptions } from '../cuisines.js'
import { computeNutrition } from './nutrition.js'

const CANONICALS = DICT.map(d => d[0])
export const CATALOG_CUISINE = {
  guacamole: 'Mexican', 'chickpea-curry': 'Indian', 'shrimp-fried-rice': 'Asian', 'caesar-salad': 'American', 'caesar-wrap': 'American',
  'bacon-ham-sandwich': 'American', 'chicken-nuggets': 'American', 'chicken-strips': 'American', 'chicken-fries': 'American', 'bundt-cake': 'American',
  'banana-pancakes': 'American', 'greek-yogurt-berry-bowl': 'American', 'veggie-omelette': 'American', 'garlic-butter-salmon': 'American',
}

export const FilterSchema = z.object({
  max_time: z.number().int().min(5).max(240).optional(),
  allergens: z.array(z.enum(ALLERGY_IDS)).max(9).optional(),
  diet: z.array(z.enum(DIETS)).max(4).optional(),
  max_kcal: z.number().int().min(100).max(2000).optional(),
  min_protein_g: z.number().int().min(1).max(150).optional(),
  include: z.array(z.string().max(30)).max(5).optional(),
  exclude: z.array(z.string().max(30)).max(5).optional(),
  servings: z.number().int().min(1).max(24).optional(),
  // A region (American, Indian, Mexican, Asian) or a cuisine name from the recipes ("Thai").
  cuisine: z.string().min(3).max(40).regex(/^[A-Z][A-Za-z ]+$/).optional(),
  dish_type: z.enum(DISH_TYPES).optional(),
  similar_to: z.string().max(60).optional(),
}).strict()

// Validate a proposed filter (from the model or the rules). Unknown values are
// dropped; returns null if nothing usable is left.
export function validateFilter(raw, recipes = []) {
  let data = raw
  if (typeof raw === 'string') { try { data = JSON.parse(raw) } catch { return null } }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  // Drop null/empty fields before strict validation.
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length) && v !== ''))
  const p = FilterSchema.safeParse(clean)
  if (!p.success) return null
  const f = { ...p.data }
  const canon = (list) => [...new Set((list || []).map(x => canonicalOf(x)).filter(c => CANONICALS.includes(c)))]
  if (f.include) f.include = canon(f.include)
  if (f.exclude) f.exclude = canon(f.exclude)
  if (f.similar_to) {
    const q = f.similar_to.toLowerCase()
    const hit = recipes.find(r => r.name.toLowerCase() === q || r.slug === q) || recipes.find(r => r.name.toLowerCase().includes(q))
    f.similar_to = hit ? hit.slug : undefined
  }
  for (const k of Object.keys(f)) if (f[k] == null || (Array.isArray(f[k]) && !f[k].length)) delete f[k]
  return Object.keys(f).length ? f : null
}

// Rule-based parser (works with AI Off).
const ALLERGY_WORDS = { peanuts: /peanut/, 'tree-nuts': /tree ?nuts?|almond|cashew|walnut|pecan|hazelnut|pistachio|\bnuts?\b/, dairy: /dairy|lactose|\bmilk\b/, eggs: /\beggs?\b/, gluten: /gluten|wheat/, soy: /\bsoy/, fish: /\bfish\b/, shellfish: /shellfish|shrimp|prawn|crab|lobster/, sesame: /sesame/ }
export function ruleFilter(text, recipes = []) {
  const t = String(text || '').toLowerCase()
  const f = {}
  const mins = t.match(/(?:under|less than|within|in|max(?:imum)?)?\s*(\d{1,3})\s*(?:-|\s)?(?:m\b|mins?|minutes?)/)
  if (mins) f.max_time = Number(mins[1])
  else if (/\b(quick|fast|rush|hurry)\b/.test(t)) f.max_time = 20
  const kcal = t.match(/(?:under|less than|below|max)\s*(\d{3,4})\s*(?:k?cal|calories)/)
  if (kcal) f.max_kcal = Number(kcal[1])
  const prot = t.match(/(?:at least|over|more than)?\s*(\d{1,3})\s*g(?:rams)?\s*(?:of\s*)?protein/)
  if (prot) f.min_protein_g = Number(prot[1])
  const people = t.match(/(?:for|serves?|feeds?)\s*(\d{1,2})\s*(?:people|persons?|guests?|servings?)?/)
  if (people) f.servings = Number(people[1])
  // Allergies: "no peanuts", "nut allergy", "allergic to eggs", "without dairy"
  const allergy = []
  for (const [id, re] of Object.entries(ALLERGY_WORDS)) {
    const m = new RegExp(`(no|without|free of|allerg\\w* to|avoid|${re.source}[- ]free|${re.source}\\s*allerg)`).test(t) && re.test(t)
    if (m && (new RegExp(`(no|without|avoid|allerg\\w*( to)?)\\s+(\\w+\\s+)?(${re.source})`).test(t) || new RegExp(`(${re.source})[- ](free|allerg)`).test(t))) allergy.push(id)
  }
  if (allergy.length) f.allergens = allergy
  const diet = []
  if (/vegetarian|veggie|meatless/.test(t)) diet.push('vegetarian')
  if (/\bvegan\b|plant[- ]based/.test(t)) diet.push('vegan')
  if (/gluten[- ]free/.test(t)) diet.push('gluten-free')
  if (/dairy[- ]free|lactose[- ]free/.test(t)) diet.push('dairy-free')
  if (diet.length) f.diet = diet
  for (const c of CUISINES) if (new RegExp(`\\b${c.toLowerCase()}\\b`).test(t)) f.cuisine = c
  if (/\b(chinese|thai|japanese|korean|vietnamese)\b/.test(t)) f.cuisine = 'Asian'
  // A specific cuisine the recipes have ("thai" -> Thai), longest name first.
  for (const { id } of cuisineOptions(recipes).sort((a, b) => b.id.length - a.id.length)) {
    if (new RegExp(`\\b${id.toLowerCase()}\\b`).test(t)) { f.cuisine = id; break }
  }
  for (const d of DISH_TYPES) if (new RegExp(`\\b${d}s?\\b`).test(t)) { f.dish_type = d; break }
  if (/\b(dinner|supper)\b/.test(t) && !f.dish_type) f.dish_type = 'main'
  // include / exclude ingredients
  const words = t.split(/[^a-z]+/)
  const exclude = [], include = []
  for (const [canon, , phrases] of DICT) {
    for (const p of [canon, ...phrases]) {
      if (!new RegExp(`\\b${p}s?\\b`).test(t)) continue
      if (new RegExp(`(no|without|skip|minus|hold the)\\s+(\\w+\\s+)?${p}`).test(t)) exclude.push(canon)
      else if (!(f.allergens || []).length || !Object.values(ALLERGY_WORDS).some(re => re.test(p))) include.push(canon)
      break
    }
  }
  if (include.length) f.include = [...new Set(include)].slice(0, 5)
  if (exclude.length) f.exclude = [...new Set(exclude)].slice(0, 5)
  const like = t.match(/(?:like|similar to)\s+(?:the\s+)?([a-z ]{3,40})/)
  if (like) f.similar_to = like[1].trim()
  void words
  return validateFilter(f, recipes)
}

// Chip labels for understood filters (each removable by key).
export function filterChips(f) {
  if (!f) return []
  const out = []
  if (f.max_time) out.push({ key: 'max_time', label: `Under ${f.max_time} min` })
  if (f.max_kcal) out.push({ key: 'max_kcal', label: `Under ${f.max_kcal} kcal` })
  if (f.min_protein_g) out.push({ key: 'min_protein_g', label: `${f.min_protein_g}g+ protein` })
  if (f.servings) out.push({ key: 'servings', label: `${f.servings} people` })
  if (f.cuisine) out.push({ key: 'cuisine', label: f.cuisine })
  if (f.dish_type) out.push({ key: 'dish_type', label: f.dish_type[0].toUpperCase() + f.dish_type.slice(1) })
  for (const d of f.diet || []) out.push({ key: `diet:${d}`, label: d[0].toUpperCase() + d.slice(1) })
  for (const a of f.allergens || []) out.push({ key: `allergens:${a}`, label: `No ${allergyLabel(a).toLowerCase()}` })
  for (const c of f.include || []) out.push({ key: `include:${c}`, label: `With ${c}` })
  for (const c of f.exclude || []) out.push({ key: `exclude:${c}`, label: `No ${c}` })
  if (f.similar_to) out.push({ key: 'similar_to', label: `Like ${f.similar_to.replace(/-/g, ' ')}` })
  return out
}

export function removeChip(f, key) {
  const next = { ...f }
  const [k, v] = key.split(':')
  if (v) { next[k] = (next[k] || []).filter(x => x !== v); if (!next[k].length) delete next[k] } else delete next[k]
  return Object.keys(next).length ? next : null
}

// Apply a validated filter. ingredientsFor(slug) -> [{canonical, quantity, unit, display}].
// -> { shown: [recipe], hiddenUnchecked: n }
export function applyFilter(recipes, f, ingredientsFor) {
  if (!f) return { shown: recipes, hiddenUnchecked: 0 }
  let hiddenUnchecked = 0
  const target = f.similar_to ? recipes.find(r => r.slug === f.similar_to) : null
  const tIngs = target ? new Set(ingredientsFor(target.slug).filter(i => !i.staple).map(i => i.canonical)) : null
  const shown = recipes.filter(r => {
    const ings = ingredientsFor(r.slug)
    const cs = new Set(ings.map(i => i.canonical))
    if (f.max_time && r.time_mins > f.max_time) return false
    // A region ("Asian") matches its cuisines (Thai, Japanese, ...).
    if (f.cuisine) { const c = r.cuisine || CATALOG_CUISINE[r.slug] || 'Other'; if (c !== f.cuisine && regionOf(c) !== f.cuisine) return false }
    if (f.dish_type && !dishTypeOf(r).includes(f.dish_type)) return false
    if (f.include && !f.include.every(c => cs.has(c))) return false
    if (f.exclude && f.exclude.some(c => cs.has(c))) return false
    if (f.diet) { const tags = dietTags(ings); if (!f.diet.every(d => tags.includes(d))) return false }
    if (f.max_kcal || f.min_protein_g) {
      const n = computeNutrition(ings, r.servings).perServing
      if (!n) return false // can't compute -> leave it out (never pad)
      if (f.max_kcal && n.kcal > f.max_kcal) return false
      if (f.min_protein_g && n.protein_g < f.min_protein_g) return false
    }
    if (f.allergens?.length) {
      const a = allergyCheck(ings, f.allergens)
      if (!a.show) { if (a.reason === 'unchecked') hiddenUnchecked++; return false }
    }
    if (target) {
      if (r.slug === target.slug) return false
      const mine = ings.filter(i => !i.staple).map(i => i.canonical)
      const shared = mine.filter(c => tIngs.has(c)).length
      const sameCat = (r.categories || []).some(c => (target.categories || []).includes(c))
      if (!(shared / Math.max(1, Math.min(mine.length, tIngs.size)) >= 0.5 || (sameCat && shared >= 1))) return false // weak matches left out
    }
    return true
  })
  return { shown, hiddenUnchecked }
}

function dishTypeOf(r) {
  const cats = (r.categories || []).map(c => c.toLowerCase())
  const out = []
  if (cats.includes('breakfast')) out.push('breakfast')
  if (cats.includes('mains')) out.push('main')
  if (cats.includes('salad')) out.push('salad', 'side')
  if (cats.includes('snack')) out.push('snack', 'side')
  if (cats.includes('dessert')) out.push('dessert')
  if (cats.includes('lunch')) out.push('sandwich', 'bowl', 'main')
  if (r.ai?.dish_type) out.push(r.ai.dish_type)
  return out
}
