// Copies the Tesseract.js worker, LSTM core and English data into
// public/tesseract/ so the receipt scanner is served from this app's own
// origin (no CDN). Runs before dev and build. public/tesseract is gitignored.
import { mkdirSync, copyFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const require = createRequire(import.meta.url)
const out = new URL('../public/tesseract/', import.meta.url)
mkdirSync(out, { recursive: true })
const tjs = dirname(require.resolve('tesseract.js/package.json'))
const core = dirname(require.resolve('tesseract.js-core/package.json'))
const eng = dirname(require.resolve('@tesseract.js-data/eng/package.json'))
const files = [
  [join(tjs, 'dist', 'worker.min.js'), 'worker.min.js'],
  [join(core, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(core, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(eng, '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
]
let total = 0
for (const [from, name] of files) { copyFileSync(from, new URL(name, out)); total += statSync(from).size }
console.log(`copied OCR assets to public/tesseract (${(total / 1e6).toFixed(1)} MB incl. both cores)`)
