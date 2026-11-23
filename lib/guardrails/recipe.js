// AI recipe validation pipeline. The model returns JSON; CODE decides every
// ingredient, quantity, time, temperature, brand, source and label.
// Anything that doesn't pass is discarded (caller retries once, then falls back).
import { z } from 'zod'
import { canonicalOf, displayForCanonical, toBase, DICT } from '../normalize.js'
import { convert, toGrams } from './convert.js'
import { enforceSafety } from './foodSafety.js'
import { TECHNIQUES, TECHNIQUE_IDS, clampTime, cueFor } from './techniques.js'
import { plausibility, CUISINES, DISH_TYPES } from './plausibility.js'
import { outputViolations, RULES_VERSION } from './policy.js'
import { allergenProfile } from './allergens.js'
import { computeNutrition } from './nutrition.js'
import { dietTags, proteinLabel } from './diet.js'

const CANONICALS = new Set(DICT.map(d => d[0]))
export const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'unit', 'clove', 'slice', 'can', 'bunch', 'head', 'pack', 'dozen']

export const EQUIPMENT_OPTIONS = ['stovetop', 'oven', 'microwave', 'frying pan', 'saucepan', 'pot', 'baking sheet', 'baking dish', 'mixing bowl', 'whisk', 'blender',
  'food processor', 'grill', 'air fryer', 'steamer basket', 'colander', 'food thermometer', 'knife', 'cutting board', 'grater', 'wok', 'sheet pan']
export const DEFAULT_KITCHEN = ['stovetop', 'oven', 'frying pan', 'saucepan', 'pot', 'baking sheet', 'mixing bowl', 'whisk', 'knife', 'cutting board', 'food thermometer']
// Equipment each technique needs (any one of the group).
const NEEDS = {
  bake: [['oven']], roast: [['oven']], broil: [['oven']], grill: [['grill']],
  saute: [['stovetop'], ['frying pan', 'wok', 'saucepan']], sear: [['stovetop'], ['frying pan', 'wok']], 'stir-fry': [['stovetop'], ['wok', 'frying pan']],
  'pan-fry': [['stovetop'], ['frying pan']], fry: [['stovetop'], ['frying pan', 'pot', 'wok']], griddle: [['stovetop'], ['frying pan']],
  boil: [['stovetop'], ['pot', 'saucepan']], simmer: [['stovetop'], ['pot', 'saucepan', 'frying pan']], steam: [['stovetop'], ['steamer basket', 'pot']],
  poach: [['stovetop'], ['saucepan', 'pot', 'frying pan']], scramble: [['stovetop'], ['frying pan']], toast: [['stovetop', 'oven']],
}

// Per-serving caps for assumed staples (app rules). Units are converted first.
const STAPLE_CAP = {
  salt: [0.75, 'tsp'], 'black pepper': [0.5, 'tsp'], oil: [1.5, 'tbsp'], 'olive oil': [1.5, 'tbsp'], sugar: [3, 'tbsp'], flour: [0.75, 'cup'],
  cumin: [1, 'tsp'], paprika: [1, 'tsp'], 'garlic powder': [0.5, 'tsp'], honey: [2, 'tbsp'], 'soy sauce': [1.5, 'tbsp'], vinegar: [1, 'tbsp'],
}

const text = (min, max) => z.string().trim().min(min).max(max)
export const ModelRecipeSchema = z.object({
  title: text(3, 60),
  cuisine: z.enum(CUISINES),
  dish_type: z.enum(DISH_TYPES),
  servings: z.number().int().min(1).max(12),
  description: text(0, 160).optional().default(''),
  ingredients: z.array(z.object({
    name: text(2, 40),
    canonical: text(2, 30).optional(),
    quantity: z.number().positive().max(5000),
    unit: z.enum(UNITS),
  })).min(2).max(15),
  equipment: z.array(text(2, 30)).max(10).optional().default([]),
  steps: z.array(z.object({
    section: text(2, 40),
    technique: z.enum(TECHNIQUE_IDS),
    time_min: z.tuple([z.number(), z.number()]).optional(),
    instructions: z.array(text(4, 220)).min(1).max(4),
    doneness_cue: text(0, 120).optional(),
  })).min(2).max(8),
}).strict()

// Text from the model: no numbers (code owns amounts/times/temps), no links.
const sanitize = (s) => String(s).replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/\d+([.,/]\d+)?\s*(%|°\s*[fc]?|degrees?)?/gi, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim()

const fmtRange = ([lo, hi]) => (lo === hi ? `${lo}` : `${lo}\u2013${hi}`)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

// ctx: { pantry: decorated rows, staples: Set(canonical) available, kitchen: [equipment], modelId, now }
// -> { ok: true, recipe } | { ok: false, errors: [] }
export function validateModelRecipe(raw, ctx) {
  const errors = []
  let data
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return { ok: false, errors: ['invalid-json'] } }
  const parsed = ModelRecipeSchema.safeParse(data)
  if (!parsed.success) return { ok: false, errors: ['schema:' + parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')} ${i.message}`).join('; ')] }
  const m = parsed.data

  // Output text checks (titles, steps): no URLs, injections, blocked methods.
  const allText = [m.title, m.description, ...m.steps.flatMap(s => [s.section, ...s.instructions, s.doneness_cue || ''])].join(' \n ')
  const bad = outputViolations(allText)
  if (bad.length) return { ok: false, errors: bad.map(b => `output:${b}`) }

  // ── Ingredients: only from pantry (not past shelf life) + available staples ─
  const pantry = (ctx.pantry || []).filter(p => Number(p.quantity) > 0 && !p.pastShelfLife)
  const ingredients = []
  for (const ing of m.ingredients) {
    // Code derives the canonical from the name; the model's own field is ignored.
    const canonical = canonicalOf(ing.name)
    if (canonical === 'water') { ingredients.push({ canonical, display: 'Water', quantity: ing.quantity, unit: ing.unit, staple: true, brand: null, source: 'staple' }); continue }
    if (!CANONICALS.has(canonical)) { errors.push(`unknown-ingredient:${ing.name}`); continue }
    if (ingredients.some(i => i.canonical === canonical)) continue // duplicates: keep the first
    const rows = pantry.filter(p => p.canonical === canonical)
    const isStaple = !rows.length && ctx.staples?.has(canonical)
    if (!rows.length && !isStaple) { errors.push(`not-in-pantry:${canonical}`); continue }

    let quantity = ing.quantity, unit = ing.unit, brand = null, source
    if (rows.length) {
      // Cap at stock (same unit family), else use the pantry unit and amount.
      const stock = rows.reduce((s, r) => { const b = toBase(r.quantity, r.unit); return b.base === toBase(1, unit).base ? s + b.amount : s }, 0)
      const want = toBase(quantity, unit)
      if (stock > 0) {
        if (want.amount > stock) quantity = Math.round((stock / toBase(1, unit).amount) * 100) / 100
      } else {
        // Different unit families (e.g. cups vs lb): compare in grams via the USDA weights.
        const stockG = rows.reduce((s, r) => s + (toGrams(canonical, r.quantity, r.unit) ?? NaN), 0)
        const wantG = toGrams(canonical, quantity, unit)
        if (!Number.isFinite(stockG) || wantG == null) { errors.push(`unit-mismatch:${canonical}`); continue }
        if (wantG > stockG) quantity = Math.round(quantity * (stockG / wantG) * 100) / 100
      }
      brand = rows.find(r => r.brand)?.brand || null // brand ONLY from receipt/pantry
      source = rows.some(r => r.brand) ? 'receipt' : 'pantry'
    } else {
      const cap = STAPLE_CAP[canonical]
      if (cap) {
        const asCapUnit = convert(quantity, unit, cap[1])
        if (asCapUnit == null) { errors.push(`staple-unit:${canonical}`); continue }
        const max = cap[0] * m.servings
        if (asCapUnit > max) { quantity = max; unit = cap[1] }
      }
      source = 'staple'
    }
    ingredients.push({ canonical, display: displayForCanonical(canonical), name: ing.name, quantity: Math.round(quantity * 100) / 100, unit, staple: isStaple, brand, source })
  }
  if (errors.length) return { ok: false, errors }
  if (ingredients.length < 2) return { ok: false, errors: ['too-few-ingredients'] }

  // ── Equipment: only what's in "My kitchen" ─────────────────────────────────
  const kitchen = new Set((ctx.kitchen?.length ? ctx.kitchen : DEFAULT_KITCHEN).map(e => e.toLowerCase()))
  const equipment = [...new Set(m.equipment.map(e => e.toLowerCase().trim()))]
  for (const e of equipment) if (!kitchen.has(e)) errors.push(`equipment-not-owned:${e}`)
  for (const s of m.steps) {
    for (const group of NEEDS[s.technique] || []) if (!group.some(g => kitchen.has(g))) errors.push(`equipment-needed:${s.technique}:${group.join('|')}`)
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] }

  // ── Steps: code-owned times and cues, model text without numbers ────────────
  let steps = m.steps.map(s => {
    const range = clampTime(s.technique, s.time_min)
    const instructions = s.instructions.map(sanitize).filter(t => t.length >= 4)
    const tail = s.technique === 'prep' || s.technique === 'assemble' ? null : `${TECHNIQUES[s.technique].risky ? 'Chill' : 'Cook'} for ${fmtRange(range)} minutes, until ${cueFor(s.technique, s.doneness_cue).replace(/\.$/, '').replace(/^./, c => c.toLowerCase())}.`
    return { section: sanitize(s.section) || 'Step', technique: s.technique, time_min: range, instructions: tail ? [...instructions, tail] : instructions, doneness_cue: cueFor(s.technique, s.doneness_cue) }
  })
  if (steps.some(s => !s.instructions.length)) return { ok: false, errors: ['empty-step'] }

  // ── Safety (code temps, must-cook list, raw protein) ───────────────────────
  const safe = enforceSafety({ ingredients, steps })
  if (!safe.ok) return { ok: false, errors: safe.errors }
  steps = safe.recipe.steps

  // ── Plausibility ───────────────────────────────────────────────────────────
  const plaus = plausibility({ cuisine: m.cuisine, dish_type: m.dish_type, ingredients })
  if (!plaus.ok) return { ok: false, errors: plaus.reasons }

  // ── Build the app recipe (existing shape + optional fields) ────────────────
  const name = sanitize(m.title).replace(/\s{2,}/g, ' ')
  if (name.length < 3) return { ok: false, errors: ['title'] }
  const created = new Date(ctx.now || Date.now())
  const slug = `ai-${slugify(name)}-${created.getTime().toString(36)}`
  const time_min = [steps.reduce((a, s) => a + s.time_min[0], 0), steps.reduce((a, s) => a + s.time_min[1], 0)]
  const nutrition = computeNutrition(ingredients, m.servings)
  const prof = allergenProfile(ingredients)
  const risky = [...new Set(steps.map(s => TECHNIQUES[s.technique].risky).filter(Boolean))]

  const appSteps = [
    { section: 'Get everything ready', duration: 300, tip: '', youtubeQuery: '', instructions: ingredients.map(i => toIns(`${i.quantity} ${i.unit === 'unit' ? '' : `${i.unit} `}${i.display.toLowerCase()}${i.brand ? ` (${i.brand})` : ''}`, true)) },
    ...steps.map(s => ({ section: s.section, duration: s.time_min[1] * 60, tip: s.doneness_cue, youtubeQuery: '', instructions: s.instructions.map(t => toIns(t)), technique: s.technique, time_min: s.time_min, safety: s.safety || [] })),
  ]
  const recipe = {
    slug, name, image: null, time_mins: time_min[1], kcal: nutrition.perServing?.kcal ?? null, servings: m.servings,
    description: sanitize(m.description || ''), steps: appSteps,
    ingredients: ingredients.map(({ source, name: _name, ...i }) => ({ ...i, srcId: source })),
    ai: {
      cuisine: m.cuisine, dish_type: m.dish_type, categories: categoriesFor(m.dish_type), protein: proteinLabel(ingredients),
      diet: dietTags(ingredients), equipment, temp_f: safe.recipe.temp_f, temps: safe.recipe.temps.map(t => ({ canonical: t.canonical, f: t.f, rest: t.rest, source: t.source })),
      time_min, allergens: [...prof.contains], allergenUnknown: prof.unknown, nutrition, risky,
      origin: { label: 'ai' }, sources: sourcesUsed(ingredients, safe.recipe.temps, nutrition),
      ruleVersion: RULES_VERSION, modelId: ctx.modelId || null, createdAt: created.toISOString(), photo: null,
    },
  }
  return { ok: true, recipe }
}

function toIns(t, hl = false) { return { text: t, parts: [{ t, hl }] } }

function categoriesFor(type) {
  return { breakfast: ['Breakfast'], main: ['Mains'], side: ['Snack'], salad: ['Salad'], soup: ['Mains'], snack: ['Snack'], dessert: ['Dessert'], sandwich: ['Lunch'], bowl: ['Lunch'] }[type] || []
}

function sourcesUsed(ingredients, temps, nutrition) {
  const ids = new Set(['app-rules'])
  ingredients.forEach(i => ids.add(i.source === 'staple' ? 'pantry' : i.source))
  temps.forEach(t => ids.add(t.source))
  if (nutrition.perServing) ids.add('fdc')
  return [...ids]
}
