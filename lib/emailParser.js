// Email-receipt parsing for grocery orders (Instacart, Amazon Fresh, generic).
//
// Reads pasted / forwarded receipt-email TEXT and extracts grocery line items.
// No inbox access needed. To later ingest email automatically, implement
// gmail.js (see fetchGmailReceipts stub) and feed message bodies through here.
import { normalizeLine } from './normalize.js'

function detectVendor(text) {
  const t = text.toLowerCase()
  if (t.includes('instacart')) return 'instacart'
  if (t.includes('amazon fresh') || t.includes('amazonfresh') || (t.includes('amazon') && t.includes('fresh'))) return 'amazonfresh'
  if (t.includes('whole foods')) return 'wholefoods'
  return 'generic'
}

function extractDate(text) {
  const m = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/) ||
            text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/) ||
            text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i)
  if (m) {
    const d = new Date(m[0].replace(/-/g, '/'))
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }
  return null
}

const SKIP_RE = /\b(subtotal|total|tax|tip|fee|delivery|service|order\s*#|placed|estimated|refund|credit|thank|view order|track|reorder|receipt|payment|charged|savings|bag)\b/i
const QTY_LINE_RE = /^\s*(\d+)\s*(?:x|×|qty|ct)?\s+(.+?)\s*(?:\$?\s*\d+[.,]\d{2})?\s*$/i
const PRICE_RE = /\$?\s*(\d+[.,]\d{2})\s*$/

// Instacart lines often look like "2 · Organic Bananas" or "1 ct  Whole Milk"
function parseLine(raw, vendor, date) {
  let text = raw.replace(/\s+/g, ' ').replace(/[•·]/g, ' ').trim()
  if (text.length < 3 || SKIP_RE.test(text)) return null
  if (!/[a-zA-Z]{3,}/.test(text)) return null

  let price = null
  const pm = text.match(PRICE_RE)
  if (pm) { price = Number(pm[1].replace(',', '.')); text = text.slice(0, pm.index).trim() }

  let count = 1
  const qm = text.match(/^(\d+)\s*(?:x|×|qty|ct)?\s+/i)
  if (qm) { count = Number(qm[1]); text = text.slice(qm[0].length).trim() }

  const norm = normalizeLine(text)
  if (!norm || norm.category === 'Other') return null

  return {
    canonical: norm.canonical,
    display: norm.display,
    category: norm.category,
    quantity: (norm.quantity || 1) * count,
    unit: norm.unit,
    brand: norm.brand,
    price,
    purchased: date,
    confidence: 0.8, // email text is cleaner than OCR
  }
}

export function parseEmailReceipt(text) {
  const vendor = detectVendor(text)
  const date = extractDate(text)
  const items = []
  const seen = new Map()
  for (const raw of text.split(/\r?\n/)) {
    const item = parseLine(raw, vendor, date)
    if (!item) continue
    const key = `${item.canonical}|${item.unit}|${item.brand || ''}`
    if (seen.has(key)) seen.get(key).quantity += item.quantity
    else { seen.set(key, item); items.push(item) }
  }
  return { vendor, date, items }
}

