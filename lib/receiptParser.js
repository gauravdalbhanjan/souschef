// Receipt text -> grocery items. Runs in the browser.
//
// Receipts rarely state the quantity bought, so quantity is left null and the
// user confirms it with the wheel picker. Names are scrubbed of prices/weights/
// SKUs, then resolved to the closest known ingredient (strict dictionary first,
// fuzzy nearest-match second). Inspired by the CORD receipt field taxonomy
// (menu.nm / menu.cnt / menu.price) but implemented as lightweight heuristics.
import { normalizeLine, categoryOf, displayForCanonical } from './normalize.js'
import { nearestIngredient } from './fuzzy.js'

// Lines that are never products (totals, payment, store chrome).
const SKIP_RE = /\b(subtotal|total|tax|change|cash|card|visa|master|debit|credit|balance|tender|auth|approval|ref|receipt|invoice|thank|welcome|store|tel|phone|cashier|order\s*#|qty\s*price|savings|loyalty|points|member)\b/i

function extractDate(text) {
  const patterns = [
    /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
    /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const d = new Date(m[0].replace(/-/g, '/'))
      if (!isNaN(d)) return d.toISOString().slice(0, 10)
    }
  }
  return null
}

const PRICE_RE = /\$?\s*(\d+[.,]\d{2})\s*[A-Z]?$/

// Strip price / weight / SKU noise so only the item name remains.
function cleanName(text) {
  return text
    .replace(/\$?\s*\d+[.,]\d{2}\s*[A-Zx]?\b/g, ' ')
    .replace(/\b\d+(\.\d+)?\s*(lb|lbs|kg|g|oz|gal|ml|l|ct|count|pk|pack|pkg|x)\b/gi, ' ')
    .replace(/@?\s*\d+(\.\d+)?\s*\/\s*(lb|kg|oz|g|ea)\b/gi, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^a-zA-Z\s'&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseReceiptLine(line, date) {
  const text = line.replace(/\s+/g, ' ').trim()
  if (text.length < 3) return null
  if (SKIP_RE.test(text)) return null
  if (!/[a-zA-Z]{3,}/.test(text)) return null

  let price = null
  const pm = text.match(PRICE_RE)
  if (pm) price = Number(pm[1].replace(',', '.'))

  const name = cleanName(text)
  if (name.length < 3) return null

  const norm = normalizeLine(name)
  let canonical, category, confidence
  if (norm && norm.category !== 'Other') {
    canonical = norm.canonical; category = norm.category; confidence = 0.75
  } else {
    const near = nearestIngredient(name)
    if (!near) return null
    canonical = near.canonical; category = near.category; confidence = near.score
  }

  return {
    canonical,
    display: displayForCanonical(canonical),
    category: category || categoryOf(canonical) || 'Other',
    quantity: null,
    unit: 'unit',
    brand: norm ? norm.brand : null,
    price,
    purchased: date,
    confidence,
    rawText: text,
  }
}

export function parseReceiptText(text) {
  const date = extractDate(text)
  const items = []
  const seen = new Map()
  for (const raw of String(text || '').split(/\r?\n/)) {
    const item = parseReceiptLine(raw, date)
    if (!item) continue
    const key = `${item.canonical}|${item.brand || ''}`
    if (seen.has(key)) {
      const ex = seen.get(key)
      ex.confidence = Math.max(ex.confidence, item.confidence)
    } else {
      seen.set(key, item)
      items.push(item)
    }
  }
  return { date, items }
}
