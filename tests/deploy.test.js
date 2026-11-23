// Both hosts (Vercel, AWS Amplify) send the same security headers.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('deploy config', () => {
  it('customHttp.yml matches vercel.json', () => {
    const v = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
    const yml = fs.readFileSync(new URL('../customHttp.yml', import.meta.url), 'utf8')
    for (const block of v.headers) for (const h of block.headers) {
      expect(yml).toContain(`key: ${JSON.stringify(h.key)}`)
      expect(yml).toContain(`value: ${JSON.stringify(h.value)}`)
    }
  })
  it('amplify.yml builds with npm and serves dist', () => {
    const a = fs.readFileSync(new URL('../amplify.yml', import.meta.url), 'utf8')
    expect(a).toContain('npm ci')
    expect(a).toContain('npm run build')
    expect(a).toMatch(/baseDirectory: dist/)
  })
})
