// Writes customHttp.yml (AWS Amplify Hosting headers) from vercel.json, so both
// hosts send the same CSP and security headers. Run after editing vercel.json:
//   node scripts/sync-headers.mjs
// tests/deploy.test.js fails if the two drift apart.
import fs from 'node:fs'

const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const q = (s) => JSON.stringify(String(s)) // JSON strings are valid YAML double-quoted scalars
// vercel "source" patterns -> Amplify globs
const pattern = (src) => (src === '/(.*)' ? '**/*' : src.replace(/^\//, ''))
const lines = ['# Generated from vercel.json by scripts/sync-headers.mjs. Do not edit by hand.', 'customHeaders:']
for (const block of v.headers) {
  lines.push(`  - pattern: ${q(pattern(block.source))}`, '    headers:')
  for (const h of block.headers) lines.push(`      - key: ${q(h.key)}`, `        value: ${q(h.value)}`)
}
fs.writeFileSync('customHttp.yml', lines.join('\n') + '\n')
console.log('customHttp.yml written')
