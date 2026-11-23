// One cuisine name per recipe, shared by scripts/build-dataset.mjs (picks it
// from Wikibooks categories / "Cuisine of …" links) and the app (filter menu,
// Ask Chef regions). Pure data + functions.

// Country / region page names -> cuisine.
const COUNTRY = {
  'the United States': 'American', 'United States': 'American', India: 'Indian', Italy: 'Italian', 'the United Kingdom': 'British', 'United Kingdom': 'British',
  England: 'British', Scotland: 'British', Wales: 'British', France: 'French', Mexico: 'Mexican', Austria: 'Austrian', 'the Philippines': 'Filipino',
  Japan: 'Japanese', Nigeria: 'Nigerian', Spain: 'Spanish', Indonesia: 'Indonesian', Albania: 'Albanian', China: 'Chinese', Pakistan: 'Pakistani',
  Algeria: 'Algerian', Australia: 'Australian', Greece: 'Greek', Germany: 'German', Vietnam: 'Vietnamese', Colombia: 'Colombian', Canada: 'Canadian',
  Bulgaria: 'Bulgarian', Turkey: 'Turkish', Ireland: 'Irish', Peru: 'Peruvian', 'New Zealand': 'New Zealand', 'Trinidad and Tobago': 'Caribbean',
  Poland: 'Polish', Korea: 'Korean', Romania: 'Romanian', Israel: 'Israeli', Venezuela: 'Venezuelan', Brazil: 'Brazilian', Thailand: 'Thai',
  Malaysia: 'Malaysian', Denmark: 'Danish', Russia: 'Russian', Norway: 'Norwegian', Sweden: 'Swedish', Finland: 'Finnish', Hungary: 'Hungarian',
  Jamaica: 'Caribbean', 'Puerto Rico': 'Caribbean', Cuba: 'Caribbean', 'the Mediterranean': 'Mediterranean', 'the Netherlands': 'Dutch',
  'South Africa': 'South African', Ukraine: 'Ukrainian', Iran: 'Persian', Lebanon: 'Lebanese', Ethiopia: 'Ethiopian', Nepal: 'Nepali',
  Portugal: 'Portuguese', 'Sri Lanka': 'Sri Lankan', Czechia: 'Czech', Serbia: 'Serbian', Argentina: 'Argentine', Chile: 'Chilean', Morocco: 'Moroccan',
  Egypt: 'Egyptian', Ghana: 'Ghanaian', Kenya: 'Kenyan', Bangladesh: 'Bangladeshi', Sylhet: 'Bangladeshi', Afghanistan: 'Afghan', Tibet: 'Tibetan',
  Tanzania: 'Tanzanian', Lithuania: 'Lithuanian', California: 'American', Ontario: 'Canadian', Gibraltar: 'British', Suriname: 'Caribbean',
}
// "<Adjective> recipes" categories -> cuisine (regional names fold into their country).
const ADJ = {
  'United States': 'American', American: 'American', Southwestern: 'American', Texas: 'American', Louisiana: 'American', Californian: 'American',
  Cajun: 'American', Creole: 'American', Hawaiian: 'American', 'Native American': 'Native American', 'Soul Food': 'American',
  English: 'British', Scottish: 'British', Welsh: 'British', British: 'British',
  Hausa: 'Nigerian', Yoruba: 'Nigerian', Igbo: 'Nigerian', 'National Nigerian': 'Nigerian', 'South Indian': 'Indian', Sindhi: 'Pakistani', Punjabi: 'Indian',
  Bengali: 'Indian', Gujarati: 'Indian', Goan: 'Indian', Tamil: 'Indian', Kerala: 'Indian',
}
const ADJ_SAME = ['Indian', 'Italian', 'French', 'Mexican', 'Japanese', 'Nigerian', 'Thai', 'Middle Eastern', 'Ethiopian', 'Indonesian', 'Austrian', 'Chinese',
  'Egyptian', 'Spanish', 'German', 'Filipino', 'Rwandan', 'Algerian', 'Greek', 'Liberian', 'Caribbean', 'Turkish', 'Canadian', 'Mediterranean', 'Zambian',
  'Pakistani', 'Albanian', 'Australian', 'Gambian', 'Vietnamese', 'Irish', 'Malaysian', 'Ugandan', 'Polish', 'Bulgarian', 'Libyan', 'South African', 'Russian',
  'Korean', 'Colombian', 'Peruvian', 'Romanian', 'Israeli', 'Venezuelan', 'Brazilian', 'Danish', 'Norwegian', 'Swedish', 'Finnish', 'Hungarian', 'Jamaican',
  'Lebanese', 'Persian', 'Iranian', 'Portuguese', 'Dutch', 'Moroccan', 'Tunisian', 'Ghanaian', 'Kenyan', 'Bangladeshi', 'Sri Lankan', 'Nepali', 'Nepalese',
  'Cuban', 'Ukrainian', 'Czech', 'Serbian', 'Croatian', 'Argentine', 'Chilean', 'Swiss', 'Belgian', 'Afghan', 'Tibetan', 'Tanzanian', 'Somali', 'Sudanese',
  'Senegalese', 'Cameroonian', 'Congolese', 'Taiwanese', 'Singaporean', 'Burmese', 'Cambodian', 'Lao', 'Mongolian', 'Georgian', 'Armenian', 'Syrian',
  'Iraqi', 'Jordanian', 'Palestinian', 'Yemeni', 'Saudi', 'Emirati', 'Icelandic', 'Estonian', 'Latvian', 'Lithuanian', 'Slovak', 'Slovenian', 'Bosnian',
  'Macedonian', 'Montenegrin', 'Maltese', 'Cypriot', 'Scandinavian', 'African', 'Asian', 'South Asian', 'European', 'Latin American', 'Puerto Rican', 'Trinidadian']
for (const a of ADJ_SAME) if (!ADJ[a]) ADJ[a] = a
const FOLD = { Jamaican: 'Caribbean', 'Puerto Rican': 'Caribbean', Trinidadian: 'Caribbean', Cuban: 'Caribbean', Iranian: 'Persian', Nepalese: 'Nepali', 'South Asian': 'Indian' }
// Broad labels lose to a specific country when both are present.
const GENERIC = new Set(['African', 'Asian', 'European', 'Middle Eastern', 'Mediterranean', 'Caribbean', 'Latin American', 'Scandinavian'])

// cats: ["Indian recipes", ...], cuisineLinks: ["India", ...] -> cuisine | null
export function pickCuisine(cats = [], cuisineLinks = []) {
  const votes = new Map()
  const vote = (c, w) => { if (c) { const k = FOLD[c] || c; votes.set(k, (votes.get(k) || 0) + w) } }
  for (const l of cuisineLinks) vote(COUNTRY[String(l).replace(/#.*$/, '').trim()], 2)
  for (const c of cats) { const m = String(c).match(/^(.+?) recipes$/); if (m) vote(ADJ[m[1].trim()], 1) }
  const ranked = [...votes.entries()].sort((a, b) => (GENERIC.has(a[0]) - GENERIC.has(b[0])) || (b[1] - a[1]) || a[0].localeCompare(b[0]))
  return ranked[0]?.[0] || null
}

// Region for Ask Chef / guardrail filters (American, Indian, Mexican, Asian).
const REGION = {
  American: 'American', 'Native American': 'American', Canadian: 'American',
  Indian: 'Indian', Pakistani: 'Indian', Bangladeshi: 'Indian', 'Sri Lankan': 'Indian', Nepali: 'Indian',
  Mexican: 'Mexican',
  Chinese: 'Asian', Japanese: 'Asian', Korean: 'Asian', Thai: 'Asian', Vietnamese: 'Asian', Filipino: 'Asian', Indonesian: 'Asian', Malaysian: 'Asian',
  Taiwanese: 'Asian', Singaporean: 'Asian', Burmese: 'Asian', Cambodian: 'Asian', Lao: 'Asian', Mongolian: 'Asian', Tibetan: 'Asian', Asian: 'Asian',
}
export const regionOf = (cuisine) => REGION[cuisine] || cuisine || null

// Menu options from the recipes on hand: [{ id, label, count }], most recipes first.
export function cuisineOptions(recipes) {
  const n = new Map()
  for (const r of recipes || []) if (r.cuisine) n.set(r.cuisine, (n.get(r.cuisine) || 0) + 1)
  return [...n.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0])).map(([id, count]) => ({ id, label: id, count }))
}
