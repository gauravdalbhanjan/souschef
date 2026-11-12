// SousChef data layer, backed directly by Supabase (Postgres + Auth + RLS).
//
// There is no custom server: every user-owned table has Row Level Security, so
// the browser can read/write only its own rows. The matching engine, receipt
// parsing and OCR run in the browser (see ./lib). The function names mirror the
// old REST client so the screens did not need to change.
import { supabase } from './supabaseClient'
import { rankRecipes } from './lib/match.js'
import { toBase, canonicalOf, categoryOf, shelfLifeDays } from './lib/normalize.js'
import { parseReceiptText } from './lib/receiptParser.js'
import { parseEmailReceipt } from './lib/emailParser.js'
import { ocrImage } from './lib/ocr.js'

function must({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

const today = () => new Date().toISOString().slice(0, 10)

// ── Catalog (shared, read-only, cached for the session) ─────────────────────
let catalogPromise = null
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const [r, i] = await Promise.all([
        supabase.from('recipes').select('*'),
        supabase.from('recipe_ingredients').select('*'),
      ])
      const recipes = must(r)
      const byRecipe = new Map()
      for (const ing of must(i)) {
        if (!byRecipe.has(ing.recipe_id)) byRecipe.set(ing.recipe_id, [])
        byRecipe.get(ing.recipe_id).push(ing)
      }
      if (!recipes.length) {
        throw new Error('Recipe catalog is empty. Run supabase/seed_recipes.sql in the Supabase SQL editor.')
      }
      return { recipes, byRecipe }
    })().catch(err => { catalogPromise = null; throw err })
  }
  return catalogPromise
}

// ── Pantry helpers ──────────────────────────────────────────────────────────
// Adds dishCount ("N Dishes"), daysLeft (shelf life minus days since purchase)
// and lowStock (expiring soon, or low quantity on a frequently used item).
function decoratePantry(rows, byRecipe) {
  const dishes = new Map()
  for (const ings of byRecipe.values()) {
    for (const c of new Set(ings.map(x => x.canonical))) dishes.set(c, (dishes.get(c) || 0) + 1)
  }
  const now = Date.now()
  return rows.map(row => {
    const shelf = shelfLifeDays(row.canonical)
    let daysLeft = shelf
    if (row.purchased) {
      const elapsed = Math.floor((now - new Date(row.purchased).getTime()) / 86400000)
      daysLeft = Math.max(0, shelf - (Number.isNaN(elapsed) ? 0 : elapsed))
    }
    const dishCount = dishes.get(row.canonical) || 0
    const lowStock = daysLeft <= 3 || (row.quantity <= 2 && dishCount >= 2)
    return { ...row, dishCount, daysLeft, shelfLife: shelf, lowStock }
  })
}

const sameKey = (a, b) =>
  a.canonical === b.canonical && a.unit === b.unit && (a.brand || null) === (b.brand || null)

async function listPantryRaw() {
  return must(await supabase.from('pantry').select('*').order('category').order('display'))
}

// Merge items into the pantry: add to an existing row for the same item, else insert.
async function commitPantry(items) {
  const batch = []
  for (const it of items) {
    const canonical = it.canonical || canonicalOf(it.display)
    if (!canonical) continue
    const category = it.category && it.category !== 'Other' ? it.category : (categoryOf(it.display) || 'Other')
    const row = {
      canonical,
      display: it.display || canonical,
      category,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'unit',
      brand: it.brand || null,
      purchased: it.purchased || today(),
      image: it.image || null,
    }
    const dup = batch.find(b => sameKey(b, row))
    if (dup) dup.quantity += row.quantity
    else batch.push(row)
  }
  if (!batch.length) return 0

  const existing = must(await supabase.from('pantry').select('*').in('canonical', batch.map(b => b.canonical)))
  const inserts = []
  const updates = []
  for (const row of batch) {
    const hit = existing.find(e => sameKey(e, row))
    if (hit) updates.push(supabase.from('pantry').update({ quantity: Number(hit.quantity) + row.quantity, purchased: row.purchased }).eq('id', hit.id))
    else inserts.push(row)
  }
  if (inserts.length) must(await supabase.from('pantry').insert(inserts))
  for (const res of await Promise.all(updates)) must(res)
  return batch.length
}

// Keep a copy of each parsed receipt. Best-effort: a logging failure must never
// block the user from reviewing what was scanned.
async function logReceipt(source, rawText, items) {
  const { data, error } = await supabase
    .from('receipts').insert({ source, raw_text: rawText, items }).select('id').single()
  if (error) { console.warn('receipt log skipped:', error.message); return null }
  return data.id
}

// ── Cart helpers ────────────────────────────────────────────────────────────
async function listCart() {
  return must(await supabase.from('cart').select('*').order('created_at', { ascending: false }))
}

async function addCart(items) {
  const rows = []
  for (const it of items) {
    const canonical = it.canonical || canonicalOf(it.display)
    if (!canonical) continue
    const row = {
      canonical,
      display: it.display || canonical,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'unit',
      category: it.category && it.category !== 'Other' ? it.category : (categoryOf(it.display) || 'Other'),
      source: it.source || null,
    }
    const dup = rows.find(r => r.canonical === row.canonical && r.unit === row.unit)
    if (dup) dup.quantity += row.quantity
    else rows.push(row)
  }
  if (!rows.length) return 0

  const existing = must(await supabase.from('cart').select('*').in('canonical', rows.map(r => r.canonical)))
  const inserts = []
  const updates = []
  for (const row of rows) {
    const hit = existing.find(e => e.canonical === row.canonical && e.unit === row.unit)
    if (hit) updates.push(supabase.from('cart').update({ quantity: Number(hit.quantity) + row.quantity }).eq('id', hit.id))
    else inserts.push(row)
  }
  if (inserts.length) must(await supabase.from('cart').insert(inserts))
  for (const res of await Promise.all(updates)) must(res)
  return rows.length
}

// Deep links into delivery services. A true "push my cart into Instacart" needs
// a partner API key (secret), which cannot live in the browser; see README.
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
  return {
    id: r.id, slug: r.slug, name: r.name, img: r.image,
    time: `${r.time_mins} mins`, time_mins: r.time_mins,
    kcal: `${r.kcal} kcal`, servings: r.servings,
    match: r.match, matchColor: r.matchColor, haveAll: r.haveAll,
    missing: r.missing, maxServings: r.maxServings, description: r.description,
  }
}

export const api = {
  // ── suggestions & recipes ─────────────────────────────────────────────────
  async suggestions() {
    const [{ recipes, byRecipe }, pantry] = await Promise.all([loadCatalog(), listPantryRaw()])
    return rankRecipes(recipes, byRecipe, pantry).map(shapeSuggestion)
  },

  async recipe(slug) {
    const [{ recipes, byRecipe }, pantry] = await Promise.all([loadCatalog(), listPantryRaw()])
    const recipe = recipes.find(r => r.slug === slug)
    if (!recipe) throw new Error('Recipe not found')
    const scored = rankRecipes([recipe], byRecipe, pantry)[0]
    const ingredients = (byRecipe.get(recipe.id) || []).map(ing => {
      const missing = scored.missing.find(m => m.canonical === ing.canonical)
      return {
        canonical: ing.canonical, display: ing.display, quantity: ing.quantity, unit: ing.unit,
        staple: !!ing.staple, have: ing.staple ? true : !missing,
      }
    })
    return {
      ...shapeSuggestion(scored),
      steps: recipe.steps || [],
      ingredients,
    }
  },

  // ── pantry ────────────────────────────────────────────────────────────────
  async pantry() {
    const [{ byRecipe }, rows] = await Promise.all([loadCatalog().catch(() => ({ byRecipe: new Map() })), listPantryRaw()])
    return decoratePantry(rows, byRecipe)
  },
  addPantry: (item) => commitPantry([item]),
  async updatePantry(id, quantity) { must(await supabase.from('pantry').update({ quantity: Number(quantity) }).eq('id', id)) },
  async deletePantry(id) { must(await supabase.from('pantry').delete().eq('id', id)) },
  async commit(items, receiptId) {
    const n = await commitPantry(items)
    if (receiptId) await supabase.from('receipts').update({ committed: true }).eq('id', receiptId)
    return { committed: n }
  },

  // ── ingestion (parsing runs in the browser) ───────────────────────────────
  async scanReceipt(file, onProgress) {
    const text = await ocrImage(file, onProgress)
    const { date, items } = parseReceiptText(text)
    const receiptId = await logReceipt('photo', text, items)
    return { receiptId, source: 'photo', date, rawText: text, items }
  },
  async parseReceiptText(text) {
    const { date, items } = parseReceiptText(text)
    const receiptId = await logReceipt('text', text, items)
    return { receiptId, source: 'text', date, items }
  },
  async parseEmail(text) {
    const { vendor, date, items } = parseEmailReceipt(text)
    const receiptId = await logReceipt(`email:${vendor}`, text, items)
    return { receiptId, source: `email:${vendor}`, vendor, date, items }
  },

  // ── cooking (with pantry depletion) ───────────────────────────────────────
  async startCook(slug, servings) {
    const { recipes } = await loadCatalog()
    const recipe = recipes.find(r => r.slug === slug)
    if (!recipe) throw new Error('Recipe not found')
    const s = Number(servings) || recipe.servings || 1
    const row = must(await supabase.from('cooking_sessions').insert({ recipe_id: recipe.id, servings: s }).select('id').single())
    return { sessionId: row.id, recipeId: recipe.id, servings: s }
  },

  // Subtract the recipe's scaled ingredient amounts from the pantry so the next
  // session's suggestions and "enough for N" reflect what is left.
  async completeCook(sessionId) {
    const session = must(await supabase.from('cooking_sessions').select('*').eq('id', sessionId).single())
    if (session.status === 'completed') return { alreadyCompleted: true }

    const { recipes, byRecipe } = await loadCatalog()
    const recipe = recipes.find(r => r.id === session.recipe_id)
    const ings = byRecipe.get(session.recipe_id) || []
    const pantry = await listPantryRaw()
    const scale = session.servings / (recipe.servings || 1)

    const depletion = []
    const newQty = new Map()
    for (const ing of ings) {
      const need = toBase(ing.quantity * scale, ing.unit)
      if (need.amount <= 0) continue
      const rows = pantry.filter(p => p.canonical === ing.canonical).sort((a, b) => b.quantity - a.quantity)
      let remaining = need.amount
      for (const row of rows) {
        if (remaining <= 0) break
        const stock = toBase(row.quantity, row.unit)
        if (stock.base !== need.base) continue // never compare mass to volume
        const take = Math.min(stock.amount, remaining)
        const perUnit = toBase(1, row.unit).amount || 1
        const qty = Math.max(0, +((stock.amount - take) / perUnit).toFixed(3))
        row.quantity = qty
        newQty.set(row.id, qty)
        depletion.push({ pantryId: row.id, canonical: ing.canonical, took: +(take / perUnit).toFixed(3), unit: row.unit })
        remaining -= take
      }
    }

    const results = await Promise.all([...newQty].map(([id, quantity]) => supabase.from('pantry').update({ quantity }).eq('id', id)))
    results.forEach(must)
    must(await supabase.from('cooking_sessions').update({ status: 'completed', completed_at: new Date().toISOString(), depletion }).eq('id', sessionId))
    return { completed: true, depletion }
  },

  // ── cart + grocery handoff ────────────────────────────────────────────────
  cart: listCart,
  async addToCart(items) {
    const added = await addCart(items)
    return { added, items: await listCart() }
  },
  async removeFromCart(id) { must(await supabase.from('cart').delete().eq('id', id)) },
  async clearCart() { must(await supabase.from('cart').delete().neq('id', -1)) },
  async checkout() { return buildHandoff(await listCart()) },
}
