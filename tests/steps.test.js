// Deterministic step clean-up, per-step ingredients, safety cues, matching.
import { describe, it, expect } from 'vitest'
import { normalizeAbbrev, splitSteps, stepQuality, mapIngredients, prepNote } from '../lib/stepParser.js'
import { stepsFromText } from '../lib/steps.js'
import { rankRecipes, isCore } from '../lib/match.js'

describe('step parser', () => {
  it('normalizes abbreviations', () => {
    expect(normalizeAbbrev('Add 1 tbs. oil, approx. 5 mins at 350 F.')).toBe('Add 1 tbsp oil, about 5 minutes at 350°F.')
  })
  it('splits multi-action blocks, keeps short follow-ups with their step', () => {
    expect(splitSteps(['Season the beef with salt. Set aside. Heat the oil in a wok over high heat.']))
      .toEqual(['Season the beef with salt. Set aside.', 'Heat the oil in a wok over high heat.'])
  })
  it('flags stub and action-less instructions', () => {
    expect(stepQuality(['Mix.', 'Serve.']).ok).toBe(false)
    expect(stepQuality(['The sauce.', 'A bowl of rice with herbs and more.', 'Something nice for later on.', 'Yum yum yum yum yum yum yum yum yum yum yum yum.']).reason).toBe('action-less')
    expect(stepQuality(['Season the beef with salt and pepper and set it aside.', 'Heat the oil in a wok and cook the beef until browned on both sides.']).ok).toBe(true)
  })
  it('maps ingredients to the steps that use them', () => {
    const ings = [{ d: 'Beef', c: 'beef' }, { d: 'Black Pepper', c: 'black pepper', s: 1 }, { d: 'Bell Pepper', c: 'bell pepper' }, { d: 'Salt', c: 'salt', s: 1 }, { d: 'Chiles', c: 'chili' }]
    const uses = mapIngredients(['Season beef with salt and pepper.', 'Add the bell peppers and chilies.', 'Toss in the remaining ingredients.'], ings)
    expect(uses[0]).toEqual([0, 1, 3])
    expect(uses[1]).toEqual([2, 4])
  })
  it('keeps prep notes', () => {
    expect(prepNote('6 oz beef steak, sliced thinly across the grain')).toBe('sliced thinly across the grain')
    expect(prepNote('1 cup rice, any brand')).toBe(null)
  })
})

describe('enriched steps', () => {
  const ingredients = [
    { canonical: 'chicken', display: 'Chicken', quantity: 1, unit: 'lb' },
    { canonical: 'onion', display: 'Onion', quantity: 1, unit: 'unit', prep: 'diced' },
    { canonical: 'salt', display: 'Salt', quantity: 0, unit: 'unit', staple: true },
  ]
  const steps = stepsFromText('wb-test', 'Test', ingredients, [
    { t: 'Season the chicken with salt.', i: [0, 2] },
    { t: 'Fry the chicken and onion until golden brown.', i: [0, 1] },
  ])
  it('lists amounts per step and the prep note in the prep step', () => {
    expect(steps[0].instructions.map(i => i.text).join(' | ')).toMatch(/1 onion: diced/)
    expect(steps[1].instructions[1].text).toMatch(/You.ll need: 1 lb chicken, salt \(to taste\)/)
  })
  it('puts the USDA temperature on the step that cooks the protein, with a doneness cue', () => {
    expect(steps[1].instructions.some(i => /Safety: .*165°F \(74°C\)/.test(i.text))).toBe(false)
    expect(steps[2].instructions.some(i => /Safety: Cook chicken until the thickest part reads 165°F \(74°C\)/.test(i.text))).toBe(true)
    expect(steps[2].tip).toBe('Done when golden brown.')
  })
})

describe('dried / cured meat is a blocked method', () => {
  it('jerky and biltong get the curing message', async () => {
    const { checkRequest } = await import('../lib/guardrails/policy.js')
    expect(checkRequest('how do I make beef jerky').method).toBe('curing')
    expect(checkRequest('biltong recipe').method).toBe('curing')
  })
})

describe('matching needs the core protein', () => {
  const recipes = [{ id: 1, slug: 'teriyaki-salmon', name: 'Teriyaki Salmon', servings: 2, time_mins: 20 }, { id: 2, slug: 'veg-rice', name: 'Veg Rice', servings: 2, time_mins: 20 }]
  const by = new Map([
    [1, [{ canonical: 'salmon', quantity: 1, unit: 'unit' }, { canonical: 'soy sauce', quantity: 1, unit: 'tbsp' }, { canonical: 'rice', quantity: 1, unit: 'cup' }, { canonical: 'ginger', quantity: 1, unit: 'unit' }]],
    [2, [{ canonical: 'rice', quantity: 1, unit: 'cup' }, { canonical: 'onion', quantity: 1, unit: 'unit' }]],
  ])
  const pantry = ['soy sauce', 'rice', 'ginger', 'onion'].map((c, i) => ({ id: i, canonical: c, quantity: 5, unit: 'unit' }))
  it('a 75% match without salmon is not relevant', () => {
    const r = rankRecipes(recipes, by, pantry)
    const salmon = r.find(x => x.slug === 'teriyaki-salmon')
    expect(salmon.match).toBe(75)
    expect(salmon.relevant).toBe(false)
    expect(r[0].slug).toBe('veg-rice')
  })
  it('knows core proteins', () => {
    expect(isCore('salmon')).toBe(true)
    expect(isCore('chicken thigh')).toBe(true)
    expect(isCore('rice')).toBe(false)
  })
})
