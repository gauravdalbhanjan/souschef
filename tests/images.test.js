// Image fallback + credit guardrails.
import { describe, it, expect } from 'vitest'
import { sanitizeImageUrl, checkDimensions, secondaryCandidates, resolveImage } from '../lib/safeImage.js'
import { isLinkable, datasetCredit, photoCredit } from '../lib/guardrails/sources.js'
import { shapeDataset } from '../lib/dataset.js'

describe('image URLs', () => {
  it('allows https on approved hosts only', () => {
    expect(sanitizeImageUrl('https://upload.wikimedia.org/a/b/Curry.jpg#x')).toBe('https://upload.wikimedia.org/a/b/Curry.jpg')
    expect(sanitizeImageUrl('http://upload.wikimedia.org/a.jpg')).toBe(null)
    expect(sanitizeImageUrl('https://evil.example.com/a.jpg')).toBe(null)
    expect(sanitizeImageUrl('https://upload.wikimedia.org.evil.com/a.jpg')).toBe(null)
  })
  it('rejects scripts, svg, credentials, ports and odd characters', () => {
    for (const bad of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', 'https://upload.wikimedia.org/x.svg',
      'https://user:pw@upload.wikimedia.org/a.jpg', 'https://upload.wikimedia.org:8443/a.jpg', 'https://upload.wikimedia.org/a".jpg', ' https://upload.wikimedia.org/a.jpg', 42, null]) {
      expect(sanitizeImageUrl(bad)).toBe(null)
    }
  })
  it('checks decoded dimensions and shape', () => {
    expect(checkDimensions(640, 480)).toBe(true)
    expect(checkDimensions(40, 40)).toBe(false)       // too small / tracking pixel
    expect(checkDimensions(2000, 100)).toBe(false)    // banner, not a dish photo
    expect(checkDimensions(NaN, 480)).toBe(false)
    expect(checkDimensions(9000, 9000)).toBe(false)
  })
})

describe('secondary image search', () => {
  const page = (title, url, mime = 'image/jpeg', license = 'CC BY-SA 4.0') => ({ title, imageinfo: [{ thumburl: url, thumbwidth: 480, thumbheight: 360, mime, descriptionurl: 'https://commons.wikimedia.org/wiki/' + title,
    extmetadata: { Artist: { value: '<a href="x">Ann</a>' }, LicenseShortName: { value: license } } }] })
  const fetchWith = (pages) => async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ query: { pages } }) })
  it('keeps only approved, licensed, relevant bitmaps', async () => {
    const out = await secondaryCandidates({ name: 'Chicken Curry' }, fetchWith([
      page('File:Chicken curry.jpg', 'https://upload.wikimedia.org/c/curry.jpg'),
      page('File:Chicken curry 2.jpg', 'https://evil.example.com/curry.jpg'),
      page('File:Curry diagram.svg', 'https://upload.wikimedia.org/c/x.svg', 'image/svg+xml'),
      page('File:Chicken curry 3.jpg', 'https://upload.wikimedia.org/c/c3.jpg', 'image/jpeg', ''),
      page('File:Bicycle.jpg', 'https://upload.wikimedia.org/c/bike.jpg'),
    ]))
    expect(out.map(c => c.url)).toEqual(['https://upload.wikimedia.org/c/curry.jpg'])
    expect(out[0].author).toBe('Ann')
  })
  it('rejects photos of people and, for events, anything without food', async () => {
    const pg = (title, desc = '', cats = '') => ({ title, imageinfo: [{ thumburl: `https://upload.wikimedia.org/x/${encodeURIComponent(title)}.jpg`, thumbwidth: 480, thumbheight: 360, mime: 'image/jpeg',
      descriptionurl: 'https://commons.wikimedia.org/wiki/' + title, extmetadata: { Artist: { value: 'A' }, LicenseShortName: { value: 'CC BY 2.0' }, ImageDescription: { value: desc }, Categories: { value: cats } } }] })
    const out = await secondaryCandidates({ name: 'Diwali', kind: 'event' }, fetchWith([
      pg('File:Diwali 2019.jpg', 'A man and a woman celebrating'),
      pg('File:Diwali selfie.jpg'),
      pg('File:Diwali lamps.jpg', 'Oil lamps on a balcony'),
      pg('File:Diwali.jpg', 'Sweets', 'People of India'),
      pg('File:Diwali sweets.jpg', 'A plate of mithai'),
    ]))
    expect(out.map(c => c.title)).toEqual(['File:Diwali sweets.jpg'])
  })
  it('a failed search gives no candidates (then the placeholder)', async () => {
    expect(await secondaryCandidates({ name: 'Dal' }, async () => { throw new Error('offline') })).toEqual([])
    expect(await resolveImage({ slug: 't-none', name: 'Zzzz' })).toBe(null)
  })
})

describe('export and erase coverage', () => {
  it('tracks the image cache, guest, browse and broken-link keys', async () => {
    const { allAppKeys } = await import('../lib/deviceStore.js')
    for (const k of ['souschef_img_cache', 'souschef_guest', 'souschef_browse', 'souschef_broken_links']) expect(allAppKeys()).toContain(k)
  })
  it('an imported image cache must pass the URL allow-list', async () => {
    const { importData, BACKUP_FORMAT, BACKUP_VERSION } = await import('../lib/backup.js')
    const doc = (url) => JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: 'x', data: { souschef_img_cache: { 'wb-dal': { url, tier: 'secondary', approximate: true } } } })
    expect(importData(doc('https://upload.wikimedia.org/d.jpg')).ok).toBe(true)
    expect(importData(doc('https://evil.example.com/d.jpg')).ok).toBe(false)
    expect(importData(doc('javascript:alert(1)')).ok).toBe(false)
  })
  it('same-origin app images are allowed, protocol-relative ones are not', () => {
    expect(sanitizeImageUrl('/icons/egg.png')).toBe('/icons/egg.png')
    expect(sanitizeImageUrl('//evil.example.com/a.png')).toBe(null)
    expect(sanitizeImageUrl('/../etc/passwd')).toBe(null)
  })
})

describe('credits, not links', () => {
  it('recipe and photo sites are never linkable', () => {
    expect(isLinkable('https://en.wikibooks.org/wiki/Cookbook:Dal')).toBe(false)
    expect(isLinkable('https://commons.wikimedia.org/wiki/File:Dal.jpg')).toBe(false)
    expect(isLinkable('https://www.allrecipes.com/recipe/1')).toBe(false)
  })
  it('dataset credits are text only', () => {
    const ds = shapeDataset({ source: { id: 'wikibooks-cookbook', name: 'Wikibooks Cookbook', license: 'CC BY-SA 4.0', authors: 'Wikibooks contributors' },
      recipes: [{ slug: 'wb-dal', n: 'Dal', i: [{ d: 'Lentils', c: 'lentils', q: 1, u: 'cup' }, { d: 'Onion', c: 'onion', q: 1, u: 'unit' }], st: ['Rinse the lentils.', 'Simmer until soft.'],
        img: { u: 'https://upload.wikimedia.org/d.jpg', w: 640, h: 480, a: 'Bob', l: 'CC BY 2.0', f: 'Dal.jpg' } }] })
    const r = ds.recipes[0]
    const c = datasetCredit(r)
    expect(c.url).toBeUndefined()
    expect(c.address).toBe('en.wikibooks.org/wiki/Cookbook:Dal')
    expect(c.license).toBe('CC BY-SA 4.0')
    expect(photoCredit({ ...r.primary, tier: 'primary' }).url).toBeUndefined()
    expect(r.time_mins).toBeGreaterThan(0)
  })
})
