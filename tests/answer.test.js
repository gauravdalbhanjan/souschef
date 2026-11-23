// Pantry answers: code removes what the model doesn't own.
import { describe, it, expect } from 'vitest'
import { cleanAnswer, aiAnswer, EMPTY_PANTRY_REPLY } from '../lib/aiTasks.js'

describe('pantry answers', () => {
  it('drops temperatures, safety and health claims', () => {
    const out = cleanAnswer('Make chicken rice with your onion. Cook it to 165°F. It is safe for kids. This is healthy. Serve hot!')
    expect(out).toBe('Make chicken rice with your onion. Serve hot!')
  })
  it('drops links, harmful text and markdown', () => {
    expect(cleanAnswer('**Try** garlic toast. See www.example.com for more.')).toBe('Try garlic toast.')
  })
  it('empty pantry gets the fixed reply without the model', async () => {
    expect(await aiAnswer('what can I cook?', [])).toBe(EMPTY_PANTRY_REPLY)
  })
  it('returns nothing when the model is off and the pantry has items', async () => {
    expect(await aiAnswer('dinner idea', [{ display: 'Rice', quantity: 2 }])).toBe(null)
  })
})
