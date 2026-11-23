// Source registry. Sources are attached by CODE; the model never writes names,
// books, authors or URLs. Only approved hosts are linkable; unverified sources
// and broken links are never shown.
import data from './sources.json'
import origins from '../data/origins.json'
import nutrition from '../data/nutrition.json'
import { localStore } from '../localStore.js'

const BROKEN_KEY = 'souschef_broken_links'
export const APPROVED_HOSTS = new Set([...data.approvedHosts, 'en.wikipedia.org', 'en.wikibooks.org', 'www.pexels.com', 'pixabay.com', 'unsplash.com', 'commons.wikimedia.org'])

const registry = new Map()
for (const s of data.sources) registry.set(s.id, { ...s, external: true })
for (const s of data.internal) registry.set(s.id, { ...s, external: false })
registry.set('fdc', { ...registry.get('fdc'), license: nutrition.meta.license, checked: nutrition.meta.retrieved })

const broken = () => { try { return new Set(JSON.parse(localStore.getItem(BROKEN_KEY) || '[]')) } catch { return new Set() } }
export const markBroken = (url) => localStore.setItem(BROKEN_KEY, JSON.stringify([...broken(), url]))

// GUARDRAIL: recipe and photo providers are credited, never linked. The app
// does not send users to other recipe/photo sites or apps; their credit, license
// and address are shown as plain text. Only food-safety and nutrition
// references (FDA, USDA, ...) may be opened.
export const NO_OUTBOUND_HOSTS = new Set([
  'en.wikibooks.org', 'commons.wikimedia.org', 'upload.wikimedia.org', 'en.wikipedia.org', 'zenodo.org',
  'www.allrecipes.com', 'allrecipes.com', 'www.food.com', 'food.com', 'www.instructables.com', 'instructables.com',
  'www.yummly.com', 'yummly.com', 'www.kitchenaid.com', 'www.kaggle.com', 'huggingface.co',
  'www.pexels.com', 'pexels.com', 'pixabay.com', 'unsplash.com',
])
export function isLinkable(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && APPROVED_HOSTS.has(u.host) && !NO_OUTBOUND_HOSTS.has(u.host) && !broken().has(url)
  } catch { return false }
}
// Plain-text address for a credit (no scheme, never a link).
export const plainAddress = (s) => String(s || '').replace(/^https?:\/\//i, '').replace(/[<>"'`]/g, '').slice(0, 160)
export function datasetCredit(recipe) {
  const d = recipe?.dataset
  if (!d) return null
  return { id: `ds-${recipe.slug}`, name: `${d.name}: “${recipe.name}”`, supports: `Recipe, adapted${d.authors ? ` · by ${d.authors}` : ''}`,
    license: d.license, address: plainAddress(d.page), external: false }
}
export function photoCredit(photo) {
  if (!photo) return null
  return { id: `photo-${photo.url}`, name: `Photo: ${photo.author || 'Unknown author'}`,
    supports: photo.tier === 'secondary' ? (photo.approximate ? 'Approximate image, Wikimedia Commons' : 'Illustrative photo, Wikimedia Commons') : 'Recipe photo, Wikimedia Commons',
    license: photo.license || '', address: plainAddress(photo.page), external: false }
}

// -> { id, name, supports, url|null, license, checked, external } or null (not shown).
export function getSource(id) {
  const s = registry.get(id)
  if (!s) return null
  if (s.external) {
    if (s.status !== 'verified' || !isLinkable(s.url)) return null
    return { id, name: s.name, supports: s.supports, url: s.url, license: s.license, checked: s.checked, external: true }
  }
  return { id, name: s.name, supports: s.supports, url: null, license: null, checked: null, external: false }
}

// Origin for a catalog recipe (verified dish page) or AI label.
export function originFor(recipe) {
  if (recipe?.ai) return { label: 'AI-generated on this device', source: null }
  if (recipe?.dataset) return { label: `Recipe from ${recipe.dataset.name} · ${recipe.dataset.license}`, source: datasetCredit(recipe) }
  const o = origins.recipes?.[recipe?.slug]
  if (o && o.status === 'verified' && isLinkable(o.url)) {
    const text = o.label === 'catalog' ? `Catalog recipe from ${o.sourceName}` : `Inspired by ${o.sourceName}`
    return { label: text, source: { id: `origin-${recipe.slug}`, name: o.sourceName, supports: 'Dish background', url: o.url, license: o.license, checked: o.checked, external: true } }
  }
  return { label: null, source: null }
}

// Numbered source list for a page: add(id) -> number (1-based) or null if it can't be shown.
export function sourceList() {
  const list = []
  const index = new Map()
  return {
    add(idOrSource) {
      const s = typeof idOrSource === 'string' ? getSource(idOrSource) : idOrSource
      if (!s) return null
      const key = s.url || s.id
      if (!index.has(key)) { list.push(s); index.set(key, list.length) }
      return index.get(key)
    },
    list,
  }
}

// Periodic link check (gap 14): HEAD each external link; hide ones that fail.
export async function checkLinks(urls, fetchImpl = fetch) {
  const bad = []
  for (const url of urls) {
    try {
      const r = await fetchImpl(url, { method: 'HEAD', mode: 'no-cors' })
      if (r.type !== 'opaque' && !r.ok) bad.push(url)
    } catch { bad.push(url) }
  }
  bad.forEach(markBroken)
  return bad
}
