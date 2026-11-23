// Tier-1 dish names: code checks every line before it becomes a tile.
import { describe, it, expect } from 'vitest'
import { parseIdeaLine } from '../lib/aiIdeas.js'

const pantry = [
  { display: 'Chicken breast', canonical: 'chicken', quantity: 2 },
  { display: 'Basmati rice', canonical: 'rice', quantity: 1 },
  { display: 'Peanut butter', canonical: 'peanut butter', quantity: 1 },
]

describe('dish-name lines', () => {
  it('accepts a good line and keeps only real pantry items', () => {
    const i = parseIdeaLine('1. Chicken Rice Bowl | Asian | chicken breast, rice, unicorn dust', pantry)
    expect(i).toMatchObject({ name: 'Chicken Rice Bowl', cuisine: 'Asian', uses: ['Chicken breast', 'Basmati rice'] })
  })
  it('rejects unknown cuisines, no pantry items, bad format', () => {
    expect(parseIdeaLine('Chicken Rice | French | chicken', pantry)).toBe(null)
    expect(parseIdeaLine('Tofu Stir Fry | Asian | tofu', pantry)).toBe(null)
    expect(parseIdeaLine('Here are some dishes:', pantry)).toBe(null)
  })
  it('rejects blocked methods and harmful text', () => {
    expect(parseIdeaLine('Chicken Sashimi | Asian | chicken', pantry)).toBe(null)
    expect(parseIdeaLine('Raw Chicken Salad | American | chicken', pantry)).toBe(null)
  })
  it('drops dishes with an active allergy', () => {
    expect(parseIdeaLine('Peanut Chicken | Asian | chicken, peanut butter', pantry, { allergies: ['peanuts'] })).toBe(null)
  })
  it('skips duplicates', () => {
    expect(parseIdeaLine('Chicken Rice Bowl | Asian | chicken', pantry, { taken: new Set(['idea-chicken-rice-bowl']) })).toBe(null)
  })
})
