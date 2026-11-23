// Deterministic step clean-up for open-dataset recipes (no AI). Used by
// scripts/build-dataset.mjs; pure functions, unit-tested.
//   normalizeAbbrev  "1 tbs." -> "1 tbsp", "approx." -> "about", "350 F" -> "350°F"
//   splitSteps       multi-action blocks -> one action per step (short
//                    follow-ups like "Set aside." stay with their step)
//   stepQuality      flags stub / fragmented / action-less instructions
//   mapIngredients   which ingredients each step uses (by name words)
//   prepNote         "beef, sliced thinly" -> "sliced thinly"

const ABBREV = [
  [/\b(tbs|tbl|tblsp|tbsps?)\.?(?=\s|$|[,;)])/gi, 'tbsp'], [/\btbsp\./gi, 'tbsp'], [/\btsps?\./gi, 'tsp'],
  [/\b(\d+)\s*ozs?\.?(?=\s|$|[,;)])/gi, '$1 oz'], [/\b(\d+)\s*lbs?\.(?=\s|$|[,;)])/gi, '$1 lb'],
  [/\bapprox\.?(?=\s)/gi, 'about'], [/\be\.g\.,?/gi, 'for example'], [/\bi\.e\.,?/gi, 'that is'], [/\betc\./gi, 'and so on'],
  [/\b(\d+)\s*mins?\.?(?=\s|$|[,;)])/gi, '$1 minutes'], [/\b(\d+)\s*hrs?\.?(?=\s|$|[,;)])/gi, '$1 hours'], [/\b(\d+)\s*secs?\.?(?=\s|$|[,;)])/gi, '$1 seconds'],
  [/\bpkgs?\.?(?=\s)/gi, 'package'], [/\bqts?\.(?=\s)/gi, 'quart'], [/\bpts?\.(?=\s)/gi, 'pint'],
  [/\b(\d{2,3})\s*(?:°|º|degrees?|deg\.?)\s*F\b/gi, '$1°F'], [/\b(\d{2,3})\s*(?:°|º|degrees?|deg\.?)\s*C\b/gi, '$1°C'], [/\b(\d{3})\s*F\b/g, '$1°F'],
  [/\bapprox\b/gi, 'about'], [/\s+/g, ' '],
]
export const normalizeAbbrev = (s) => ABBREV.reduce((t, [re, to]) => t.replace(re, to), String(s || '')).trim()

const VERBS = 'add|adjust|allow|arrange|bake|baste|beat|blanch|blend|boil|braise|bring|broil|brown|brush|butter|chill|chop|coat|combine|cook|cool|core|cover|crack|cream|crumble|crush|cube|cut|debone|deglaze|dice|dip|discard|dissolve|divide|drain|dredge|drizzle|dust|empty|fill|flip|fold|form|freeze|fry|garnish|grate|grease|grill|grind|halve|heat|insert|julienne|knead|ladle|layer|leave|let|line|marinate|mash|measure|melt|microwave|mince|mix|moisten|oil|pat|peel|place|poach|pound|pour|preheat|prepare|press|puree|purée|put|quarter|refrigerate|reduce|remove|repeat|reserve|rest|return|rinse|roast|roll|rub|saute|sauté|scatter|scoop|score|scrape|sear|season|separate|serve|set|shake|shape|shred|sift|simmer|skewer|skim|slice|soak|spoon|spread|sprinkle|squeeze|steam|steep|stir|strain|stuff|taste|tear|thread|toast|top|toss|transfer|trim|turn|wash|warm|whip|whisk|wipe|wrap|cook|finish|keep|use|make|lower|raise|increase|check|test|wait|bring|break|sprinkle|spoon|sautee|stir-fry|deep-fry|pan-fry|fry|boil|heat|serve'
const VERB_RE = new RegExp(`\\b(${VERBS})(s|es|ed|ing)?\\b`, 'i')
export const hasAction = (s) => VERB_RE.test(String(s || ''))

// Splits at sentence ends. Abbreviations are normalized first so "tsp." or
// "approx." don't end a sentence. Sentences under 30 chars ("Set aside.")
// join the step before them.
export function splitSteps(steps) {
  const out = []
  for (const raw of steps || []) {
    const text = normalizeAbbrev(raw)
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z(])/).map(s => s.trim()).filter(Boolean)
    for (const s of sentences) {
      const last = out[out.length - 1]
      if (last && (s.length < 30 || !hasAction(s)) && last.from === raw) last.text = `${last.text} ${s}`
      else out.push({ text: s, from: raw })
    }
  }
  return out.map(o => o.text)
}

// -> { ok, reason }
export function stepQuality(steps) {
  const total = steps.join(' ').length
  if (steps.length < 2) return { ok: false, reason: 'too-few-steps' }
  if (total < 120) return { ok: false, reason: 'stub' }
  const action = steps.filter(hasAction).length / steps.length
  if (action < 0.6) return { ok: false, reason: 'action-less' }
  const tiny = steps.filter(s => s.length < 18).length / steps.length
  if (tiny > 0.4) return { ok: false, reason: 'fragmented' }
  if (/\b(see (above|below)|recipe (above|below)|as directed|follow (the )?package)\b/i.test(steps.join(' ')) && steps.length < 3) return { ok: false, reason: 'refers-elsewhere' }
  return { ok: true, reason: null }
}

// ── which step uses which ingredient ────────────────────────────────────────
const STOP = new Set(['fresh', 'large', 'small', 'medium', 'ripe', 'whole', 'chopped', 'minced', 'sliced', 'diced', 'ground', 'dried', 'cooked', 'plain', 'light', 'dark', 'extra', 'virgin', 'the', 'and', 'with', 'for', 'red', 'green', 'white', 'yellow', 'black', 'sweet', 'hot', 'cold'])
const wordsOf = (s) => (String(s || '').toLowerCase().match(/[a-z]+/g) || [])
// Same food, different words.
const SYN = { chily: 'chili', chile: 'chili', chilli: 'chili', chillie: 'chili', coriander: 'cilantro', steak: 'beef', prawn: 'shrimp', aubergine: 'eggplant', courgette: 'zucchini', capsicum: 'pepper', scallion: 'onion' }
const stem = (w) => { const s = w.replace(/(ies)$/, 'y').replace(/(oes|ches|shes|sses|xes)$/, (m) => m.slice(0, -2)).replace(/([^s])s$/, '$1'); return SYN[s] || s }
// ingredients: [{ d (display), c (canonical), s (staple) }] -> [[idx...] per step]
export function mapIngredients(steps, ingredients) {
  const ing = ingredients.map((x, idx) => {
    const all = [...new Set([...wordsOf(x.d), ...wordsOf(x.c)])]
    const head = stem(wordsOf(x.d).pop() || wordsOf(x.c).pop() || '')
    const mods = all.filter(w => !STOP.has(w) && stem(w) !== head)
    return { idx, head, mods, all, staple: !!x.s }
  })
  const used = new Set()
  return steps.map(text => {
    const w = wordsOf(text).map(stem)
    const set = new Set(w)
    const hits = ing.filter(i => i.head && set.has(i.head))
    // Same head word ("pepper"): keep the ones whose modifier is named
    // ("bell"), else the staple one next to "salt", else the first listed.
    const byHead = new Map()
    for (const h of hits) byHead.set(h.head, [...(byHead.get(h.head) || []), h])
    const out = []
    for (const group of byHead.values()) {
      if (group.length === 1) { out.push(group[0].idx); continue }
      const named = group.filter(g => g.mods.some(m => set.has(stem(m))))
      if (named.length) { out.push(...named.map(g => g.idx)); continue }
      const staple = group.find(g => g.staple)
      out.push((set.has('salt') && staple ? staple : group[0]).idx)
    }
    // "the remaining ingredients" / "everything else": what no step used yet.
    if (/\b(remaining|rest of the|everything else|all (the )?(other )?ingredients)\b/i.test(text)) {
      for (const i of ing) if (!i.staple && !used.has(i.idx) && !out.includes(i.idx)) out.push(i.idx)
    }
    out.forEach(i => used.add(i))
    return [...new Set(out)].sort((a, b) => a - b)
  })
}

// "6 oz beef rib-eye steak, sliced thinly across the grain" -> "sliced thinly across the grain"
export function prepNote(line) {
  const m = String(line || '').match(/,\s*([^,]{3,60})$/)
  if (!m) return null
  const note = m[1].trim()
  return /\b(chopped|sliced|diced|minced|grated|peeled|crushed|cubed|shredded|julienned|halved|quartered|beaten|melted|softened|drained|rinsed|thawed|trimmed|cut|torn|seeded|cored|zested|juiced|mashed|toasted|at room temperature|finely|roughly|thinly)\b/i.test(note) ? note : null
}
