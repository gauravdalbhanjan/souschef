// Receipt cleanup validation. The model may only CLEAN lines the OCR produced:
// every item must point at a real OCR line, brand must appear in that line,
// canonical must exist in the dictionary (else "unrecognized"), amounts sane.
import { z } from 'zod'
import { DICT, canonicalOf, categoryOf } from '../normalize.js'

const CANONICALS = new Set(DICT.map(d => d[0]))
const RECEIPT_UNITS = ['unit', 'lb', 'oz', 'g', 'kg', 'gal', 'qt', 'pt', 'fl oz', 'ml', 'l', 'dozen', 'bunch', 'head', 'pack', 'can', 'loaf', 'bulb']

export const ReceiptSchema = z.object({
  items: z.array(z.object({
    source_line: z.number().int().min(0),
    raw_text: z.string().max(120),
    name: z.string().min(1).max(40),
    canonical: z.string().max(30).optional().nullable(),
    brand: z.string().max(40).optional().nullable(),
    quantity: z.number().positive().max(100).optional().nullable(),
    unit: z.string().max(10).optional().nullable(),
    size: z.string().max(20).optional().nullable(),
    confidence: z.number().min(0).max(1),
  })).max(80),
  ignored_lines: z.array(z.number().int().min(0)).max(200).optional().default([]),
}).strict()

// OCR quality: ask for a retake when it's too poor to use.
export const RETAKE_CONFIDENCE = 45
export function ocrTooPoor({ confidence, lines }) {
  const useful = (lines || []).filter(l => /[a-z]{3,}/i.test(l)).length
  return (Number.isFinite(confidence) && confidence < RETAKE_CONFIDENCE) || useful < 2
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// lines: OCR text lines (array). ruleItems: rule-based draft [{display, canonical, quantity, unit, brand, rawText}].
// -> { items: [confirm-screen items], rejected: n }
export function validateReceipt(raw, lines, ruleItems = []) {
  let data = raw
  if (typeof raw === 'string') { try { data = JSON.parse(raw) } catch { return null } }
  const p = ReceiptSchema.safeParse(data)
  if (!p.success) return null
  let rejected = 0
  const items = []
  const used = new Set()
  for (const it of p.data.items) {
    const line = lines[it.source_line]
    // Must reference a real OCR line, and the raw text must be that line (or part of it).
    if (line == null || !norm(line).includes(norm(it.raw_text)) || !norm(it.raw_text)) { rejected++; continue }
    if (used.has(it.source_line)) { rejected++; continue }
    used.add(it.source_line)
    // The cleaned name must be grounded in the line: share a 3+ letter token.
    // Receipt abbreviations count: "CHKN BRST" grounds "chicken breast" (same first letter, letters in order).
    const nameTokens = norm(it.name).split(' ').filter(w => w.length >= 3)
    const lineNorm = norm(line)
    const lineTokens = lineNorm.split(' ').filter(w => w.length >= 3 && /[a-z]/.test(w))
    const abbrev = (short, long) => short[0] === long[0] && [...short].every((ch, i, a) => { const at = long.indexOf(ch, a.slice(0, i).reduce((p, c) => long.indexOf(c, p) + 1, 0)); return at >= 0 })
    const grounded = nameTokens.some(n => lineTokens.some(l => l === n || n.startsWith(l) || l.startsWith(n) || abbrev(l, n)))
    let canonical = canonicalOf(it.canonical || it.name)
    if (!CANONICALS.has(canonical)) canonical = canonicalOf(it.name)
    const recognized = CANONICALS.has(canonical)
    const brand = it.brand && lineNorm.includes(norm(it.brand)) ? it.brand : null
    let quantity = it.quantity ?? 1
    let unit = RECEIPT_UNITS.includes(String(it.unit || '').toLowerCase()) ? String(it.unit).toLowerCase() : 'unit'
    if (unit === 'unit' && quantity > 24) quantity = 1
    if (['lb', 'kg'].includes(unit) && quantity > 25) quantity = 1
    const rule = ruleItems.find(r => r.rawText && norm(r.rawText) === norm(line))
    const disagree = !!rule && rule.canonical !== canonical
    items.push({
      display: recognized ? it.name : it.name, canonical: recognized ? canonical : null, category: recognized ? categoryOf(it.name) : 'Other',
      quantity, unit: unit === 'unit' ? 'unit' : unit, brand, rawText: line, sourceLine: it.source_line,
      confidence: it.confidence, flag: !grounded ? 'not-grounded' : !recognized ? 'unrecognized' : disagree ? 'disagree' : it.confidence < 0.6 ? 'low-confidence' : null,
    })
  }
  // Ungrounded names are dropped (no invented items).
  const out = items.filter(i => i.flag !== 'not-grounded')
  rejected += items.length - out.length
  return { items: out, rejected }
}
