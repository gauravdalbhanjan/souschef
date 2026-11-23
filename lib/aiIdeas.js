// Tiered AI recipes, so nothing waits on a full recipe:
//   Tier 1  dish names: one short model request lists dishes from the pantry,
//           streamed line by line, so tiles appear within seconds. Photos are
//           fetched per tile right away (network, not the model).
//   Tier 2  the full recipe (ingredients, steps; nutrition and safety added
//           by code) is written when the user opens a tile.
//   Tier 3  while idle, the model writes full recipes for the next tiles in
//           the background, so later taps open at once. A tap always goes first.
// The model only writes names here; code checks every name (blocked methods,
// harmful text, allergies, pantry items) before it becomes a tile.
import { useSyncExternalStore } from 'react'
import { generate, generationAllowed, aiReady } from './llm.js'
import { aiRecipe } from './aiTasks.js'
import { outputViolations } from './guardrails/policy.js'
import { CUISINES } from './guardrails/plausibility.js'
import { allergyCheck } from './guardrails/allergens.js'
import { read, write } from './deviceStore.js'
import { findPhoto } from './images.js'
import { saveAiRecipe, savedAiRecipes } from './aiRecipes.js'

export const IDEA_COUNT = 12
// One detailed recipe on a small laptop/phone GPU: 2-4 min (~3 tokens/s).
export const RECIPE_TIMEOUT_MS = 240000
const IDEA_TIMEOUT_MS = 150000

// ── store (device only) ─────────────────────────────────────────────────────
const listeners = new Set()
const emit = () => listeners.forEach(l => l())
let snapshot = null
const ideas = () => (snapshot ??= read('aiIdeas'))
const saveIdeas = (list) => { snapshot = list; write('aiIdeas', list); emit() }
export const useIdeas = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, ideas, ideas)
export const isIdeaSlug = (slug) => String(slug || '').startsWith('idea-')
export const getIdea = (slug) => ideas().find(i => i.slug === slug) || null

// ── tier 1: names ───────────────────────────────────────────────────────────
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const words = (s) => String(s).toLowerCase().match(/[a-z]+/g) || []

// "Chicken Fried Rice | Asian | chicken breast, rice, egg" -> idea | null
export function parseIdeaLine(line, pantry, { allergies = [], taken = new Set() } = {}) {
  const parts = String(line).replace(/^\s*(\d+[.)]|[-*•])\s*/, '').split('|').map(s => s.replace(/[*_`#"]/g, '').trim())
  if (parts.length < 3) return null
  const [title, rawCuisine, rawUses] = parts
  if (title.length < 3 || title.length > 60 || !/^[\p{L}][\p{L}0-9 '&,-]*$/u.test(title)) return null
  if (outputViolations(title).length || outputViolations(rawUses).length) return null
  const cuisine = CUISINES.find(c => c.toLowerCase() === rawCuisine.toLowerCase())
  if (!cuisine) return null
  // Uses must be real pantry items (matched by code, not trusted from the model).
  const uses = []
  for (const u of rawUses.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
    const w = words(u)
    const p = pantry.find(p => { const pw = words(p.display); return w.length && w.every(x => pw.includes(x) || pw.some(y => y.startsWith(x) || x.startsWith(y))) })
    if (p && !uses.includes(p)) uses.push(p)
  }
  if (!uses.length) return null
  if (!allergyCheck(uses.map(p => ({ canonical: p.canonical, display: p.display })), allergies).show) return null
  const slug = `idea-${slugify(title)}`
  if (taken.has(slug) || taken.has(title.toLowerCase())) return null
  return { slug, name: title, cuisine, uses: uses.map(p => p.display), canonicals: uses.map(p => p.canonical), photo: null, at: Date.now() }
}

export const pantrySignature = (pantry) =>
  (pantry || []).filter(p => Number(p.quantity) > 0 && !p.pastShelfLife).map(p => p.canonical).sort().join('|')

const usable = (pantry) => (pantry || []).filter(p => Number(p.quantity) > 0 && !p.pastShelfLife)

let running = false
let feedState = { running: false, phase: null, made: 0, target: IDEA_COUNT, prepared: 0 }
const feedListeners = new Set()
const setFeed = (p) => { feedState = { ...feedState, ...p }; feedListeners.forEach(l => l()) }
export const useIdeaFeed = () => useSyncExternalStore((l) => { feedListeners.add(l); return () => feedListeners.delete(l) }, () => feedState, () => feedState)
let stopRequested = false
export function stopIdeaFeed() { stopRequested = true; setFeed({ running: false, phase: null }) }

// Lists dish names for this pantry and keeps the ones that pass the checks.
export async function suggestIdeas({ pantry, allergies = [], sig, onIdea }) {
  const have = usable(pantry)
  if (!have.length || !generationAllowed()) return 0
  const existing = ideas().filter(i => i.sig === sig)
  const taken = new Set([...existing.map(i => i.slug), ...savedAiRecipes().map(r => (r.name || '').toLowerCase())])
  const want = Math.max(0, IDEA_COUNT - existing.length)
  if (!want) return 0
  const list = have.slice(0, 20).map(p => p.display.toLowerCase())
  const messages = [{ role: 'user', content: [
    `List ${want} different fully cooked dishes I can make with my pantry. Mix American, Indian, Mexican and Asian dishes.`,
    'Write one dish per line in exactly this format, nothing else:',
    'Dish name | cuisine | pantry items used',
    'Example: Chicken Fried Rice | Asian | chicken breast, rice, eggs',
    `Pantry: ${list.join(', ')}.`,
    existing.length ? `Not these: ${existing.slice(0, 8).map(i => i.name).join('; ')}.` : '',
  ].filter(Boolean).join('\n') }]
  let made = 0, seen = 0
  const accept = (line) => {
    const idea = parseIdeaLine(line, have, { allergies, taken })
    if (!idea || made >= want) return
    idea.sig = sig
    taken.add(idea.slug)
    made++
    saveIdeas([...ideas().filter(i => i.slug !== idea.slug), idea])
    onIdea?.(idea)
    // Photo search runs on the network while the model keeps writing names.
    findPhoto({ cuisine: idea.cuisine, ingredients: [idea.name, ...idea.uses].slice(0, 3) }).then(photo => {
      if (photo) saveIdeas(ideas().map(i => (i.slug === idea.slug ? { ...i, photo } : i)))
    }).catch(() => {})
  }
  try {
    const out = await generate({
      messages, maxTokens: 30 * want, timeoutMs: IDEA_TIMEOUT_MS, background: true,
      onText: (text) => {
        const lines = text.split('\n')
        // Every line except the last one is complete.
        for (; seen < lines.length - 1; seen++) accept(lines[seen])
        if (stopRequested) throw new Error('cancelled')
      },
    })
    const lines = out.split('\n')
    for (; seen < lines.length; seen++) accept(lines[seen])
  } catch { /* keep whatever names already passed */ }
  return made
}

// ── tier 2: the full recipe for one tile ────────────────────────────────────
const inFlight = new Map() // idea slug -> Promise<result>
export function writeIdeaRecipe(slug, { pantry, staples, allergies = [], background = false, onText } = {}) {
  if (inFlight.has(slug)) return inFlight.get(slug)
  const idea = getIdea(slug)
  if (!idea) return Promise.resolve({ ok: false, errors: ['gone'] })
  const p = (async () => {
    const res = await aiRecipe({
      pantry, staples, kitchen: read('kitchen'), background, onText, timeoutMs: RECIPE_TIMEOUT_MS,
      filter: { cuisine: idea.cuisine, ...(allergies.length ? { allergens: allergies } : {}) },
      dish: { title: idea.name, uses: idea.uses },
    })
    if (!res.ok) {
      if (import.meta.env?.DEV) console.debug('[idea-recipe rejected]', res.errors?.slice(0, 4).join(' | '))
      if (!['preempted', 'cancelled', 'not-ready'].some(e => res.errors?.includes(e))) {
        saveIdeas(ideas().map(i => (i.slug === slug ? { ...i, fails: (i.fails || 0) + 1 } : i)))
      }
      return res
    }
    const r = res.recipe
    r.name = idea.name
    r.ai.pantrySig = idea.sig
    r.ai.photo = idea.photo || await findPhoto({ cuisine: idea.cuisine, ingredients: [idea.name, ...idea.uses].slice(0, 3) }).catch(() => null)
    saveAiRecipe(r)
    saveIdeas(ideas().filter(i => i.slug !== slug))
    return { ok: true, slug: r.slug }
  })().finally(() => inFlight.delete(slug))
  inFlight.set(slug, p)
  return p
}

// ── tiers 1 + 3 together, started when the model is ready ───────────────────
export async function startIdeaFeed({ pantry, staples, allergies = [], sig, onChange }) {
  if (running || !sig || !generationAllowed()) return false
  running = true; stopRequested = false
  try {
    // Ideas from an older pantry may use items that are gone now.
    saveIdeas(ideas().filter(i => i.sig === sig))
    setFeed({ running: true, phase: 'names', made: ideas().length, target: IDEA_COUNT, prepared: 0 })
    await suggestIdeas({ pantry, allergies, sig, onIdea: () => { setFeed({ made: ideas().length }); onChange?.() } })
    // Tier 3: quietly prepare full recipes, oldest tile first. No loader.
    setFeed({ running: false, phase: 'prepare' })
    for (let pass = 0; pass < IDEA_COUNT * 2 && !stopRequested && aiReady(); pass++) {
      const next = ideas().find(i => i.sig === sig && (i.fails || 0) < 2 && !inFlight.has(i.slug))
      if (!next) break
      const res = await writeIdeaRecipe(next.slug, { pantry, staples, allergies, background: true })
      if (res.ok) { setFeed({ prepared: feedState.prepared + 1 }); onChange?.() }
    }
  } finally {
    running = false
    setFeed({ running: false, phase: null })
  }
  return true
}
