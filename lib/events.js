// Event planning: pick dishes + guest count for an upcoming celebration, work
// out which ingredients are missing from the pantry, and (when "Remind me" is
// on) let the pantry manager add those items to the cart as the day gets close.
import { localCatalog } from './localCatalog.js'
import { toBase } from './normalize.js'

// Start stocking this many days before the event: late enough that fresh
// produce/meat won't spoil, early enough to order delivery.
export const LEAD_DAYS = 7

export const EVENTS = [
  { id: 'independence-day', name: 'Independence Day', img: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=700&q=80',
    next: (y) => new Date(y, 6, 4),
    menu: ['guacamole', 'chicken-strips', 'chicken-fries', 'bacon-ham-sandwich', 'caesar-salad'] },
  { id: 'thanksgiving', name: 'Thanksgiving', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=700&q=80',
    next: (y) => nthWeekday(y, 10, 4, 4), // 4th Thursday of November
    menu: ['garlic-butter-salmon', 'tomato-spinach-pasta', 'caesar-salad', 'chickpea-curry', 'bundt-cake'] },
  { id: 'christmas-eve', name: 'Christmas Eve', img: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=700&q=80',
    next: (y) => new Date(y, 11, 24),
    menu: ['garlic-butter-salmon', 'aglio-olio-spaghetti', 'caesar-salad', 'bundt-cake'] },
  { id: 'new-years-eve', name: "New Year's Eve", img: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=700&q=80',
    next: (y) => new Date(y, 11, 31),
    menu: ['shrimp-fried-rice', 'guacamole', 'chicken-nuggets', 'bundt-cake'] },
]

function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  return new Date(year, month, 1 + offset + (n - 1) * 7)
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Next occurrence on/after today (rolls into next year once it has passed).
export function nextDate(event, now = new Date()) {
  const today = startOfDay(now)
  let d = event.next(today.getFullYear())
  if (d < today) d = event.next(today.getFullYear() + 1)
  return d
}

export function daysUntil(date, now = new Date()) {
  return Math.round((startOfDay(date) - startOfDay(now)) / 86400000)
}

export const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── Plan storage ────────────────────────────────────────────────────────────
// Signed-in users: localStorage per account. Guests (storageKey = null): memory
// only, discarded when the guest session ends.
// Plan shape: { planned, reminder, dishes: [slug], guests, stockedFor: 'YYYY-MM-DD' }
let memoryPlans = {}

export function loadPlans(storageKey) {
  if (!storageKey) return { ...memoryPlans }
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { return {} }
}

export function savePlans(storageKey, plans) {
  if (!storageKey) { memoryPlans = { ...plans }; return }
  try { localStorage.setItem(storageKey, JSON.stringify(plans)) } catch { /* storage full/blocked */ }
}

export function clearMemoryPlans() { memoryPlans = {} }

// ── What to buy ─────────────────────────────────────────────────────────────
// Sum each selected dish's ingredients (scaled to the guest count), subtract
// what the pantry already holds, and return what is still missing.
export function computeNeeds(plan, pantry) {
  if (!plan?.dishes?.length) return []
  const { recipes, byRecipe } = localCatalog()
  const guests = Math.max(1, Number(plan.guests) || 1)

  const need = new Map() // canonical -> { display, unit, base, amount }
  for (const slug of plan.dishes) {
    const r = recipes.find(x => x.slug === slug)
    if (!r) continue
    const scale = guests / (r.servings || 1)
    for (const ing of byRecipe.get(r.id) || []) {
      if (ing.staple || ing.optional) continue
      const b = toBase(ing.quantity * scale, ing.unit)
      const cur = need.get(ing.canonical)
      if (!cur) need.set(ing.canonical, { canonical: ing.canonical, display: ing.display, unit: ing.unit, base: b.base, amount: b.amount })
      else if (cur.base === b.base) cur.amount += b.amount
    }
  }

  const out = []
  for (const n of need.values()) {
    let have = 0
    for (const p of pantry) {
      if (p.canonical !== n.canonical) continue
      const s = toBase(p.quantity, p.unit)
      if (s.base === n.base) have += s.amount
    }
    const missing = n.amount - have
    if (missing <= 0.0001) continue
    const perUnit = toBase(1, n.unit).amount || 1
    const qty = Math.ceil((missing / perUnit) * 100) / 100
    out.push({ canonical: n.canonical, display: n.display, quantity: qty, unit: n.unit })
  }
  return out.sort((a, b) => a.display.localeCompare(b.display))
}

// Called on app load: for planned events with "Remind me" on that are within
// LEAD_DAYS, add the missing items to the cart once per occurrence.
// Returns a list of { name, days, count } for a heads-up message.
export async function syncEventStock(storageKey, api) {
  const plans = loadPlans(storageKey)
  const due = EVENTS.filter(ev => {
    const p = plans[ev.id]
    if (!p?.planned || !p.reminder || !p.dishes?.length) return false
    const date = nextDate(ev)
    const d = daysUntil(date)
    return d >= 0 && d <= LEAD_DAYS && p.stockedFor !== isoDay(date)
  })
  if (!due.length) return []

  const pantry = await api.pantry()
  const added = []
  for (const ev of due) {
    const date = nextDate(ev)
    const items = computeNeeds(plans[ev.id], pantry)
    if (items.length) await api.addToCart(items.map(i => ({ ...i, source: `event:${ev.name}` })))
    plans[ev.id] = { ...plans[ev.id], stockedFor: isoDay(date) }
    added.push({ name: ev.name, days: daysUntil(date), count: items.length })
  }
  savePlans(storageKey, plans)
  return added
}
