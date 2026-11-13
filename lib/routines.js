// Routines: recurring dishes (morning coffee, weekday rice bowl, pasta night).
// Each routine draws its ingredients from the pantry on its active days, so:
//   • Pantry: items that won't last the next 7 days of routines are flagged low,
//     and routine ingredients you don't have are listed with "Add to cart".
//   • Menu (home): today's routines show with a ready / missing status.
import dishes from './routineDishes.json'
import { localCatalog } from './localCatalog.js'
import { canonicalOf, toBase } from './normalize.js'
import { isStaple } from './staples.js'

export const DISHES = dishes // key -> { name, image, imageCredit, ingredients }
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Display-only examples, shown (faded) while the user has no routines. They
// have no days selected and are never stored, so they don't touch the pantry
// or the home screen. Tapping one opens the editor prefilled.
export const SAMPLE_ROUTINES = [
  { id: 'sample-coffee', dish: 'Coffee', template: 'coffee', time: '07:30', days: [], servings: 1, sample: true },
  { id: 'sample-rice', dish: 'Rice bowl', template: 'rice', time: '12:30', days: [], servings: 1, sample: true },
  { id: 'sample-pasta', dish: 'Pasta', template: 'pasta', time: '19:00', days: [], servings: 2, sample: true },
]

// ── Storage (per account on this device; guests: memory only) ─────────────
let memory = null

// Older builds saved the samples as real routines (ids r-coffee / r-rice /
// r-pasta with their default days). Drop those untouched copies.
const OLD_SAMPLES = {
  'r-coffee': '07:30|0,1,2,3,4,5,6|1', 'r-rice': '12:30|1,2,3,4,5|1', 'r-pasta': '19:00|2,4,6|2',
}
const isOldSample = r => OLD_SAMPLES[r.id] === `${r.time}|${(r.days || []).join(',')}|${r.servings}`
const own = list => (Array.isArray(list) ? list.filter(r => !r.sample && !isOldSample(r)) : [])

export function loadRoutines(key) {
  if (!key) return memory ? own(memory).map(r => ({ ...r })) : []
  try {
    const raw = localStorage.getItem(key)
    return raw ? own(JSON.parse(raw)) : []
  } catch { return [] }
}

export function saveRoutines(key, list) {
  if (!key) { memory = list.map(r => ({ ...r })); return }
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* storage blocked */ }
}

export function clearMemoryRoutines() { memory = null }

// ── Dish -> template / recipe / ingredients ────────────────────────────────
// A typed name matches a routine template ("morning latte" -> coffee), else a
// catalog recipe ("caesar salad"), else nothing (no pantry effect).
const ALIASES = {
  coffee: ['coffee', 'latte', 'espresso', 'cappuccino'], tea: ['tea', 'chai'], rice: ['rice'],
  pasta: ['pasta', 'spaghetti', 'penne', 'noodle'], oatmeal: ['oat', 'porridge'], toast: ['toast'],
  eggs: ['egg', 'omelet', 'omelette'], smoothie: ['smoothie', 'shake'],
}

export function resolveDish(name) {
  const n = String(name || '').trim().toLowerCase()
  if (!n) return { template: null, recipeSlug: null }
  const recipe = localCatalog().recipes.find(r => n.includes(r.name.toLowerCase()))
  if (recipe) return { template: null, recipeSlug: recipe.slug }
  for (const [key, words] of Object.entries(ALIASES)) {
    if (words.some(w => new RegExp(`\\b${w}`).test(n))) return { template: key, recipeSlug: null }
  }
  return { template: null, recipeSlug: null }
}

// Per-serving ingredients for a routine.
export function ingredientsFor(routine) {
  if (routine.template && DISHES[routine.template]) {
    return DISHES[routine.template].ingredients.map(i => ({ ...i, canonical: canonicalOf(i.display) }))
  }
  if (routine.recipeSlug) {
    const { recipes, byRecipe } = localCatalog()
    const r = recipes.find(x => x.slug === routine.recipeSlug)
    if (r) {
      return (byRecipe.get(r.id) || []).filter(i => !isStaple(i)).map(i => ({
        display: i.display, canonical: i.canonical, quantity: i.quantity / (r.servings || 1), unit: i.unit,
      }))
    }
  }
  return []
}

export function imageFor(routine) {
  if (routine.template && DISHES[routine.template]) return DISHES[routine.template].image
  if (routine.recipeSlug) return localCatalog().recipes.find(r => r.slug === routine.recipeSlug)?.image || null
  return null
}

export function fmtTime(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return new Date(2000, 0, 1, h || 0, m || 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// ── Pantry effects ─────────────────────────────────────────────────────────
// What one week of routines will use, per ingredient (in base units).
export function weeklyNeeds(routines) {
  const needs = new Map() // canonical -> { canonical, display, unit, base, amount, dishes }
  for (const r of routines) {
    const times = (r.days || []).length * Math.max(1, Number(r.servings) || 1)
    if (!times) continue
    for (const ing of ingredientsFor(r)) {
      const b = toBase(ing.quantity * times, ing.unit)
      const cur = needs.get(ing.canonical)
      if (!cur) {
        needs.set(ing.canonical, { canonical: ing.canonical, display: ing.display, unit: ing.unit, base: b.base, amount: b.amount, dishes: [r.dish] })
      } else if (cur.base === b.base) {
        cur.amount += b.amount
        if (!cur.dishes.includes(r.dish)) cur.dishes.push(r.dish)
      }
    }
  }
  return needs
}

const stockOf = (pantry, canonical, base) => pantry
  .filter(p => p.canonical === canonical)
  .reduce((sum, p) => { const s = toBase(p.quantity, p.unit); return s.base === base ? sum + s.amount : sum }, 0)

// Flag pantry items that won't cover a week of routines. Returns new rows.
export function applyRoutineNeeds(pantry, routines) {
  const needs = weeklyNeeds(routines)
  return pantry.map(p => {
    const n = needs.get(p.canonical)
    if (!n) return p
    const have = stockOf(pantry, p.canonical, n.base)
    const routineShort = have < n.amount
    const routineLabel = `Used by ${n.dishes.join(', ')}`
    if (routineShort && !p.lowStock) {
      return { ...p, lowStock: true, lowReason: `Won't last the week · ${routineLabel}`, routineLabel }
    }
    return { ...p, routineLabel }
  })
}

// Routine ingredients missing from the pantry entirely, in their own units.
export function missingForRoutines(pantry, routines) {
  const out = []
  for (const n of weeklyNeeds(routines).values()) {
    if (stockOf(pantry, n.canonical, n.base) > 0) continue
    const perUnit = toBase(1, n.unit).amount || 1
    out.push({ canonical: n.canonical, display: n.display, unit: n.unit, quantity: Math.ceil((n.amount / perUnit) * 100) / 100, dishes: n.dishes })
  }
  return out.sort((a, b) => a.display.localeCompare(b.display))
}

// Today's routines (sorted by time) with whether the pantry covers one serving.
export function todaysRoutines(routines, pantry, now = new Date()) {
  const day = now.getDay()
  return routines
    .filter(r => (r.days || []).includes(day))
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(r => {
      const ings = ingredientsFor(r)
      const servings = Math.max(1, Number(r.servings) || 1)
      const missing = ings.filter(i => {
        const need = toBase(i.quantity * servings, i.unit)
        return stockOf(pantry, i.canonical, need.base) < need.amount
      })
      return { ...r, image: imageFor(r), known: ings.length > 0, missing }
    })
}
