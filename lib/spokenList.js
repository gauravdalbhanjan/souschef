// Turn a typed or spoken shopping list into separate pantry items. Handles:
//   "2 lb chicken, a dozen eggs, milk and 3 bananas"          (amount first)
//   "Romaine Lettuce 1 Head Parmesan 40 G Croutons 1 Cup Lemon" (name first, no commas)
// Items without a clear amount get quantity null; the confirm step lets the
// user set or fix it.
import { canonicalOf, categoryOf } from './normalize.js'

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, half: 0.5, couple: 2, dozen: 12,
}

const UNITS = {
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', oz: 'oz', ounce: 'oz', ounces: 'oz',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gr: 'g', gram: 'g', grams: 'g', l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l', ml: 'ml',
  gal: 'gal', gallon: 'gal', gallons: 'gal', qt: 'qt', quart: 'qt', quarts: 'qt',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  cup: 'cup', cups: 'cup', clove: 'clove', cloves: 'clove', slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can', tin: 'can', tins: 'can', bunch: 'bunch', bunches: 'bunch',
  head: 'head', heads: 'head', loaf: 'loaf', loaves: 'loaf', bulb: 'bulb', bulbs: 'bulb',
  pc: 'unit', pcs: 'unit', piece: 'unit', pieces: 'unit', each: 'unit', ea: 'unit', x: 'unit',
}

const titleCase = (s) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())

function toNumber(t) {
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t)
  const f = t.match(/^(\d+)\/(\d+)$/)
  if (f && Number(f[2])) return Number(f[1]) / Number(f[2])
  return null
}
// Number words only count as amounts at the start of an amount ("a dozen eggs").
const amountAt = (w, i) => toNumber(w[i]) ?? (NUMBER_WORDS[w[i]] != null && i + 1 < w.length ? NUMBER_WORDS[w[i]] : null)

const make = (nameWords, qty, unit, raw) => {
  const name = nameWords.join(' ').replace(/^(of|the)\s+/, '').trim()
  if (name.length < 2) return null
  return {
    display: titleCase(name), canonical: canonicalOf(name), category: categoryOf(name),
    quantity: qty, unit: unit || (qty != null ? 'unit' : null), rawText: raw.trim(),
  }
}

// Read one comma-free chunk, which may still contain several items.
function parseChunk(chunk) {
  const w = chunk.toLowerCase().replace(/(\d)([a-z])/g, '$1 $2').replace(/[^a-z0-9.\s/]/g, ' ').split(/\s+/).filter(Boolean)
  const out = []
  let name = []
  let i = 0
  const readAmount = () => { // number [a] [dozen] [unit]
    let qty = amountAt(w, i); i++
    if (w[i] === 'a' || w[i] === 'an') i++
    if (w[i] === 'dozen') { qty = qty === 12 ? 12 : qty * 12; i++ }
    let unit = null
    if (i < w.length && UNITS[w[i]]) { unit = UNITS[w[i]]; i++ }
    return { qty, unit }
  }
  const amountFirst = amountAt(w, 0) != null
  while (i < w.length) {
    if (amountAt(w, i) != null) {
      const { qty, unit } = readAmount()
      if (amountFirst || !name.length) {
        // "2 lb chicken breast": the name runs until the next amount
        const nameWords = []
        while (i < w.length && amountAt(w, i) == null) nameWords.push(w[i++])
        const it = make(nameWords, qty, unit, chunk); if (it) out.push(it)
      } else {
        // "Parmesan 40 g": amount closes the pending name
        const it = make(name, qty, unit, chunk); if (it) out.push(it)
        name = []
      }
    } else {
      name.push(w[i++])
    }
  }
  if (name.length) { const it = make(name, null, null, chunk); if (it) out.push(it) }
  return out
}

export function parseSpokenList(text) {
  return String(text || '')
    .replace(/\b(i (just )?(bought|got|picked up|purchased)|some|also|plus)\b/gi, ' ')
    .split(/,|;|\n|\band\b|&/i)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(parseChunk)
}
