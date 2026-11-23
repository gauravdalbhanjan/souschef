// Icon cues and per-ingredient nutrition are deterministic.
import { describe, it, expect } from 'vitest'
import { ingredientIcon, stepCues, nutritionLine } from '../lib/cookCues.js'
import { ingredientNutrition } from '../lib/guardrails/nutrition.js'
import fs from 'node:fs'
import { CUE_ICONS } from '../components/cueIconMap.js'
// Every key cookCues.js can emit must have an icon.
const CUE_KEYS_CHECK = () => [...fs.readFileSync(new URL('../lib/cookCues.js', import.meta.url), 'utf8').matchAll(/\[\s*'([a-z-]+)',\s*'[^']+',\s*\//g), 'heat-level', 'timer', 'doneness', 'temp', 'ingredient'].map(m => (typeof m === 'string' ? m : m[1])).filter(k => !CUE_ICONS[k])

describe('ingredient icons', () => {
  const key = (display, canonical = display.toLowerCase()) => ingredientIcon({ display, canonical }).key
  it('maps foods to categories, specific phrases first', () => {
    expect(key('Chicken Breast', 'chicken')).toBe('poultry')
    expect(key('Salmon')).toBe('seafood')
    expect(key('Beef')).toBe('meat')
    expect(key('Bell Pepper')).toBe('vegetable')
    expect(key('Black Pepper')).toBe('spice')
    expect(key('Peanut Oil', 'oil')).toBe('oil')
    expect(key('Soy Sauce')).toBe('sauce')
    expect(key('Basmati Rice', 'rice')).toBe('grain')
    expect(key('Eggs', 'egg')).toBe('egg')
    expect(key('Cilantro')).toBe('herb')
    expect(key('Lemon')).toBe('fruit')
    expect(key('Mystery Thing')).toBe('ingredient')
  })
})

describe('step cues', () => {
  const step = (text, extra = {}) => ({ section: '', duration: 0, tip: '', instructions: [{ text }], ...extra })
  it('actions follow the order of the text', () => {
    const c = stepCues(step('Chop the onion, then fry it in a pan over medium heat until golden.'))
    expect(c.actions.map(a => a.key)).toEqual(['cut', 'fry'])
    expect(c.tools.map(t => t.key)).toEqual(['pan'])
    expect(c.states.map(s => s.key)).toEqual(['heat-level', 'doneness'])
    expect(c.states[0].label).toBe('Medium heat')
    expect(c.states[1].label).toBe('golden')
  })
  it('stir-fry is frying, not stirring; bake uses the oven', () => {
    expect(stepCues(step('Stir-fry the beef for two minutes.')).actions.map(a => a.key)).toEqual(['fry'])
    const b = stepCues(step('Bake in the oven for 20 minutes.', { duration: 1200 }))
    expect(b.actions[0].key).toBe('bake')
    expect(b.tools[0].key).toBe('oven')
    expect(b.states.find(s => s.key === 'timer').label).toBe('20 min')
  })
  it('turns the safety line into a temperature cue and reads step ingredients', () => {
    const s = { section: '', duration: 0, tip: 'Done when browned.', uses: [{ canonical: 'beef', display: 'Beef', quantity: 6, unit: 'oz' }],
      instructions: [{ text: 'Add the beef and cook until browned.' }, { text: 'You’ll need: 6 oz beef' }, { text: 'Safety: Cook beef until the thickest part reads 145°F (63°C) on a food thermometer, then rest 3 minutes.' }] }
    const c = stepCues(s)
    expect(c.states.find(x => x.key === 'temp').label).toBe('Beef 145°F')
    expect(c.uses[0].canonical).toBe('beef')
    expect(c.actions.map(a => a.key)).toEqual(['add', 'cook'])
    expect(stepCues({ instructions: [{ text: 'Add the seasoned beef.' }] }).actions.map(a => a.key)).toEqual(['add'])
  })
  it('finds ingredients by name when the step has no data', () => {
    const c = stepCues(step('Add the tomatoes and simmer.'), [{ canonical: 'tomato', display: 'Tomato' }, { canonical: 'rice', display: 'Rice' }])
    expect(c.uses.map(u => u.canonical)).toEqual(['tomato'])
  })
  it('every cue key has an icon', () => {
    expect(CUE_KEYS_CHECK()).toEqual([])
  })
})

describe('per-ingredient nutrition', () => {
  it('estimates the amount used, with fallbacks', () => {
    const egg = ingredientNutrition({ canonical: 'egg', display: 'Egg', quantity: 2, unit: 'unit' })
    expect(egg.status).toBe('ok')
    expect(egg.kcal).toBeGreaterThan(100)
    expect(nutritionLine(egg).text).toMatch(/^\d+ kcal · P [\d.]+ g · C [\d.]+ g · F [\d.]+ g$/)
    expect(nutritionLine(egg).full).toMatch(/^About \d+ calories, [\d.]+ g protein/)
    expect(ingredientNutrition({ canonical: 'salt', display: 'Salt', quantity: 1, unit: 'tsp' }).status).toBe('none')
    expect(ingredientNutrition({ canonical: 'black pepper', display: 'Black Pepper', quantity: 0, unit: 'unit' }).status).toBe('none')
    expect(ingredientNutrition({ canonical: 'dashi', display: 'Dashi', quantity: 1, unit: 'cup' }).status).toBe('no-data')
    expect(nutritionLine({ status: 'no-data' }).text).toBe('Nutrition: no USDA data')
  })
})
