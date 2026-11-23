// Builds public/data/recipes-wikibooks.json from the Wikibooks Cookbook
// (CC BY-SA 4.0). Run by hand: `node scripts/build-dataset.mjs`.
// Raw downloads are cached outside the repo (DATA_CACHE, default ../_data).
//
// Guardrails applied here, before anything reaches the app:
//   • only recipes with an ingredient list (2-25 items) and 2+ steps
//   • titles/ingredients/steps run through the same harmful / blocked-method
//     checks as model output (raw fish, canning, curing, raw eggs/meat, ...)
//   • drinks and alcoholic recipes are dropped
//   • links and URLs are removed from the text: credits are shown as text,
//     users are never sent to another site or app
//   • sentences that claim something is "safe" are removed (the app never
//     says "safe"; code adds the USDA temperatures)
//   • images: only jpg/png/webp from upload.wikimedia.org, with author + license
//   • quality: stub, fragmented or action-less instructions are dropped; steps
//     are split one action per step, abbreviations normalized, and each step
//     lists the ingredients it uses (lib/stepParser.js). Safety cues and USDA
//     temperatures are added by the app at runtime (code-owned), not stored here.
import fs from 'node:fs'
import path from 'node:path'
import { outputViolations } from '../lib/guardrails/policy.js'
import { normalizeLine, STAPLES } from '../lib/normalize.js'
import { isCore } from '../lib/match.js'
import { pickCuisine } from '../lib/cuisines.js'
import { canonicalFor } from '../lib/ingredientName.js'
import { splitSteps, stepQuality, mapIngredients, prepNote, normalizeAbbrev } from '../lib/stepParser.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..')
const CACHE = process.env.DATA_CACHE || path.resolve(ROOT, '..', '_data', 'wikibooks')
const OUT = path.join(ROOT, 'public', 'data', 'recipes-wikibooks.json')
const META = path.join(ROOT, 'lib', 'data', 'datasetMeta.json')
const FORMAT = 2
const API = 'https://en.wikibooks.org/w/api.php'
const UA = 'SousChef-dataset-builder/1.0 (non-profit recipe app; contact via GitHub gauravdalbhanjan/souschef)'
fs.mkdirSync(CACHE, { recursive: true })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function api(params) {
  const body = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })
  let status = 0
  for (let i = 0; i < 6; i++) {
    const r = await fetch(API, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    status = r.status
    if (r.ok) { const j = await r.json(); if (!j.error) return j; status = j.error.code }
    await sleep(Math.max(3000, Number(r.headers.get('retry-after') || 0) * 1000) * (i + 1))
  }
  throw new Error(`API failed (${status}): ${params.action} ${params.prop || params.list}`)
}
async function cached(name, fn) {
  const f = path.join(CACHE, name)
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  const v = await fn()
  fs.writeFileSync(f, JSON.stringify(v))
  return v
}

// ── 1. titles ───────────────────────────────────────────────────────────────
const titles = await cached('titles.json', async () => {
  const out = []
  let cont = {}
  do {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: 'Category:Recipes', cmlimit: '500', cmnamespace: '102', ...cont })
    out.push(...j.query.categorymembers.map(m => m.title))
    cont = j.continue ? { cmcontinue: j.continue.cmcontinue } : null
  } while (cont)
  return out
})
console.log('titles', titles.length)

// ── 2. wikitext, 50 pages per request ───────────────────────────────────────
// Resumable: progress is saved after every batch.
const PART = path.join(CACHE, 'pages.partial.json')
const pages = await cached('pages.json', async () => {
  const out = fs.existsSync(PART) ? JSON.parse(fs.readFileSync(PART, 'utf8')) : {}
  const todo = titles.filter(t => !(t in out))
  for (let i = 0; i < todo.length; i += 25) {
    const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: todo.slice(i, i + 25).join('|') })
    for (const p of j.query.pages) out[p.title] = p.revisions ? p.revisions[0].slots.main.content : ''
    fs.writeFileSync(PART, JSON.stringify(out))
    process.stdout.write(`\rpages ${Object.keys(out).length}/${titles.length}`)
    await sleep(1000)
  }
  console.log()
  return out
})

// ── 3. parse ────────────────────────────────────────────────────────────────
const UNIT_PAGES = new Set(['each', 'ea', 'ounces', 'pounds', 'grams', 'cups', 'tablespoons', 'teaspoons', 'gram',  'g', 'kg', 'kilogram', 'mg', 'pound', 'lb', 'ounce', 'oz', 'fluid ounce', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'cup', 'ml', 'milliliter', 'millilitre',
  'l', 'liter', 'litre', 'pinch', 'dash', 'quart', 'pint', 'gallon', 'dl', 'cl', 'centimetre', 'centimeter', 'inch', 'mm', 'cm', 'stick', 'clove', 'can'])
// Links that name a technique or a tool, not an ingredient.
const NOT_INGREDIENT = /^((chop|slic|dic|minc|grat|julienn|peel|crush|whisk|knead|marinat|blanch|shredd?|zest|sift|saut|garnish|simmer|boil|steam|puree|purée|mash|grind|soak|drain|rins|trim|stir-fr|deep-fr|pan-fr)[a-zé]*|dic(ing|ed)|minc(ing|ed)|slic(ing|ed)|julienne|peel(ing|ed)|crush(ing|ed)|beat(ing|en)|whisk(ing)?|(deep |stir-|pan )?fr(ying|ied)|boil(ing|ed)|simmer(ing)?|steam(ing|ed)|roast(ing|ed)|bak(ing|ed)|knead(ing)?|marinat(e|ing)|blanch(ing|ed)|toast(ing|ed)|melt(ing|ed)|cub(e|ed|ing)|shredd(ing|ed)|zest(ing)?|sift(ing|ed)|saut(e|é|eing|éing|éed|eed)|garnish|frying pan|saucepan|wok|oven|bowl|knife|skillet|blender|food processor|mortar and pestle|cutting board|grill(ing)?|pressure cooker|slow cooker)$/i
const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67, '⅛': 0.125 }
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
function strip(s) {
  let t = String(s)
  t = t.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '')
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, '')
  t = t.replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '').replace(/\[\[Category:[^\]]*\]\]/gi, '')
  t = t.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, (_, a) => a.replace(/^(Cookbook|w|wikipedia):/i, ''))
  t = t.replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1')
  t = t.replace(/https?:\/\/\S+|www\.\S+/gi, '')
  t = t.replace(/'''?/g, '').replace(/<[^>]+>/g, '')
  return decode(t).replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}
const noSafeClaims = (s) => (s.match(/[^.!?]+[.!?]*/g) || [s]).filter(x => !/\bsafe(ly|ty)?\b/i.test(x)).join(' ').trim()
function section(text, names) {
  const re = new RegExp(`^==+\\s*(${names})\\s*==+\\s*$`, 'im')
  const m = re.exec(text)
  if (!m) return ''
  const rest = text.slice(m.index + m[0].length)
  const end = rest.search(/^==[^=].*==\s*$/m)
  return end < 0 ? rest : rest.slice(0, end)
}
function parseTime(s) {
  if (!s) return null
  const t = strip(s).toLowerCase().replace('½', '.5').replace('¼', '.25').replace('¾', '.75')
  let m = 0
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/); if (h) m += Number(h[1]) * 60
  const mm = t.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/); if (mm) m += Number(mm[1])
  const d = t.match(/(\d+)\s*(?:day|days)\b/); if (d) m += Number(d[1]) * 1440
  return m > 0 ? Math.round(m) : null
}
const field = (summary, key) => (summary.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]*(?:\\[\\[[^\\]]*\\]\\][^\\n|]*)*)`, 'i')) || [])[1]?.trim() || ''
const CUISINE = [
  [/indian|pakistani|bangladeshi|sri lankan|nepal|punjabi|bengali|gujarati|kerala|goan|tamil/i, 'Indian'],
  [/mexican|tex-mex/i, 'Mexican'],
  [/chinese|japanese|korean|thai|vietnamese|filipino|indonesian|malaysian|singapore|asian|cambodian|lao|burmese|taiwanese|cantonese|sichuan/i, 'Asian'],
  [/american|united states|cajun|creole|southern u|new england|hawaiian|soul food/i, 'American'],
]
const TYPE = [
  [/breakfast/i, 'breakfast'], [/dessert|cake|cookie|pie recipes|pastr|sweet/i, 'dessert'], [/soup|stew/i, 'soup'], [/salad/i, 'salad'],
  [/sandwich/i, 'sandwich'], [/side dish/i, 'side'], [/appetizer|snack|dip/i, 'snack'], [/main course|main dish|curry|casserole/i, 'main'],
]
const DROP_CATS = /beverage|drink|cocktail|alcoholic|liqueur|wine recipes|beer|smoothie|canning|preserv|pickl|cured|sausage making|pet food|baby food|cleaning/i
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

const recipes = []
const stats = { pages: 0, noIngredients: 0, noSteps: 0, guardrail: 0, dropCat: 0, quality: {}, kept: 0 }
const seen = new Set()
for (const [title, text] of Object.entries(pages)) {
  stats.pages++
  const name = title.replace(/^Cookbook:/, '').trim()
  const cats = [...text.matchAll(/\[\[Category:([^\]|]+)/gi)].map(m => m[1].trim())
  if (cats.some(c => DROP_CATS.test(c))) { stats.dropCat++; continue }
  const ingText = section(text, 'Ingredients')
  const procText = section(text, 'Procedure|Directions|Method|Preparation|Instructions|Steps')
  const ingredients = []
  for (const raw of ingText.split('\n')) {
    if (!/^\*/.test(raw)) continue
    const line = raw.replace(/^\*+\s*/, '')
    const links = [...line.matchAll(/\[\[(?:Cookbook:)?([^\]|#]+)(?:\|([^\]]*))?\]\]/g)].map(m => ({ target: m[1].trim(), shown: (m[2] || m[1]).trim() }))
    // The first link that names a food (not a unit, a technique or a tool).
    const item = links.find(l => !UNIT_PAGES.has(l.target.toLowerCase()) && !NOT_INGREDIENT.test(l.target.trim()) && !/^(w|wikipedia|file|image):/i.test(l.target) && canonicalFor(l.target))
    // Unicode fractions -> decimals so "1 ½ cups" reads as 1.5 cups.
    const plain = strip(line).replace(/(\d+)\s*([½¼¾⅓⅔⅛])/g, (_, n, f) => String(Number(n) + FRAC[f])).replace(/[½¼¾⅓⅔⅛]/g, f => String(FRAC[f]))
    if (!plain || plain.length > 160) continue
    const n = normalizeLine(plain)
    if (!n) continue
    const nameText = item ? item.target : n.display
    const canonical = canonicalFor(nameText)
    if (!canonical || canonical.length > 40) continue
    ingredients.push({
      d: (item ? item.shown : n.display).replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40),
      c: canonical, q: /[\d\u00bc-\u00be\u2150-\u215e]|\b(one|two|three|four|five|six|half|dozen)\b/i.test(plain) ? Math.round((n.quantity || 0) * 100) / 100 : 0, u: n.unit || 'unit',
      ...(/optional/i.test(plain) ? { o: 1 } : {}), ...(STAPLES.has(canonical) ? { s: 1 } : {}), ...(prepNote(plain) ? { p: normalizeAbbrev(prepNote(plain)) } : {}), t: plain.slice(0, 120),
    })
  }
  if (ingredients.length < 2 || ingredients.length > 25) { stats.noIngredients++; continue }
  // The dish named after a protein must list it ("Teriyaki Salmon" needs salmon):
  // a missing core ingredient means the list didn't parse, so the recipe is dropped.
  const titleCore = (name.toLowerCase().match(/[a-z]+/g) || []).filter(w => isCore(w))
  if (titleCore.some(w => !ingredients.some(i => i.c.includes(w) || (w === 'steak' && i.c === 'beef')))) { stats.quality['title-protein-missing'] = (stats.quality['title-protein-missing'] || 0) + 1; continue }
  const steps = []
  for (const raw of procText.split('\n')) {
    if (!/^#/.test(raw)) continue
    const sub = /^##/.test(raw)
    const s = noSafeClaims(strip(raw.replace(/^#+[:*]?\s*/, '')))
    if (s.length < 4) continue
    if (sub && steps.length) steps[steps.length - 1] += ' ' + s
    else steps.push(s)
  }
  if (steps.length < 2 || steps.length > 30) { stats.noSteps++; continue }
  const clean = splitSteps(steps).map(s => s.slice(0, 600))
  const q = stepQuality(clean)
  if (!q.ok || clean.length > 30) { stats.quality[q.reason || 'too-many-steps'] = (stats.quality[q.reason || 'too-many-steps'] || 0) + 1; continue }
  const all = [name, ...ingredients.map(i => i.t), ...steps].join('\n')
  if (outputViolations(all).length) { stats.guardrail++; continue }
  const slug = `wb-${slugify(name)}`
  if (seen.has(slug)) continue
  seen.add(slug)
  const summary = (text.match(/\{\{\s*recipe ?summary[\s\S]*?\}\}/i) || [''])[0]
  const img = (field(summary, 'image').match(/(?:Image|File):([^|\]]+)/i) || text.match(/\[\[(?:Image|File):([^|\]]+)/i) || [])[1]?.trim()
  const catText = [...cats, ...[...text.matchAll(/\[\[Cookbook:Cuisine of ([^\]|]+)/gi)].map(m => m[1])].join(' | ')
  const servings = Number((strip(field(summary, 'servings')).match(/\d+/) || [])[0]) || null
  recipes.push({
    // Specific cuisine (Italian, Nigerian, ...) from categories + "Cuisine of" links.
    slug, n: name, cu: pickCuisine(cats, [...text.matchAll(/\[\[Cookbook:Cuisine of ([^\]|]+)/gi)].map(m => m[1])) || CUISINE.find(([re]) => re.test(catText))?.[1] || null, ty: TYPE.find(([re]) => re.test(catText))?.[1] || null,
    tm: parseTime(field(summary, 'time')), sv: servings && servings <= 24 ? servings : null,
    i: ingredients.map(({ t, ...rest }) => rest), st: (() => { const uses = mapIngredients(clean, ingredients); return clean.map((t, k) => (uses[k].length ? { t, i: uses[k] } : { t })) })(), img: img && /\.(jpe?g|png|webp)$/i.test(img) ? img : null,
  })
  stats.kept++
}
console.log('cuisines', Object.entries(recipes.reduce((m, r) => (m[r.cu || '(none)'] = (m[r.cu || '(none)'] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}:${v}`).join(' '))
console.log(stats, 'with time', recipes.filter(r => r.tm).length, 'with servings', recipes.filter(r => r.sv).length)

// ── 4. images: thumbnail URL + author + license ─────────────────────────────
const files = [...new Set(recipes.map(r => r.img).filter(Boolean))]
const info = await cached('images.json', async () => {
  const out = {}
  for (let i = 0; i < files.length; i += 50) {
    const j = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '640', iiextmetadatafilter: 'Artist|LicenseShortName|UsageTerms',
      titles: files.slice(i, i + 50).map(f => `File:${f}`).join('|') })
    for (const p of j.query.pages) {
      const ii = p.imageinfo?.[0]
      if (!ii) continue
      const md = ii.extmetadata || {}
      out[p.title.replace(/^File:/, '')] = { thumb: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight, mime: ii.mime, page: ii.descriptionurl,
        artist: strip(md.Artist?.value || '').slice(0, 80), license: strip(md.LicenseShortName?.value || '').slice(0, 40) }
    }
    process.stdout.write(`\rimages ${Object.keys(out).length}/${files.length}`)
    await sleep(300)
  }
  console.log()
  return out
})
// Normalized title keys (API turns "_" into " " and capitalizes).
const norm = (f) => f.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
const infoBy = new Map(Object.entries(info).map(([k, v]) => [norm(k), v]))
let withImg = 0
for (const r of recipes) {
  const ii = r.img && infoBy.get(norm(r.img))
  const thumb = String(ii?.thumb || '').split('?')[0]
  const ok = ii && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(thumb) && /^image\/(jpeg|png|webp)$/.test(ii.mime) && ii.w >= 120 && ii.h >= 90 && ii.license
  r.img = ok ? { u: thumb, w: ii.w, h: ii.h, a: ii.artist || 'Unknown author', l: ii.license, f: r.img } : null
  if (ok) withImg++
}

const out = {
  version: FORMAT, built: new Date().toISOString().slice(0, 10), count: recipes.length,
  source: { id: 'wikibooks-cookbook', name: 'Wikibooks Cookbook', license: 'CC BY-SA 4.0', licenseUrl: 'creativecommons.org/licenses/by-sa/4.0', authors: 'Wikibooks contributors',
    note: 'Recipes adapted (formatting, links removed) from the Wikibooks Cookbook. Shared under the same license.' },
  recipes,
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out))
// Tiny meta bundled with the app: the true recipe total without downloading the file.
fs.writeFileSync(META, JSON.stringify({ version: FORMAT, built: out.built, count: recipes.length, withImages: withImg, bytes: fs.statSync(OUT).size }, null, 2) + '\n')
console.log(`wrote ${recipes.length} recipes (${withImg} with images), ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB -> ${path.relative(ROOT, OUT)}`)
