// Detailed, step-by-step cooking instructions keyed by recipe slug.
// Each step: { section, duration(sec), instructions:[{text, highlight?, after?}],
// tip, youtubeQuery }. Instructions describe real technique — what to cut, how,
// what goes in when, and how much — not just an ingredient list.

export const STEPS = {
  'caesar-salad': [
    { section: 'Make the Dressing', duration: 180,
      instructions: [
        { text: 'In a bowl, add ', highlight: '2 tbsp mayonnaise', after: ', 1 tsp Dijon mustard and 1 tsp Worcestershire.' },
        { text: 'Grate ', highlight: '1 clove garlic', after: ' straight in, then squeeze in the juice of half a lemon.' },
        { text: 'Whisk hard for ~30 seconds until it turns pale and creamy, then stir in half the grated parmesan (about 20g).' },
      ],
      tip: 'Whisk vigorously to emulsify — if it looks watery, add a little more mayo and keep whisking.',
      youtubeQuery: 'caesar salad dressing from scratch' },
    { section: 'Prep the Romaine', duration: 240,
      instructions: [
        { text: 'Cut the base off ', highlight: '1 head romaine', after: ' and separate the leaves.' },
        { text: 'Stack a few leaves, then chop across into 2-inch (bite-size) ribbons.' },
        { text: 'Rinse under cold water and spin or pat completely dry — wet leaves won\u2019t hold dressing.' },
      ],
      tip: 'Dry the leaves twice. Any water left on them dilutes the dressing and it slides off.',
      youtubeQuery: 'how to cut romaine for caesar salad' },
    { section: 'Toss & Finish', duration: 120,
      instructions: [
        { text: 'Put the romaine in a large bowl. Pour over about two-thirds of the dressing.' },
        { text: 'Toss with tongs for 20\u201330 seconds until every leaf is lightly, evenly coated — add more dressing only if dry.' },
        { text: 'Scatter over ', highlight: '1 cup croutons', after: ', the remaining parmesan, and a heavy crack of black pepper. Serve immediately.' },
      ],
      tip: 'Add croutons at the very end so they stay crunchy, not soggy.',
      youtubeQuery: 'how to toss caesar salad' },
  ],

  'aglio-olio-spaghetti': [
    { section: 'Boil the Pasta', duration: 480,
      instructions: [
        { text: 'Bring a large pot of water to a rolling boil and salt it well (it should taste like the sea).' },
        { text: 'Add ', highlight: '200g spaghetti', after: ' and cook 1 minute short of the packet time, so it stays al dente.' },
        { text: 'Before draining, scoop out and reserve ', highlight: '1 cup pasta water', after: '.' },
      ],
      tip: 'The starchy pasta water is what makes the sauce glossy later — don\u2019t skip saving it.',
      youtubeQuery: 'how to boil spaghetti al dente' },
    { section: 'Infuse the Oil', duration: 240,
      instructions: [
        { text: 'Thinly slice ', highlight: '4 cloves garlic', after: ' and finely chop 1 chili (deseed for less heat).' },
        { text: 'In a cold pan add ', highlight: '3 tbsp olive oil', after: ', the garlic and chili, then turn heat to medium-low.' },
        { text: 'Cook gently 3\u20134 minutes, stirring, until the garlic is pale gold and fragrant — do not let it brown.' },
      ],
      tip: 'Start garlic in cold oil and go low — burnt garlic turns bitter in seconds.',
      youtubeQuery: 'garlic chili oil for aglio olio' },
    { section: 'Toss & Serve', duration: 120,
      instructions: [
        { text: 'Add the drained spaghetti to the pan with a splash (about 1/4 cup) of the reserved pasta water.' },
        { text: 'Toss over medium heat 1\u20132 minutes until the oil and water emulsify and cling to the strands.' },
        { text: 'Off the heat, stir through ', highlight: '30g parmesan', after: ' and a pinch of salt. Serve at once.' },
      ],
      tip: 'Keep it moving in the pan — the tossing is what turns oil + water into a silky sauce.',
      youtubeQuery: 'aglio e olio finishing technique' },
  ],

  'guacamole': [
    { section: 'Prep the Aromatics', duration: 180,
      instructions: [
        { text: 'Finely dice ', highlight: 'half an onion', after: ' and 1 chili (deseed for milder heat).' },
        { text: 'Chop a small handful of cilantro, stems and all.' },
        { text: 'Roll and cut ', highlight: '1 lime', after: ' in half, ready to juice.' },
      ],
      tip: 'Dice the onion small so no single bite is overpowering.',
      youtubeQuery: 'how to dice onion for guacamole' },
    { section: 'Mash the Avocado', duration: 180,
      instructions: [
        { text: 'Halve ', highlight: '2 avocados', after: ', remove the pits, and scoop the flesh into a bowl.' },
        { text: 'Mash with a fork to your liking — leave it a little chunky for texture.' },
        { text: 'Immediately squeeze in the juice of the lime to stop it browning.' },
      ],
      tip: 'Add the lime juice right after mashing — the acid keeps the guac green.',
      youtubeQuery: 'how to mash avocado guacamole' },
    { section: 'Combine & Season', duration: 120,
      instructions: [
        { text: 'Fold in the onion, chili and cilantro.' },
        { text: 'Add a good pinch of salt, then taste and adjust salt and lime.' },
        { text: 'Serve right away, or press cling film onto the surface to hold it.' },
      ],
      tip: 'Season, then taste — guacamole almost always needs a bit more salt and lime than you think.',
      youtubeQuery: 'guacamole seasoning tips' },
  ],

  'veggie-omelette': [
    { section: 'Prep & Beat', duration: 150,
      instructions: [
        { text: 'Finely dice ', highlight: 'half a bell pepper', after: ' and a quarter of an onion.' },
        { text: 'Crack ', highlight: '3 eggs', after: ' into a bowl, add a pinch of salt, and beat until fully combined.' },
      ],
      tip: 'Beat the eggs well — 20 seconds of whisking makes the omelette light.',
      youtubeQuery: 'how to beat eggs for omelette' },
    { section: 'Soften the Veg', duration: 180,
      instructions: [
        { text: 'Melt ', highlight: '1 tbsp butter', after: ' in a non-stick pan over medium heat.' },
        { text: 'Add the pepper and onion and cook 2\u20133 minutes until softened, then spread evenly.' },
      ],
      tip: 'Cook the veg first so it\u2019s tender — raw pepper in a 2-minute omelette stays crunchy.',
      youtubeQuery: 'sauteing peppers and onions' },
    { section: 'Cook & Fold', duration: 150,
      instructions: [
        { text: 'Pour the eggs over the veg. As they set, drag the edges to the centre and tilt the pan so raw egg runs under.' },
        { text: 'When almost set, scatter ', highlight: '30g cheese', after: ' over one half.' },
        { text: 'Fold the omelette over the cheese, cook 30 seconds more, and slide onto a plate.' },
      ],
      tip: 'Take it off while the top is just barely soft — it finishes cooking on the plate.',
      youtubeQuery: 'how to fold an omelette' },
  ],

  'garlic-butter-salmon': [
    { section: 'Prep the Fish', duration: 180,
      instructions: [
        { text: 'Pat ', highlight: '2 salmon fillets', after: ' completely dry and season both sides with salt and pepper.' },
        { text: 'Thinly slice ', highlight: '3 cloves garlic', after: ' and cut 1 lemon into wedges.' },
      ],
      tip: 'Drying the salmon is the secret to a crisp, golden sear.',
      youtubeQuery: 'how to prep salmon fillet' },
    { section: 'Sear Skin-Side Down', duration: 300,
      instructions: [
        { text: 'Heat a pan over medium-high. Add a little oil, then lay the salmon skin-side down.' },
        { text: 'Press gently for 10 seconds so it doesn\u2019t curl, and sear 4\u20135 minutes until the skin is crisp.' },
        { text: 'Flip and cook 2 more minutes.' },
      ],
      tip: 'Don\u2019t move the fillet while it sears — let the crust form before flipping.',
      youtubeQuery: 'how to pan sear salmon' },
    { section: 'Garlic Butter', duration: 120,
      instructions: [
        { text: 'Lower the heat. Add ', highlight: '2 tbsp butter', after: ' and the sliced garlic to the pan.' },
        { text: 'As the butter foams, spoon it over the salmon for 1 minute. Finish with a squeeze of lemon.' },
      ],
      tip: 'Basting with the foaming butter is what carries the garlic flavour into the fish.',
      youtubeQuery: 'garlic butter basting salmon' },
  ],

  'chickpea-curry': [
    { section: 'Build the Base', duration: 300,
      instructions: [
        { text: 'Finely dice ', highlight: '1 onion', after: '; grate 2 cloves garlic and 1 tbsp ginger; chop 2 tomatoes.' },
        { text: 'Heat ', highlight: '2 tbsp oil', after: ' in a pan and cook the onion 5 minutes until soft and golden.' },
        { text: 'Stir in the garlic, ginger and ', highlight: '1 tsp cumin', after: '; cook 1 minute until fragrant.' },
      ],
      tip: 'Cook the onion properly golden first — it\u2019s the flavour foundation of the curry.',
      youtubeQuery: 'how to make curry base onion ginger garlic' },
    { section: 'Simmer', duration: 600,
      instructions: [
        { text: 'Add the chopped tomatoes and cook 4\u20135 minutes until they break down into a paste.' },
        { text: 'Drain and add ', highlight: '2 cans chickpeas', after: ' with a splash of water.' },
        { text: 'Simmer 8\u201310 minutes, stirring occasionally, until thickened. Season with salt to taste.' },
      ],
      tip: 'Mash a few chickpeas against the pan to naturally thicken the sauce.',
      youtubeQuery: 'chickpea curry simmer' },
  ],

  'banana-pancakes': [
    { section: 'Make the Batter', duration: 240,
      instructions: [
        { text: 'Mash ', highlight: '2 ripe bananas', after: ' in a bowl until fairly smooth.' },
        { text: 'Whisk in ', highlight: '2 eggs', after: ' and 150ml milk.' },
        { text: 'Fold in ', highlight: '150g flour', after: ' just until combined — a few lumps are fine, don\u2019t overmix.' },
      ],
      tip: 'Overmixing develops gluten and makes pancakes tough. Stop as soon as the flour disappears.',
      youtubeQuery: 'banana pancake batter' },
    { section: 'Cook the Pancakes', duration: 360,
      instructions: [
        { text: 'Melt a little butter in a pan over medium-low heat.' },
        { text: 'Pour in small rounds of batter. Cook until bubbles form on top and the edges set (~2 min).' },
        { text: 'Flip and cook 1\u20132 minutes more until golden. Repeat with the rest.' },
      ],
      tip: 'Flip only when bubbles pop and stay open — flipping too early tears them.',
      youtubeQuery: 'how to flip pancakes' },
  ],

  'shrimp-fried-rice': [
    { section: 'Prep Everything', duration: 240,
      instructions: [
        { text: 'Dice ', highlight: '1 carrot', after: ' and half an onion small. Beat 2 eggs.' },
        { text: 'Pat ', highlight: '200g shrimp', after: ' dry. Have 300g cooked, cold rice ready (day-old is best).' },
      ],
      tip: 'Cold, day-old rice fries up separate and non-mushy. Fresh hot rice turns to clumps.',
      youtubeQuery: 'fried rice mise en place' },
    { section: 'Cook Shrimp & Egg', duration: 240,
      instructions: [
        { text: 'Heat ', highlight: '2 tbsp oil', after: ' in a wok on high. Sear the shrimp ~1 min per side until pink, then remove.' },
        { text: 'Pour the beaten eggs into the wok, scramble quickly, and push to the side.' },
      ],
      tip: 'High heat and a hot wok — fried rice is fast; have everything within reach.',
      youtubeQuery: 'wok fried rice technique' },
    { section: 'Fry & Combine', duration: 240,
      instructions: [
        { text: 'Add the onion and carrot, stir-fry 2 minutes.' },
        { text: 'Add the rice, breaking up clumps, and toss 2\u20133 minutes.' },
        { text: 'Return the shrimp and egg, add ', highlight: '2 tbsp soy sauce', after: ', and toss to combine. Serve hot.' },
      ],
      tip: 'Spread the rice against the hot wok and let it sit a few seconds between tosses for a light char.',
      youtubeQuery: 'shrimp fried rice finish' },
  ],

  'greek-yogurt-berry-bowl': [
    { section: 'Assemble', duration: 120,
      instructions: [
        { text: 'Spoon ', highlight: '200g Greek yogurt', after: ' into a bowl and smooth the top.' },
        { text: 'Scatter over ', highlight: '100g berries', after: ' (halve any large strawberries).' },
        { text: 'Drizzle with ', highlight: '1 tbsp honey', after: ' and serve.' },
      ],
      tip: 'Add the honey just before eating so it sits on top instead of sinking in.',
      youtubeQuery: 'greek yogurt breakfast bowl' },
  ],
}

// Generic but still technique-oriented fallback for recipes without explicit steps.
export function stepsFor(slug, name, ingredients = []) {
  if (STEPS[slug]) return STEPS[slug]
  const prepList = ingredients.slice(0, 4).map(i => `${i.display}`).join(', ')
  return [
    { section: 'Prep the Ingredients', duration: 300,
      instructions: [
        { text: `Wash, peel and chop as needed: `, highlight: prepList || 'all ingredients', after: '.' },
        { text: 'Measure everything out and keep it within reach before you turn on the heat.' },
      ],
      tip: 'Mise en place — prepping first keeps a fast recipe from getting away from you.',
      youtubeQuery: `${name} prep` },
    { section: 'Cook', duration: 420,
      instructions: [
        { text: `Heat a pan with a little oil over medium heat and add the aromatics (onion/garlic) first if using.` },
        { text: `Add the main ingredients for ${name} and cook, stirring, until done through.` },
        { text: 'Season with salt and pepper, tasting as you go.' },
      ],
      tip: 'Add ingredients in order of how long they take — hardest/longest first.',
      youtubeQuery: `how to cook ${name}` },
    { section: 'Plate & Serve', duration: 120,
      instructions: [
        { text: 'Check seasoning one last time, plate up, and add any fresh garnish.' },
        { text: 'Serve while hot.' },
      ],
      tip: 'A final squeeze of acid (lemon) or fresh herb lifts almost any dish.',
      youtubeQuery: `${name} plating` },
  ]
}
