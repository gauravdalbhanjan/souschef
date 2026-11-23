// "Export data" as an Excel workbook, and "Import data" from it (or from the
// older .json backups). Readable sheets for people; one hidden sheet holds
// the exact backup so Import restores everything. Import still goes through
// lib/backup.js importData (size limit, known keys, every value validated).
import { exportData, importData, MAX_IMPORT_BYTES } from './backup.js'
import { writeXlsx, readColumnA } from './xlsx.js'
import { TABLES } from './deviceStore.js'
import { DAY_NAMES } from './routines.js'
import { allEvents, planDishNames, CUSTOM_KEY } from './events.js'
import { APP_NAME, APP_VERSION } from './appInfo.js'

export const BACKUP_SHEET = 'SousChef backup'
const MARK = 'souschef-backup:v1'
const CHUNK = 30000 // under Excel's 32,767 characters per cell
const MAX_FILE = 20 * 1024 * 1024

const date = () => new Date().toISOString().slice(0, 10)
export const exportFileName = () => `souschef-data-${date()}.xlsx`

// -> { blob, summary: [{ sheet, rows }] }
export function exportWorkbook(doc = exportData()) {
  const d = { ...doc.data }
  const take = (k) => { const v = d[k]; delete d[k]; return v }
  const pantry = take(TABLES.pantry) || []
  const cart = take(TABLES.cart) || []
  const routines = take('souschef_routines') || []
  const plans = take('souschef_events') || {}
  const custom = plans[CUSTOM_KEY] || []
  const events = allEvents(plans)
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (v ?? ''))
  const sheets = [
    { name: 'Pantry', widths: [28, 10, 10, 14, 18, 14, 12], rows: [['Item', 'Quantity', 'Unit', 'Category', 'Brand', 'Purchased', 'Bought qty'],
      ...pantry.map(p => [p.display, n(p.quantity), p.unit, p.category, p.brand || '', p.purchased || '', n(p.boughtQty)])] },
    { name: 'Cart', widths: [28, 10, 10, 14, 24], rows: [['Item', 'Quantity', 'Unit', 'Category', 'For'], ...cart.map(c => [c.display, n(c.quantity), c.unit, c.category, c.source || ''])] },
    { name: 'Routines', widths: [24, 10, 40, 10], rows: [['Dish', 'Time', 'Days', 'Servings'],
      ...routines.map(r => [r.dish, r.time || '', (r.days || []).length ? r.days.map(i => DAY_NAMES[i]).filter(Boolean).join(', ') : 'Not scheduled', n(r.servings)])] },
    { name: 'Events', widths: [24, 14, 12, 60], rows: [['Event', 'Date', 'Your event', 'Planned dishes'],
      ...events.filter(e => e.custom || plans[e.id]).map(e => [e.name, custom.find(c => c.id === e.id)?.date || '', e.custom ? 'Yes' : '', planDishNames(e.id, plans[e.id]).join(', ')])] },
    { name: 'Settings', widths: [32, 60], rows: [['Setting', 'Value'], ...Object.entries(d).map(([k, v]) => [k.replace(/^souschef_(db_)?/, ''), typeof v === 'string' ? v : JSON.stringify(v)])] },
    { name: 'About', header: false, widths: [80], rows: [[`${APP_NAME} data export`], [`Exported ${date()} · version ${APP_VERSION}`], ['Use Settings → Import data in SousChef to restore this file.'], ['The hidden sheet "SousChef backup" holds the exact copy used by Import; editing the other sheets doesn\u2019t change what Import restores.']] },
  ]
  const json = JSON.stringify(doc)
  const chunks = [MARK]
  for (let i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK))
  sheets.push({ name: BACKUP_SHEET, hidden: true, header: false, rows: chunks.map(c => [c]) })
  const summary = sheets.filter(s => !s.hidden && s.header !== false).map(s => ({ sheet: s.name, rows: s.rows.length - 1 }))
  return { blob: writeXlsx(sheets), summary }
}

// file: a File / Blob from <input type="file">. -> importData result
export async function importFile(file) {
  if (!file || file.size > MAX_FILE) return { ok: false, error: 'The file is too large or empty.' }
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  if (!isZip) return importData(await file.text()) // older .json backups
  let cells
  try { cells = await readColumnA(await file.arrayBuffer(), BACKUP_SHEET) } catch { return { ok: false, error: 'This isn\u2019t a SousChef data file.' } }
  if (cells[0] !== MARK) return { ok: false, error: 'This isn\u2019t a SousChef data file.' }
  const json = cells.slice(1).join('')
  if (json.length > MAX_IMPORT_BYTES) return { ok: false, error: 'The file is too large or empty.' }
  return importData(json)
}
