// Food-safety rules owned by CODE. The model never sets a temperature: every
// temperature shown comes from this table, with its source id.
// Source: FDA Safe Food Handling (same chart as USDA FSIS), see sources.json.
import { convert } from './convert.js'

const FDA = 'fda-safe-handling'

// canonical -> rule. "ground" is decided from the ingredient text.
export const PROTEIN_RULES = {
  chicken: { f: 165, kind: 'poultry', source: FDA },
  turkey: { f: 165, kind: 'poultry', source: FDA },
  beef: { f: 145, rest: 3, kind: 'whole', groundF: 160, source: FDA },
  pork: { f: 145, rest: 3, kind: 'whole', groundF: 160, source: FDA },
  lamb: { f: 145, rest: 3, kind: 'whole', groundF: 160, source: FDA },
  bacon: { f: 145, rest: 3, kind: 'whole', source: FDA },
  salmon: { f: 145, kind: 'fish', source: 'fda-seafood' },
  shrimp: { f: 145, kind: 'shellfish', source: 'fda-seafood' },
  egg: { f: 160, kind: 'egg', source: FDA },
}
export const LEFTOVERS_F = { f: 165, source: FDA }

// Must be cooked / limited. The model cannot override these.
export const MUST_COOK = {
  beans: { rule: 'Dry kidney beans must be soaked and boiled hard before eating; canned beans are already cooked.', source: 'who-natural-toxins', needs: ['boil', 'simmer'], minMin: 10, when: /kidney|dry|dried/i },
  cassava: { rule: 'Cassava must be peeled and fully cooked; never eat it raw.', source: 'who-natural-toxins', needs: ['boil', 'simmer', 'fry', 'roast', 'bake'] },
  flour: { rule: 'Flour, dough and batter must be fully cooked; don\u2019t taste them raw.', source: 'fda-raw-flour', needs: ['bake', 'fry', 'pan-fry', 'boil', 'simmer', 'roast', 'griddle'] },
  rice: { rule: 'Rice must be fully cooked; cool leftovers quickly and refrigerate.', source: 'fda-bad-bug-book', needs: ['boil', 'simmer', 'steam', 'stir-fry'] },
}
export const NEVER = { 'bitter almond': 'who-natural-toxins', 'bitter almonds': 'who-natural-toxins' }
// App rule (not a sourced number, never displayed as a fact): nutmeg is
// limited because large amounts are toxic.
export const LIMITS = { nutmeg: { maxTsp: 1, reason: 'Large amounts of nutmeg are toxic.' } }

const COOK_TECHNIQUES = ['bake', 'roast', 'fry', 'pan-fry', 'stir-fry', 'saute', 'sear', 'grill', 'boil', 'simmer', 'steam', 'poach', 'scramble', 'griddle', 'broil']

export const isGround = (ing) => /\bground|mince|minced meat|burger|patty|sausage\b/i.test(`${ing.display || ''} ${ing.name || ''}`)

export function requiredTemp(ing) {
  const r = PROTEIN_RULES[ing.canonical]
  if (!r) return null
  if (isGround(ing) && r.groundF) return { f: r.groundF, rest: 0, kind: 'ground', source: r.source }
  return { f: r.f, rest: r.rest || 0, kind: r.kind, source: r.source }
}

export const tempLine = (t, what) =>
  `Cook ${what} until the thickest part reads ${t.f}\u00b0F (${Math.round(((t.f - 32) * 5) / 9)}\u00b0C) on a food thermometer${t.rest ? `, then rest ${t.rest} minutes` : ''}.`

// Remove any temperature the model wrote: code adds the right one.
export const stripTemps = (s) => String(s).replace(/\b\d{2,3}\s*(\u00b0|degrees?|deg)\s*[FfCc]?\b|\b\d{2,3}\s*[FfCc]\b(?=[\s,.)])/g, '').replace(/\s{2,}/g, ' ').trim()

// Enforce on a normalized recipe { ingredients:[{canonical,display,quantity,unit}], steps:[{technique, instructions[], time_min}] }.
// Returns { ok, errors[], recipe } with temp lines added by code.
export function enforceSafety(recipe) {
  const errors = []
  const steps = recipe.steps.map(s => ({ ...s, instructions: s.instructions.map(stripTemps) }))
  const techniques = steps.map(s => s.technique)
  const cooked = techniques.some(t => COOK_TECHNIQUES.includes(t))

  for (const ing of recipe.ingredients) {
    const words = `${ing.display || ''} ${ing.name || ''}`
    if (NEVER[ing.canonical] || /bitter almond/i.test(words)) errors.push(`never:${ing.canonical}`)
    const must = MUST_COOK[ing.canonical]
    if (must && (!must.when || must.when.test(words))) {
      const step = steps.find(s => must.needs.includes(s.technique))
      if (!step) errors.push(`must-cook:${ing.canonical}`)
      else if (must.minMin && (step.time_min?.[0] ?? 0) < must.minMin) errors.push(`must-cook-time:${ing.canonical}`)
    }
    const lim = LIMITS[ing.canonical]
    if (lim) {
      const tsp = convert(ing.quantity, ing.unit, 'tsp')
      if (tsp == null || tsp > lim.maxTsp) errors.push(`limit:${ing.canonical}`)
    }
  }

  // Raw protein needs a cooking step; code writes the safe-temperature line.
  const temps = []
  for (const ing of recipe.ingredients) {
    const t = requiredTemp(ing)
    if (!t) continue
    if (!cooked) { errors.push(`raw-protein:${ing.canonical}`); continue }
    temps.push({ ...t, canonical: ing.canonical, what: ing.canonical === 'egg' ? 'egg dishes' : ing.display.toLowerCase() })
  }
  if (temps.length) {
    // Put the temp line on the last cooking step that mentions the protein (or the last cooking step).
    for (const t of temps) {
      let idx = -1
      steps.forEach((s, i) => { if (COOK_TECHNIQUES.includes(s.technique) && s.instructions.join(' ').toLowerCase().includes(t.canonical)) idx = i })
      if (idx < 0) steps.forEach((s, i) => { if (COOK_TECHNIQUES.includes(s.technique)) idx = i })
      steps[idx].instructions.push(tempLine(t, t.what))
      steps[idx].safety = [...(steps[idx].safety || []), { f: t.f, rest: t.rest, source: t.source }]
    }
  }
  const temp_f = temps.length ? Math.max(...temps.map(t => t.f)) : null
  return { ok: errors.length === 0, errors, recipe: { ...recipe, steps, temp_f, temps } }
}
