// The running app (everything reachable from main.jsx) must not import the
// disabled on-device AI or AI image-search code.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const DISABLED = ['lib/llm.js', 'lib/llm.worker.js', 'lib/aiTasks.js', 'lib/aiIdeas.js', 'lib/aiRecipes.js', 'lib/aiSearch.js', 'lib/images.js', 'lib/imageScore.js', 'lib/modelPins.json', 'api/image-search.js']

function reachable(entry) {
  const seen = new Set()
  const stack = [path.join(ROOT, entry)]
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file) || !fs.existsSync(file)) continue
    seen.add(file)
    if (!/\.(jsx?|mjs)$/.test(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|new URL\(\s*['"](\.[^'"]+)['"]/g)) {
      const spec = m[1] || m[2] || m[3]
      const base = path.resolve(path.dirname(file), spec)
      const hit = [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js')].find(p => fs.existsSync(p) && fs.statSync(p).isFile())
      if (hit) stack.push(hit)
    }
  }
  return [...seen].map(f => path.relative(ROOT, f).replace(/\\/g, '/'))
}

describe('runtime bundle', () => {
  const files = reachable('main.jsx')
  it('reaches the app', () => {
    expect(files).toContain('App.jsx')
    expect(files).toContain('lib/safeImage.js')
    expect(files).toContain('lib/dataset.js')
  })
  it('never reaches the disabled AI code', () => {
    expect(files.filter(f => DISABLED.includes(f) || f.startsWith('components/ai/'))).toEqual([])
  })
  it('ai-config.json is not served', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/ai-config.json'))).toBe(false)
  })
})
