// SousChef data layer: everything lives on this device (IndexedDB via
// lib/deviceStore.js). No account, no server, no Supabase.
//
// The exported `api` keeps the same function names the screens already use,
// so the UI didn't have to change. Matching, receipt parsing and OCR run in
// the browser (see ./lib).
import { rankRecipes } from './lib/match.js'
import { toBase, canonicalOf, categoryOf, shelfLifeDays } from './lib/normalize.js'
import { parseReceiptText } from './lib/receiptParser.js'
import { parseEmailReceipt } from './lib/emailParser.js'
import { ocrImageDetailed } from './lib/ocr.js'
import { localCatalog } from './lib/localCatalog.js'
import { metaFor } from './lib/recipeMeta.js'
import { applyStaples, catalogStaples } from './lib/staples.js'
import { read, write, nextId } from './lib/deviceStore.js'
import { notifyCart } from './lib/cartStore.js'
import { loadDataset, datasetLoaded, datasetSteps, datasetTemps, DATASET_META, MIN_MATCH, MAX_SHOWN } from './lib/dataset.js'
import { canonicalFor } from './lib/ingredientName.js'
import { CATALOG_CUISINE } from './lib/guardrails/filter.js'

const today = () => new Date().toISOString().slice(0, 10)

// ── Catalog: the 16 bundled recipes ─────────────────────────────────────────
// On-device AI is off in this app (lib/features.js), so AI recipes saved by an
// earlier build are not part of the catalog.
export function fullCatalog() {
  return localCatalog()
}

// Catalog + the open recipe dataset (when loaded). Used for suggestions,
// recipe pages and cooking; NOT for pantry warnings, which stay tied to the
// bundled catalog so thousands of recipes don't change "meals left".
export function catalogWithDataset() {
  const base = fullCatalog()
  const ds = datasetLoaded()
  if (!ds) return base
  const byRecipe = new Map(base.byRecipe)
  for (const [id, ings] of ds.byRecipe) byRecipe.set(id, ings)
  return { recipes: [...base.recipes, ...ds.recipes], byRecipe }
}
const hasPantry = () => read('pantry').some(p => Number(p.quantity) > 0)
// Every recipe the app can show: bundled + the dataset's count (known without
// downloading it, from lib/data/datasetMeta.json).
export const recipeTotal = () => localCatalog().recipes.length + (datasetLoaded()?.recipes.length ?? DATASET_META.count)
// Dataset recipes compare names via canonicalFor (see lib/ingredientName.js).
const nameFor = (recipe, canonical) => (recipe?.dataset ? canonicalFor(canonical) || canonical : canonical)

// ── Pantry helpers ──────────────────────────────────────────────────────────
// Adds dishCount ("N Dishes"), daysLeft (estimated shelf life minus days since
// purchase), mealsLeft and a lowStock flag + reason.
//
// Running low when ANY of:
//   • out of stock (quantity 0),
//   • expiring within 3 days, or
//   • not enough left for 2 more servings of the hungriest recipe that uses it.
// Past its estimated shelf life -> pastShelfLife: "check before using" (the user
// can mark it OK; shelf life is only an estimate from the purchase date).
export const LOW_DAYS = 3
const LOW_MEALS = 2

export function decoratePantry(rows, byRecipe, recipes = [], now = Date.now()) {
  const servings = new Map(recipes.map(r => [r.id, r.servings || 1]))
  const dishes = new Map()
  const perServing = new Map()
  for (const [recipeId, ings] of byRecipe) {
    const s = servings.get(recipeId) || 1
    for (const c of new Set(ings.map(x => x.canonical))) dishes.set(c, (dishes.get(c) || 0) + 1)
    for (const ing of ings) {
      if (ing.staple) continue
      const need = toBase(ing.quantity / s, ing.unit)
      const cur = perServing.get(ing.canonical)
      if (!cur || (cur.base === need.base && need.amount > cur.amount)) perServing.set(ing.canonical, need)
    }
  }

  return rows.map(row => {
    const shelf = shelfLifeDays(row.canonical)
    let daysLeft = shelf
    let elapsed = 0
    if (row.purchased) {
      elapsed = Math.floor((now - new Date(row.purchased).getTime()) / 86400000)
      if (Number.isNaN(elapsed)) elapsed = 0
      daysLeft = Math.max(0, shelf - elapsed)
    }
    const pastShelfLife = !!row.purchased && elapsed > shelf && !row.checkOk
    const dishCount = dishes.get(row.canonical) || 0

    let mealsLeft = null
    const need = perServing.get(row.canonical)
    const stock = toBase(row.quantity, row.unit)
    if (need && need.amount > 0 && need.base === stock.base) mealsLeft = Math.floor(stock.amount / need.amount)

    // Warnings follow the QUANTITY: out, under a quarter of what was bought, or
    // not enough for 2 more meals. Shelf life is shown as information only.
    let lowReason = null
    const q = Number(row.quantity)
    const bought = Number(row.boughtQty) || 0
    if (q <= 0) lowReason = 'Out of stock'
    else if (bought > 0 && q <= bought * 0.25) lowReason = `Running low: ${Math.round((q / bought) * 100)}% left`
    else if (mealsLeft != null && mealsLeft < LOW_MEALS) lowReason = mealsLeft === 0 ? 'Not enough for a meal' : 'Enough for 1 meal'

    return { ...row, dishCount, daysLeft, shelfLife: shelf, mealsLeft, pastShelfLife, lowStock: !!lowReason, lowReason }
  })
}

const sameKey = (a, b) =>
  a.canonical === b.canonical && a.unit === b.unit && (a.brand || null) === (b.brand || null)

function mergePantry(items) {
  const pantry = read('pantry')
  let n = 0
  for (const it of items) {
    const canonical = it.canonical || canonicalOf(it.display)
    if (!canonical) continue
    const row = {
      canonical,
      display: String(it.display || canonical).slice(0, 80),
      category: it.category && it.category !== 'Other' ? it.category : (categoryOf(it.display) || 'Other'),
      quantity: Math.max(0, Number(it.quantity) || 1),
      unit: it.unit || 'unit',
      brand: it.brand ? String(it.brand).slice(0, 60) : null,
      purchased: it.purchased || today(),
      image: it.image || null,
    }
    const hit = pantry.find(p => sameKey(p, row))
    if (hit) { hit.quantity = Number(hit.quantity) + row.quantity; hit.boughtQty = hit.quantity; hit.purchased = row.purchased; hit.checkOk = false }
    else pantry.push({ id: nextId(), ...row, boughtQty: row.quantity })
    n++
  }
  write('pantry', pantry)
  return n
}

function addCart(items) {
  const cart = read('cart')
  let n = 0
  for (const it of items) {
    const canonical = it.canonical || canonicalOf(it.display)
    if (!canonical) continue
    const unit = it.unit || 'unit'
    const qty = Math.max(0, Number(it.quantity) || 1)
    const hit = cart.find(c => c.canonical === canonical && c.unit === unit)
    if (hit) hit.quantity = Number(hit.quantity) + qty
    else {
      cart.unshift({
        id: nextId(), canonical, display: String(it.display || canonical).slice(0, 80), quantity: qty, unit,
        category: it.category && it.category !== 'Other' ? it.category : (categoryOf(it.display) || 'Other'),
        source: it.source || null,
      })
    }
    n++
  }
  write('cart', cart)
  return n
}

const sortedPantry = () =>
  [...read('pantry')].sort((a, b) => a.category.localeCompare(b.category) || a.display.localeCompare(b.display))

// Deep links into delivery services (search links, not pre-filled carts).
function buildHandoff(items) {
  const first = encodeURIComponent(items[0]?.display || '')
  const all = encodeURIComponent(items.map(i => i.display).join(' '))
  return {
    itemCount: items.length,
    instacartApiConfigured: false,
    providers: [
      { id: 'instacart', name: 'Instacart', url: `https://www.instacart.com/store/s?k=${first}`, prefilled: false },
      { id: 'amazonfresh', name: 'Amazon Fresh', url: `https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo&k=${first}`, prefilled: false },
      { id: 'walmart', name: 'Walmart', url: `https://www.walmart.com/search?q=${all}`, prefilled: false },
    ],
  }
}

function shapeSuggestion(r) {
  const meta = metaFor(r.slug)
  return {
    id: r.id, slug: r.slug, name: r.name,
    img: r.ai ? (r.ai.photo?.thumb || null) : r.dataset ? null : (meta.image || r.image), imageCredit: r.ai || r.dataset ? null : meta.imageCredit,
    primary: r.primary || null, dataset: r.dataset || null, timeEstimated: !!r.timeEstimated, dishType: r.dishType || null,
    photo: r.ai?.photo || null,
    categories: r.ai ? (r.ai.categories || []) : r.dataset ? r.categories : (meta.categories || []), protein: r.ai ? r.ai.protein : r.dataset ? r.protein : meta.protein, proteinG: meta.proteinG, highProtein: !!r.highProtein,
    time: `${r.time_mins} mins`, time_mins: r.time_mins,
    kcal: r.kcal != null ? `${r.kcal} kcal` : null, kcalValue: r.kcal ?? null, servings: r.servings,
    match: r.match, matchColor: r.matchColor, haveAll: r.haveAll, relevant: r.relevant !== false, coreMissing: r.coreMissing || [],
    missing: r.missing, maxServings: r.maxServings, description: r.description,
    ai: r.ai || null, cuisine: r.ai?.cuisine || r.cuisine || meta.cuisine || CATALOG_CUISINE[r.slug] || null,
  }
}

const pantryRows = () => read('pantry')

// slug -> ingredients (with the user's staples applied), for filters and allergy checks.
export function ingredientsBySlug() {
  const { recipes, byRecipe } = catalogWithDataset()
  const b = applyStaples(byRecipe)
  return new Map(recipes.map(r => [r.slug, b.get(r.id) || []]))
}

export const api = {
  // ── suggestions & recipes ─────────────────────────────────────────────────
  // Bundled + saved recipes always; dataset recipes only once the pantry has
  // items, and only the ones close to it (the dataset loads on first use).
  async suggestions() {
    const base = fullCatalog()
    const ranked = rankRecipes(base.recipes, applyStaples(base.byRecipe), pantryRows())
    if (!hasPantry()) return ranked.map(shapeSuggestion)
    const ds = await loadDataset()
    if (!ds) return ranked.map(shapeSuggestion)
    // Pantry names reduced the same way as the dataset's (lib/ingredientName.js).
    const rows = pantryRows().map(p => ({ ...p, canonical: canonicalFor(p.canonical) || p.canonical }))
    const byRecipe = applyStaples(ds.byRecipe)
    // Real dishes first: at least 3 non-staple ingredients (skips sauces and
    // basics like "mayonnaise"), then ready-to-cook, closest match, fuller dish.
    const main = (r) => (byRecipe.get(r.id) || []).filter(i => !i.staple && !i.optional).length
    const near = rankRecipes(ds.recipes.filter(r => main(r) >= 3), byRecipe, rows)
      .filter(r => r.relevant && (r.haveAll || r.match >= MIN_MATCH))
      .sort((a, b) => (b.haveAll - a.haveAll) || (b.match - a.match) || (main(b) - main(a)))
      .slice(0, MAX_SHOWN)
    return [...ranked, ...near].map(shapeSuggestion)
  },

  // The full list for "Browse all": bundled + every dataset recipe, ranked by
  // the pantry (has-core-protein first). Loads the dataset on first use.
  async allRecipes() {
    const base = fullCatalog()
    const ds = await loadDataset()
    const rows = pantryRows()
    const out = rankRecipes(base.recipes, applyStaples(base.byRecipe), rows)
    // Full dishes (3+ non-staple ingredients) before sauces and basics.
    const mains = new Map()
    const count = (by) => { for (const [id, ings] of by) mains.set(id, ings.filter(i => !i.staple && !i.optional).length >= 3) }
    count(base.byRecipe)
    if (ds) count(ds.byRecipe)
    if (ds) {
      const dsRows = rows.map(p => ({ ...p, canonical: canonicalFor(p.canonical) || p.canonical }))
      out.push(...rankRecipes(ds.recipes, applyStaples(ds.byRecipe), dsRows))
    }
    // One ranking across both sources (same order rules as rankRecipes).
    out.sort((a, b) => (b.haveAll - a.haveAll) || (b.relevant - a.relevant) || (mains.get(b.id) - mains.get(a.id)) || (b.match - a.match) || (a.missing.length - b.missing.length) || (a.time_mins - b.time_mins))
    return out.map(shapeSuggestion)
  },

  async recipe(slug) {
    if (slug?.startsWith('wb-')) await loadDataset()
    const { recipes, byRecipe: base } = catalogWithDataset()
    const byRecipe = applyStaples(base)
    const recipe = recipes.find(r => r.slug === slug)
    if (!recipe) throw new Error('Recipe not found')
    const scored = rankRecipes([recipe], byRecipe, pantryRows().map(p => ({ ...p, canonical: nameFor(recipe, p.canonical) })))[0]
    const ingredients = (byRecipe.get(recipe.id) || []).map(ing => {
      const missing = scored.missing.find(m => m.canonical === ing.canonical)
      return {
        canonical: ing.canonical, display: ing.display, quantity: ing.quantity, unit: ing.unit,
        staple: !!ing.staple, have: ing.staple ? true : !missing, srcId: ing.srcId || null, brand: ing.brand || null,
      }
    })
    const ds = recipe.dataset ? byRecipe.get(recipe.id) || [] : null
    const steps = ds ? datasetSteps(recipe, ds) : (recipe.steps || [])
    return { ...shapeSuggestion(scored), steps, ingredients, ...(ds ? { temps: datasetTemps(ds) } : {}) }
  },

  // ── pantry ────────────────────────────────────────────────────────────────
  async pantry() { const { recipes, byRecipe } = fullCatalog(); return decoratePantry(sortedPantry(), applyStaples(byRecipe), recipes) },
  async staples() {
    const { recipes, byRecipe } = localCatalog()
    const rows = pantryRows()
    return catalogStaples(recipes, byRecipe).map(st => ({ ...st, tracked: rows.find(r => r.canonical === st.canonical) || null }))
  },
  async addPantry(item) { return mergePantry([item]) },
  async updatePantry(id, quantity) {
    const pantry = read('pantry')
    const row = pantry.find(p => p.id === id)
    if (row) { row.quantity = Math.max(0, Number(quantity) || 0); if (row.quantity > (Number(row.boughtQty) || 0)) row.boughtQty = row.quantity; write('pantry', pantry) }
  },
  // "This is still good": override the estimated shelf life for one item.
  async markPantryChecked(id) {
    const pantry = read('pantry')
    const row = pantry.find(p => p.id === id)
    if (row) { row.checkOk = true; write('pantry', pantry) }
  },
  async deletePantry(id) { write('pantry', read('pantry').filter(p => p.id !== id)) },
  async commit(items) { return { committed: mergePantry(items) } },

  // ── ingestion (parsing runs in the browser) ───────────────────────────────
  async scanReceipt(file, onProgress) {
    const { text, confidence, lines } = await ocrImageDetailed(file, onProgress)
    const { date, items } = parseReceiptText(text)
    return { receiptId: null, source: 'photo', date, rawText: text, items, lines, confidence }
  },
  async parseReceiptText(text) {
    const { date, items } = parseReceiptText(text)
    return { receiptId: null, source: 'text', date, rawText: text, items }
  },
  async parseEmail(text) {
    const { vendor, date, items } = parseEmailReceipt(text)
    return { receiptId: null, source: `email:${vendor}`, vendor, date, rawText: text, items }
  },

  // ── cooking (with pantry depletion) ───────────────────────────────────────
  async startCook(slug, servings) {
    const recipe = catalogWithDataset().recipes.find(r => r.slug === slug)
    if (!recipe) throw new Error('Recipe not found')
    const s = Number(servings) || recipe.servings || 1
    const sessionId = nextId()
    const sessions = read('sessions')
    sessions[sessionId] = { slug, servings: s, status: 'in_progress' }
    write('sessions', sessions)
    return { sessionId, recipeId: recipe.id, servings: s }
  },

  async completeCook(sessionId) {
    const sessions = read('sessions')
    const session = sessions[sessionId]
    if (!session) throw new Error('Cooking session not found')
    if (session.status === 'completed') return { alreadyCompleted: true }
    const { recipes, byRecipe } = catalogWithDataset()
    const recipe = recipes.find(r => r.slug === session.slug)
    if (!recipe) throw new Error('Recipe not found')
    const scale = session.servings / (recipe.servings || 1)
    const pantry = read('pantry')
    const depletion = []
    for (const ing of byRecipe.get(recipe.id) || []) {
      const need = toBase(ing.quantity * scale, ing.unit)
      if (need.amount <= 0) continue
      let remaining = need.amount
      const rows = pantry.filter(p => nameFor(recipe, p.canonical) === ing.canonical).sort((a, b) => b.quantity - a.quantity)
      for (const row of rows) {
        if (remaining <= 0) break
        const stock = toBase(row.quantity, row.unit)
        if (stock.base !== need.base) continue // never compare mass to volume
        const take = Math.min(stock.amount, remaining)
        const perUnit = toBase(1, row.unit).amount || 1
        row.quantity = Math.max(0, +((stock.amount - take) / perUnit).toFixed(3))
        depletion.push({ pantryId: row.id, canonical: ing.canonical, took: +(take / perUnit).toFixed(3), unit: row.unit })
        remaining -= take
      }
    }
    write('pantry', pantry)
    session.status = 'completed'
    write('sessions', sessions)
    return { completed: true, depletion }
  },

  // ── cart + grocery handoff ────────────────────────────────────────────────
  async cart() { return read('cart') },
  async addToCart(items) { const added = addCart(items); notifyCart(added); return { added, items: read('cart') } },
  async removeFromCart(id) { write('cart', read('cart').filter(c => c.id !== id)); notifyCart() },
  async clearCart() { write('cart', []); notifyCart() },
  async checkout() { return buildHandoff(read('cart')) },
}
