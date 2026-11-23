// Minimal .xlsx (Office Open XML) writer + reader, no dependencies.
// Writer: text/number cells, a bold header row, optional hidden sheets; files
// are a plain ZIP (stored, no compression). Cells are written as inline
// strings or numbers, never formulas, so text like "=1+1" stays text.
// Reader: only what Import needs (one sheet's column A as text), for files we
// wrote and the same files after Excel / Numbers / Sheets re-save them
// (deflate is unpacked with the browser's DecompressionStream).

// ── ZIP ─────────────────────────────────────────────────────────────────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const enc = new TextEncoder()

function zip(files) { // [{ name, data: string }]
  const parts = [], central = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true) // utf-8 names
    local.setUint16(8, 0, true); local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    parts.push(new Uint8Array(local.buffer), name, data)
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true)
    cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), name)
    offset += 30 + name.length + data.length
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

async function inflateRaw(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(s).arrayBuffer())
}
// -> Map(name -> Uint8Array). Reads the central directory (works with data descriptors).
async function unzip(buf, { maxBytes = 20 * 1024 * 1024 } = {}) {
  const b = new Uint8Array(buf), v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let e = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break }
  if (e < 0) throw new Error('not-zip')
  const count = v.getUint16(e + 10, true)
  let p = v.getUint32(e + 16, true)
  const out = new Map()
  let total = 0
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('bad-zip')
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), usize = v.getUint32(p + 24, true)
    const nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true)
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extra + comment
    total += usize
    if (total > maxBytes) throw new Error('too-large')
    if (!/^(xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/[^/]+\.xml)$/.test(name)) continue
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = b.subarray(start, start + size)
    out.set(name, method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null)
  }
  return out
}

// ── XML helpers ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-control-regex
const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
const esc = (s) => clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&')
const col = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s }
const sheetName = (s) => clean(s).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Sheet'

// ── writer ──────────────────────────────────────────────────────────────────
// sheets: [{ name, rows: [[cell...]...], header?: true, hidden?: true, widths?: [chars] }]
export function writeXlsx(sheets) {
  const files = []
  const sheetXml = (s) => {
    const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
      const ref = `${col(ci)}${ri + 1}`, style = s.header !== false && ri === 0 ? ' s="1"' : ''
      if (typeof c === 'number' && Number.isFinite(c)) return `<c r="${ref}"${style}><v>${c}</v></c>`
      if (c == null || c === '') return ''
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(c)}</t></is></c>`
    }).join('')}</row>`).join('')
    const cols = s.widths?.length ? `<cols>${s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${s.header !== false ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : ''}${cols}<sheetData>${rows}</sheetData></worksheet>`
  }
  files.push({ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` })
  files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' })
  files.push({ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(sheetName(s.name))}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` })
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` })
  files.push({ name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>' })
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }))
  return zip(files)
}

// ── reader ──────────────────────────────────────────────────────────────────
// -> column A of the named sheet, top to bottom, as strings (empty cells skipped).
export async function readColumnA(buf, name) {
  const files = await unzip(buf)
  const text = (n) => (files.get(n) ? new TextDecoder().decode(files.get(n)) : '')
  const wb = text('xl/workbook.xml')
  const sheet = [...wb.matchAll(/<sheet\b[^>]*>/g)].map(m => m[0]).find(t => unesc((t.match(/\bname="([^"]*)"/) || [])[1] || '') === name)
  if (!sheet) throw new Error('no-sheet')
  const rid = (sheet.match(/\br:id="([^"]+)"/) || [])[1]
  const rel = [...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => m[0]).find(t => t.includes(`Id="${rid}"`))
  const target = (rel?.match(/Target="([^"]+)"/) || [])[1]
  if (!target) throw new Error('no-sheet')
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => unesc(t[1])).join(''))
  const out = []
  for (const m of text(path).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1], body = m[2] || ''
    const ref = (attrs.match(/\br="([A-Z]+)(\d+)"/) || [])
    if (ref[1] !== 'A') continue
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1]
    let v
    if (t === 's') v = shared[Number((body.match(/<v>(\d+)<\/v>/) || [])[1])] ?? ''
    else if (t === 'inlineStr') v = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => unesc(x[1])).join('')
    else v = unesc((body.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '')
    if (v) out.push({ row: Number(ref[2]), v })
  }
  return out.sort((a, b) => a.row - b.row).map(x => x.v)
}
