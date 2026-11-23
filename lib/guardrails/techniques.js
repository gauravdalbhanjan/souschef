// Allowed time ranges per technique (minutes) and default doneness cues.
// These are SousChef app rules (source id "app-rules"), not sourced facts.
export const TECHNIQUES = {
  prep:      { min: 1, max: 20, cue: 'Everything is chopped, measured and ready.' },
  mix:       { min: 1, max: 10, cue: 'No dry streaks remain.' },
  whisk:     { min: 1, max: 5, cue: 'Smooth, with no lumps.' },
  marinate:  { min: 15, max: 240, cue: 'Keep it covered in the fridge the whole time.', risky: 'marinate' },
  saute:     { min: 2, max: 12, cue: 'Soft and lightly golden at the edges.' },
  sear:      { min: 2, max: 8, cue: 'A deep brown crust has formed.' },
  'stir-fry': { min: 2, max: 10, cue: 'Hot all the way through and lightly charred.' },
  'pan-fry': { min: 3, max: 15, cue: 'Golden on both sides and cooked through.' },
  fry:       { min: 3, max: 15, cue: 'Golden and crisp, cooked through.' },
  griddle:   { min: 2, max: 10, cue: 'Golden underneath with bubbles set on top.' },
  boil:      { min: 2, max: 45, cue: 'Tender all the way through.' },
  simmer:    { min: 5, max: 90, cue: 'Thickened and tender.' },
  steam:     { min: 3, max: 30, cue: 'Tender when pierced with a knife.' },
  poach:     { min: 3, max: 25, cue: 'Opaque and cooked through.' },
  scramble:  { min: 2, max: 8, cue: 'Set with no liquid egg left.' },
  roast:     { min: 10, max: 120, cue: 'Browned outside and cooked through.' },
  bake:      { min: 8, max: 90, cue: 'Golden, and a skewer comes out clean where it applies.' },
  grill:     { min: 3, max: 30, cue: 'Charred marks and cooked through.' },
  broil:     { min: 2, max: 15, cue: 'Browned and bubbling on top.' },
  toast:     { min: 1, max: 6, cue: 'Golden and fragrant.' },
  rest:      { min: 2, max: 30, cue: 'Juices have settled.' },
  chill:     { min: 30, max: 480, cue: 'Cold all the way through; keep it in the fridge.', risky: 'chill' },
  assemble:  { min: 1, max: 15, cue: 'Plated and ready to serve.' },
}
export const TECHNIQUE_IDS = Object.keys(TECHNIQUES)

// [lo, hi] clamped to the technique's range; always lo <= hi.
export function clampTime(technique, range) {
  const t = TECHNIQUES[technique] || TECHNIQUES.prep
  let [lo, hi] = Array.isArray(range) ? range.map(Number) : [t.min, t.min]
  if (!Number.isFinite(lo)) lo = t.min
  if (!Number.isFinite(hi)) hi = lo
  lo = Math.min(Math.max(Math.round(lo), t.min), t.max)
  hi = Math.min(Math.max(Math.round(hi), lo), t.max)
  return [lo, hi]
}

export const cueFor = (technique, cue) => {
  const c = String(cue || '').replace(/\d+/g, '').replace(/\s{2,}/g, ' ').trim()
  return c.length >= 6 && c.length <= 120 ? c : (TECHNIQUES[technique] || TECHNIQUES.prep).cue
}
