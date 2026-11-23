// Fixed safety text written by us (never by the model), each tied to a source.
// Numbers come from lib/guardrails/sources.json facts.
import sources from './sources.json'

const fda = sources.sources.find(s => s.id === 'fda-safe-handling').facts

export const KITCHEN_SAFETY = [
  { id: 'wash', text: `Wash your hands with soap and water for at least ${fda.handwash_s} seconds before cooking and after touching raw meat, poultry, seafood or eggs.`, source: 'fda-safe-handling' },
  { id: 'separate', text: 'Use a separate cutting board and plate for raw meat, poultry and seafood, and keep them away from ready-to-eat food.', source: 'fda-safe-handling' },
  { id: 'chill', text: `Refrigerate leftovers within ${fda.refrigerate_within_h} hours (${fda.refrigerate_within_h_above_90f} hour if it\u2019s above 90\u00b0F). Keep your fridge at ${fda.fridge_max_f}\u00b0F or below.`, source: 'fda-safe-handling' },
  { id: 'reheat', text: `Reheat leftovers to ${fda.leftovers_f}\u00b0F.`, source: 'fda-safe-handling' },
]

// Risky-but-allowed methods: warning + calendar reminder, code-set durations.
export const RISKY = {
  marinate: { title: 'Marinate in the fridge', warning: 'Marinate in the fridge, never on the counter. Don\u2019t reuse raw marinade unless you boil it first.', source: 'fda-safe-handling', reminderMin: 60 },
  chill: { title: 'Chill in the fridge', warning: `Keep it in the fridge at ${fda.fridge_max_f}\u00b0F or below until it\u2019s cold all the way through.`, source: 'fda-safe-handling', reminderMin: 120 },
  'rest-dough': { title: 'Rest the dough', warning: 'Don\u2019t taste raw dough or batter.', source: 'fda-raw-flour', reminderMin: 60 },
  leftovers: { title: 'Put leftovers away', warning: `Refrigerate leftovers within ${fda.refrigerate_within_h} hours.`, source: 'fda-safe-handling', reminderMin: fda.refrigerate_within_h * 60 },
}

// Fixed templates (written by us, not model-generated). No numbers are shown
// that we couldn't source; the template links the tested-method source.
export const TEMPLATES = {
  'quick-pickle': {
    name: 'Fridge quick pickles',
    note: 'A fridge pickle, not a canned one: it must stay in the fridge.',
    steps: ['Slice clean, fresh vegetables and pack them into a clean jar.', 'Pour a hot vinegar brine over them so they\u2019re covered.', 'Cool, close the jar and keep it in the fridge.'],
    source: 'nchfp',
  },
  yogurt: {
    name: 'Homemade yogurt',
    note: 'Follow a tested method for temperatures and times.',
    steps: ['Heat milk, then cool it to a warm temperature.', 'Stir in a spoonful of plain yogurt with live cultures.', 'Keep it warm until set, then refrigerate.'],
    source: 'nchfp',
  },
  'sourdough-starter': {
    name: 'Sourdough starter',
    note: 'Don\u2019t taste raw starter or dough. Bake fully.',
    steps: ['Mix flour and water in a clean jar.', 'Feed it with fresh flour and water each day.', 'Use it once it rises and bubbles; bake bread fully.'],
    source: 'nchfp',
  },
}
