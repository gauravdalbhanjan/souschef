// Cooking-flow helpers: find timed actions in a step's text, so the guide can
// offer one-tap timers and "Meanwhile…" cues during hands-off waits.
//   "Cover and simmer on **low** for **8 to 10 minutes**" -> Simmer, 8 min, passive
//   "Bake **45 to 50 minutes**"                           -> Bake, 45 min, passive
//   "Sear for **3 minutes** a side"                        -> Sear, 3 min, active

// Hands-off: the food is working, the cook is free.
const PASSIVE = ['simmer', 'soak', 'bake', 'roast', 'rest', 'marinate', 'boil', 'chill', 'steep', 'brew', 'rise', 'cool', 'stand', 'proof', 'braise', 'poach']
// Hands-on: worth a timer, but needs attention.
const ACTIVE = ['cook', 'fry', 'sear', 'toast', 'saute', 'sauté', 'grill', 'brown', 'microwave', 'caramelize', 'reduce']
const VERBS = [...PASSIVE, ...ACTIVE]
const VERB_RE = new RegExp(`\\b(${VERBS.join('|')})\\w*`, 'i')
// "8 minutes", "8 to 10 minutes", "45-50 min", "1 hour" (not "1 minute less").
// Skips adjustments like "minus 1 minute" / "1 minute less" (the real time
// usually follows in brackets: "(usually 10 minutes)").
const DUR_RE = /(?<!(?:minus|plus|extra|another)\s)(\d+(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b(?!\s+(?:less|more))/i
const MIN_TIMER_SECS = 60 // shorter than this, just do it

const unitSecs = (u) => (/^h/i.test(u) ? 3600 : /^s/i.test(u) ? 1 : 60)
const base = (word) => {
  const w = word.toLowerCase()
  return VERBS.find(v => w.startsWith(v)) || w
}

export function fmtDuration(secs) {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60)
    return m ? `${h} hr ${m} min` : `${h} hr`
  }
  if (secs >= 60) return `${Math.round(secs / 60)} min`
  return `${secs} sec`
}
export const clock = (s) => {
  const v = Math.max(0, Math.ceil(s))
  const h = Math.floor(v / 3600), m = Math.floor((v % 3600) / 60), sec = v % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

const plain = (ins) => (ins.parts ? ins.text : `${ins.text || ''}${ins.highlight || ''}${ins.after || ''}`)

// Timed actions in one step, in reading order. Uses the lower bound of a
// range ("8 to 10 minutes" -> 8) so the cook checks early, never late.
export function timersInStep(step, stepIdx) {
  const out = []
  ;(step.instructions || []).forEach((ins, li) => {
    const sentences = plain(ins).split(/(?<=[.!?])\s+/)
    sentences.forEach((s) => {
      const v = s.match(VERB_RE)
      if (!v) return
      const d = s.slice(v.index).match(DUR_RE)
      if (!d) return
      const secs = Math.round(parseFloat(d[1]) * unitSecs(d[3]))
      if (secs < MIN_TIMER_SECS) return
      const verb = base(v[1])
      out.push({
        id: `${stepIdx}:${li}:${out.length}`, verb, secs,
        label: verb.charAt(0).toUpperCase() + verb.slice(1),
        passive: PASSIVE.includes(verb),
      })
    })
  })
  return out
}

const third = (verb) => (/(s|sh|ch|x|z)$/.test(verb) ? `${verb}es` : `${verb}s`)
const firstSentence = (step) => {
  const t = step?.instructions?.[0] ? plain(step.instructions[0]) : ''
  return t.split(/(?<=[.!?])\s+/)[0] || ''
}

// "Meanwhile" cue for a step with a hands-off wait: point at the next step's
// first action, or suggest tidying up if it's the last step.
export function meanwhileFor(steps, idx) {
  const wait = timersInStep(steps[idx], idx).find(t => t.passive) // the first hands-off wait
  // A cue written for the recipe beats the generated one.
  if (steps[idx].meanwhile) return { wait, title: steps[idx].meanwhile, detail: '' }
  if (!wait) return null
  const next = steps[idx + 1]
  const lead = `While it ${third(wait.verb)} for ${fmtDuration(wait.secs)}`
  if (!next) return { wait, title: `${lead}, tidy up as you go.`, detail: 'Wash the bowls you\u2019re done with and set the table.' }
  return { wait, title: `${lead}, get a head start on step ${idx + 2}: ${next.section.toLowerCase()}.`, detail: firstSentence(next) }
}
