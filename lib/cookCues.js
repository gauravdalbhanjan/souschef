// Deterministic visual cues for ingredients and cooking steps (no AI, no
// network). Pure functions: text + recipe data in, icon keys + labels out.
// components/CueIcon.jsx maps each key to a bundled MUI icon.
//
//   ingredientIcon(ing)          -> { key, label }   e.g. { key: 'seafood', label: 'Fish & seafood' }
//   stepCues(step, ingredients)  -> { actions, tools, states, uses }
//     actions  what to do        (cut, mix, add, heat, boil, fry, bake, grill, season, drain, knead, chill, rest, blend, serve)
//     tools    what to use       (pan, pot, oven, bowl, blender, grill, thermometer)
//     states   what to watch     (heat level, timer, doneness, internal temperature)
//     uses     ingredients this step needs (from the step's data, else matched by name)
// Order follows the text, so the first icon is the first thing to do.
import { categoryOf } from './normalize.js'

const words = (s) => String(s || '').toLowerCase()

// ── ingredients ─────────────────────────────────────────────────────────────
const ING_RULES = [
  ['egg', 'Egg', /\beggs?\b|\byolks?\b|egg whites?/],
  ['seafood', 'Fish & seafood', /\b(salmon|tuna|cod|tilapia|halibut|trout|fish|shrimp|prawns?|crab|lobster|scallops?|mussels?|clams?|oysters?|squid|octopus|anchov\w*|sardines?)\b/],
  ['poultry', 'Poultry', /\b(chicken|turkey|duck|hen)\b/],
  ['meat', 'Meat', /\b(beef|steak|veal|pork|ham|bacon|sausages?|lamb|mutton|goat|venison|mince|chorizo|salami)\b/],
  ['legume', 'Beans, lentils & tofu', /\b(beans?|lentils?|chickpeas?|garbanzo|tofu|tempeh|peas|dal|dhal|edamame)\b/],
  ['oil', 'Oil & fat', /\b(oil|ghee|lard|shortening|margarine)\b/],
  ['sauce', 'Sauce & condiment', /\b(sauce|vinegar|mustard|ketchup|mayonnaise|mayo|paste|salsa|worcestershire|dressing|relish|chutney|pesto)\b/],
  ['dairy', 'Dairy', /\b(milk|cream|cheese|parmesan|mozzarella|cheddar|feta|paneer|butter|yogurt|yoghurt|curd|buttermilk)\b/],
  ['pasta', 'Pasta & noodles', /\b(pasta|spaghetti|penne|macaroni|noodles?|linguine|fettuccine|lasagna)\b/],
  ['grain', 'Rice & grains', /\b(rice|oats|oatmeal|quinoa|barley|couscous|bulgur|polenta|cornmeal|semolina)\b/],
  ['bread', 'Bread & baking', /\b(bread|flour|tortillas?|baguette|buns?|pita|naan|breadcrumbs?|yeast|baking powder|baking soda|croutons?|dough)\b/],
  ['sweet', 'Sweetener', /\b(sugar|honey|syrup|molasses|chocolate|cocoa|vanilla|jam|caramel)\b/],
  ['liquid', 'Liquid', /\b(water|stock|broth|wine|juice|beer|coconut milk|coffee|tea)\b/],
  ['nut', 'Nuts & seeds', /\b(almonds?|walnuts?|pecans?|cashews?|peanuts?|pistachios?|hazelnuts?|sesame|seeds?|pine nuts?)\b/],
  ['herb', 'Fresh herb', /\b(basil|cilantro|coriander leaves|parsley|mint|dill|thyme|rosemary|oregano|sage|chives|tarragon|bay lea(f|ves))\b/],
  ['spice', 'Spice & seasoning', /\b(salt|pepper(corns?)?|cumin|paprika|turmeric|cinnamon|nutmeg|cloves?|cardamom|garam masala|curry powder|chili powder|cayenne|allspice|spice|seasoning|ginger powder|garlic powder)\b/],
  ['fruit', 'Fruit', /\b(apples?|bananas?|lemons?|limes?|oranges?|berries|strawberr\w+|blueberr\w+|raspberr\w+|grapes?|mangoes?|mango|pineapple|peach(es)?|pears?|cherr\w+|raisins?|dates|coconut|avocados?)\b/],
  ['vegetable', 'Vegetable', /\b(onions?|garlic|tomato(es)?|potato(es)?|carrots?|celery|spinach|lettuce|cabbage|broccoli|cauliflower|peppers?|chil(i|e|li)s?|zucchini|courgette|eggplant|aubergine|mushrooms?|cucumbers?|corn|kale|leeks?|shallots?|scallions?|ginger|squash|pumpkin|beets?|radish(es)?|okra|asparagus|greens)\b/],
]
// "bell pepper" is a vegetable, "black pepper" a spice: specific phrases first.
const ING_FIRST = [
  ['vegetable', 'Vegetable', /\b(bell|sweet|green|red|yellow) peppers?\b|\bchil(i|e|li) peppers?\b|\bjalape\w+/],
  ['spice', 'Spice & seasoning', /\bblack pepper|white pepper|ground ginger|ginger powder|chili powder|chil(i|e) flakes/],
  ['oil', 'Oil & fat', /\bpeanut oil|sesame oil|olive oil|coconut oil/],
  ['liquid', 'Liquid', /\bcoconut milk|chicken (stock|broth)|beef (stock|broth)|vegetable (stock|broth)/],
]
const CATEGORY_FALLBACK = { Veggies: ['vegetable', 'Vegetable'], Fruits: ['fruit', 'Fruit'], Meat: ['meat', 'Meat'], Dairy: ['dairy', 'Dairy'], Staples: ['grain', 'Pantry staple'], Spices: ['spice', 'Spice & seasoning'] }

export function ingredientIcon(ing) {
  const t = words(`${ing?.display || ''} ${ing?.canonical || ''}`)
  for (const [key, label, re] of [...ING_FIRST, ...ING_RULES]) if (re.test(t)) return { key, label }
  const cat = CATEGORY_FALLBACK[categoryOf(ing?.display || ing?.canonical || '')]
  return cat ? { key: cat[0], label: cat[1] } : { key: 'ingredient', label: 'Ingredient' }
}

// ── steps ───────────────────────────────────────────────────────────────────
const ACTIONS = [
  ['cut', 'Cut / prep', /\b(chop|slic|dic(e|ing)|minc|cut|peel|grat|trim|julienn|halv|quarter|core|shred|zest)\w*/],
  ['blend', 'Blend', /\b(blend|pur[eé]e|process|liquidi[sz]e)\w*/],
  ['mix', 'Stir / mix', /\b(stir(?!-fry)|mix|whisk|beat|combin|fold|toss|whip|emulsif)\w*|\bcream (the )?(butter|together)/],
  ['add', 'Add', /\b(add|pour|place|put|sprinkle|top|layer|transfer|spoon|drizzle|arrange|fill|stuff|spread|coat|dip|dredge)\w*/],
  // "medium heat" is a heat level (a state), not an action.
  ['heat', 'Heat', /\b(preheat|warm|melt|bring)\w*|(?<!(low|medium|high)[- ]?)\bheat\w*/],
  ['boil', 'Boil / simmer', /\b(boil|simmer|poach|blanch|steam|braise|stew)\w*/],
  // "until browned" is a doneness cue, not an instruction to fry.
  ['fry', 'Fry / sauté', /\b(fry|fried|frying|saut[eé]|sear|stir-fr\w*|crisp)\w*|(?<!until (golden |lightly |well )?)\bbrown\w*/],
  ['bake', 'Bake / roast', /\b(bak(e|ed|ing)|roast|broil)\w*/],
  ['grill', 'Grill', /\b(grill|barbecue|bbq|char)\w*/],
  // "seasoned beef" describes the food; only the verb counts.
  ['season', 'Season', /\b(season(?!ed)|salt(?! water)|taste and adjust)\w*/],
  ['cook', 'Cook', /\bcook(?!ed|ing (oil|spray))\w*/],
  ['drain', 'Drain / rinse', /\b(drain|strain|rinse|wash|pat dry|squeeze out)\w*/],
  ['knead', 'Knead / shape', /\b(knead|shape|roll|press|form|flatten|pound)\w*/],
  ['chill', 'Chill', /\b(chill|refrigerat|freez|cool|marinat)\w*/],
  ['rest', 'Rest / wait', /\b(rest|let (it )?(stand|sit)|set aside|leave)\w*/],
  ['serve', 'Serve', /\b(serve|plate|garnish|enjoy)\w*/],
]
const TOOLS = [
  ['pan', 'Pan', /\b(pan|skillet|wok|frying pan|griddle)\b/],
  ['pot', 'Pot', /\b(pot|saucepan|stockpot|dutch oven|casserole)\b/],
  ['oven', 'Oven', /\b(oven|baking (dish|sheet|tray|pan)|roasting (tin|pan)|tray)\b/],
  ['bowl', 'Bowl', /\bbowls?\b/],
  ['blender', 'Blender', /\b(blender|food processor|processor)\b/],
  ['grill', 'Grill', /\b(grill|barbecue)\b/],
  ['thermometer', 'Thermometer', /\bthermometer\b/],
]
const firstIndex = (text, re) => { const m = re.exec(text); return m ? m.index : -1 }
function ordered(text, rules, max) {
  return rules.map(([key, label, re]) => ({ key, label, at: firstIndex(text, re) }))
    .filter(x => x.at >= 0).sort((a, b) => a.at - b.at).slice(0, max).map(({ key, label }) => ({ key, label }))
}
const HEAT_LEVEL = /\b(low|medium[- ]low|medium[- ]high|medium|high)\s+heat\b/i
// instructions: [{ text }] (app step shape). Lines starting "You'll need:" and
// "Safety:" are data the cues show as icons; the rest is the action text.
export function stepCues(step, ingredients = []) {
  const lines = (step?.instructions || []).map(i => String(i?.text ?? i ?? ''))
  const action = lines.filter(l => !/^You.ll need:|^Safety:/i.test(l)).join(' ')
  const t = words(`${step?.section || ''}. ${action}`)
  const actions = ordered(t, ACTIONS, 3)
  const tools = ordered(t, TOOLS, 2)
  const states = []
  const heat = action.match(HEAT_LEVEL)
  if (heat) states.push({ key: 'heat-level', label: `${heat[1][0].toUpperCase()}${heat[1].slice(1).toLowerCase()} heat` })
  if (step?.duration > 0) states.push({ key: 'timer', label: `${Math.round(step.duration / 60)} min` })
  const until = step?.tip?.match(/^Done when (.+?)\.?$/i)?.[1] || action.match(/\buntil ([^.;,]{3,40})/i)?.[1]
  if (until) states.push({ key: 'doneness', label: until.trim() })
  for (const l of lines.filter(x => /^Safety:/i.test(x))) {
    const f = l.match(/(\d{3})\s*°F/)
    const what = l.match(/^Safety: Cook (.+?) until/i)?.[1]
    if (f) states.push({ key: 'temp', label: `${what ? `${what[0].toUpperCase()}${what.slice(1)} ` : ''}${f[1]}°F`, detail: l.replace(/^Safety:\s*/i, '') })
  }
  // Ingredients: structured data when the step has it, else by name in the text.
  const uses = Array.isArray(step?.uses) && step.uses.length
    ? step.uses
    : ingredients.filter(ing => {
        const name = words(ing.display).replace(/[^a-z ]/g, ' ').trim()
        const last = name.split(/\s+/).pop()
        return last && last.length > 2 && new RegExp(`\\b${last.replace(/s$/, '')}(e?s)?\\b`).test(t)
      })
  return { actions, tools, states, uses }
}

// Short nutrition line for one ingredient (lib/guardrails/nutrition.js result).
const g1 = (v) => (v > 0 && v < 1 ? v.toFixed(1) : String(Math.round(v)))
export function nutritionLine(n) {
  if (!n) return { text: '', full: '' }
  if (n.status === 'ok') {
    // Compact so it fits one line: P protein · C carbs · F fat (legend on the list).
    const text = `${Math.round(n.kcal)} kcal · P ${g1(n.protein_g)} g · C ${g1(n.carbs_g)} g · F ${g1(n.fat_g)} g`
    return { text, full: `About ${Math.round(n.kcal)} calories, ${g1(n.protein_g)} g protein, ${g1(n.carbs_g)} g carbs, ${g1(n.fat_g)} g fat for this amount (estimate)`, kcal: Math.round(n.kcal) }
  }
  if (n.status === 'none') return { text: '~0 kcal', full: 'About 0 calories at this amount' }
  if (n.status === 'no-weight') return { text: 'Nutrition: amount can\u2019t be weighed', full: 'No estimate: this amount can\u2019t be converted to grams' }
  return { text: 'Nutrition: no USDA data', full: 'No estimate: this ingredient isn\u2019t in the nutrition table' }
}
