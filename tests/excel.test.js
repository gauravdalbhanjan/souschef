// Excel export round-trips through Import; Pro signup posts the email.
import { describe, it, expect, beforeEach } from 'vitest'
import { writeXlsx, readColumnA } from '../lib/xlsx.js'
import { exportWorkbook, importFile, BACKUP_SHEET } from '../lib/backupExcel.js'
import { BACKUP_FORMAT, BACKUP_VERSION } from '../lib/backup.js'
import { rawGet, rawSet, TABLES } from '../lib/deviceStore.js'
import { sendProSignup, isEmail } from '../lib/feedback.js'
import { PRO_SIGNUP_FORM } from '../lib/appInfo.js'

const pantry = [{ id: 1, canonical: 'rice', display: 'Basmati Rice', category: 'Staples', quantity: 2, unit: 'lb', brand: null, purchased: '2026-11-01', boughtQty: 2 },
  { id: 2, canonical: 'milk', display: '=HYPERLINK("x") <tag> & "quotes"', category: 'Dairy', quantity: 1, unit: 'gal', brand: null, purchased: null }]
const doc = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: 'x', data: { [TABLES.pantry]: pantry, souschef_color_mode: 'dark' } }

describe('xlsx', () => {
  it('writes a real zip workbook and reads a column back', async () => {
    const blob = writeXlsx([{ name: 'A', rows: [['h'], ['one'], ['two & <three>']] }, { name: 'Hidden', hidden: true, header: false, rows: [['x'.repeat(40000)]] }])
    const buf = await blob.arrayBuffer()
    expect(new Uint8Array(buf).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]))
    expect(await readColumnA(buf, 'A')).toEqual(['h', 'one', 'two & <three>'])
    expect((await readColumnA(buf, 'Hidden'))[0].length).toBe(40000)
  })
  it('text that looks like a formula stays text', async () => {
    const xml = new TextDecoder().decode(new Uint8Array(await writeXlsx([{ name: 'S', rows: [['=1+1']] }]).arrayBuffer()))
    expect(xml).toContain('t="inlineStr"')
    expect(xml).not.toContain('<f>')
  })
})

describe('export → import', () => {
  beforeEach(() => { rawSet(TABLES.pantry, '[]') })
  it('readable sheets + hidden backup restore the same data', async () => {
    const { blob, summary } = exportWorkbook(doc)
    expect(summary.find(s => s.sheet === 'Pantry').rows).toBe(2)
    const file = new File([blob], 'souschef-data.xlsx')
    const r = await importFile(file)
    expect(r.ok).toBe(true)
    expect(JSON.parse(rawGet(TABLES.pantry))[1].display).toBe(pantry[1].display)
  })
  it('rejects a workbook that isn’t ours, and still takes old .json backups', async () => {
    const other = new File([writeXlsx([{ name: BACKUP_SHEET, rows: [['not a backup']] }])], 'x.xlsx')
    expect((await importFile(other)).ok).toBe(false)
    expect((await importFile(new File([JSON.stringify(doc)], 'old.json'))).ok).toBe(true)
  })
})

describe('Pro early signup', () => {
  it('validates and posts the email to the form field', async () => {
    expect(isEmail('a@b.co')).toBe(true)
    expect(isEmail('not an email')).toBe(false)
    expect(isEmail('a@b')).toBe(false)
    let call
    expect(await sendProSignup('  Me@Example.com ', async (u, o) => { call = { u, o }; return {} })).toBe(true)
    expect(call.u).toBe(PRO_SIGNUP_FORM.action)
    expect(call.o.body.get('entry.950253853')).toBe('me@example.com')
    expect(call.o).toMatchObject({ method: 'POST', mode: 'no-cors', credentials: 'omit' })
  })
})
