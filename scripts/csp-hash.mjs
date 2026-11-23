// Prints the CSP hash of every inline <script> in index.html (or a built
// dist/index.html), and checks vercel.json's script-src lists them.
//   node scripts/csp-hash.mjs [path/to/index.html]
// Re-run after editing the inline theme script, then update vercel.json.
import fs from 'node:fs'
import crypto from 'node:crypto'

const file = process.argv[2] || 'index.html'
const html = fs.readFileSync(file, 'utf8')
const csp = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value
const scriptSrc = (csp.match(/script-src([^;]*)/) || [, ''])[1]
let ok = true
for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  const hash = `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`
  const listed = scriptSrc.includes(hash)
  if (!listed) ok = false
  console.log(hash, listed ? 'in vercel.json' : 'MISSING from vercel.json script-src')
}
process.exit(ok ? 0 : 1)
