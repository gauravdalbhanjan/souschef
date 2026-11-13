// Step-by-step cooking instructions keyed by recipe slug.
//
// Every recipe starts with an auto-built "Get everything ready" step that lists
// each ingredient with its exact amount (US first, metric in brackets), how to
// prep it, and the equipment to pull out. The cooking steps that follow name
// the exact amount, heat, time and doneness cue for each action.
//
// Authoring format: lines are strings; **double asterisks** mark quantities
// that the cooking screen highlights. stepsFor() turns each line into
// { text, parts: [{ t, hl }] } so the UI and read-aloud can use it directly.
//
// Output step shape: { section, duration(sec), instructions:[{text, parts}], tip, youtubeQuery }

// ── Quantity formatting ────────────────────────────────────────────────────
const FRACTIONS = [[0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']]

// 0.5 -> "½", 1.5 -> "1½", 2 -> "2"
// Snap to the nearest whole / common fraction: returns [value, label].
function snap(n) {
  let whole = Math.floor(n + 1e-6)
  let rest = n - whole
  if (rest < 0.125) return [whole, String(whole)]
  if (rest > 0.875) { whole += 1; return [whole, String(whole)] }
  const [v, sym] = FRACTIONS.reduce((best, f) => (Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best))
  return [whole + v, whole ? `${whole}${sym}` : sym]
}

// 0.5 -> "½", 1.5 -> "1½", 2 -> "2"
export const fraction = (n) => snap(n)[1]

const trim1 = (n) => String(Math.round(n * 10) / 10)

function gramsUS(g) {
  const oz = g / 28.3495
  if (oz >= 16) return `${trim1(oz / 16)} lb`
  return `${oz >= 2 ? String(Math.round(oz * 2) / 2) : trim1(oz)} oz`
}

function mlUS(ml) {
  const cups = ml / 236.6
  const [v, label] = snap(cups)
  const about = Math.abs(v - cups) / cups > 0.04 ? 'about ' : ''
  return `${about}${label} cup`
}

function plural(word, n) {
  if (n <= 1) return word
  if (/s$/i.test(word)) return word
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(tomato|potato|ch|sh)$/i.test(word)) return word + 'es'
  return word + 's'
}

const PROPER = new Set(['Dijon', 'Worcestershire', 'Greek'])
const UNIT_WORDS = { clove: 'clove', slice: 'slice', can: 'can', head: 'head', bunch: 'bunch', cup: 'cup' }

// "200 g Spaghetti" -> "7.1 oz (200 g) spaghetti"; "4 clove Garlic" -> "4 cloves garlic"
export function amountLabel(ing, nameOverride) {
  const q = Number(ing.quantity) || 0
  const name = (nameOverride || ing.display).split(' ')
    .map(w => (PROPER.has(w) ? w : w.toLowerCase())).join(' ')
  switch (ing.unit) {
    case 'g': return `${gramsUS(q)} (${q} g) ${name}`
    case 'ml': return `${mlUS(q)} (${q} ml) ${name}`
    case 'tbsp': case 'tsp': return `${fraction(q)} ${ing.unit} ${name}`
    case 'unit': return `${fraction(q)} ${q > 1 ? plural(name, q) : name}`
    default: {
      const w = UNIT_WORDS[ing.unit] || ing.unit
      return `${fraction(q)} ${q > 1 ? (w === 'bunch' ? 'bunches' : w + 's') : w} ${name}`
    }
  }
}

// ── Recipes ────────────────────────────────────────────────────────────────
// prep: per-ingredient note (keyed by ingredient display name) shown in the
//       "Get everything ready" list. A { name, note } object renames the item.
// extras: other things to have ready (water, salt for pasta water, etc.).
export const RECIPES = {
  'caesar-salad': {
    prepSecs: 300,
    equipment: ['large salad bowl', 'small bowl', 'whisk or fork', 'fine grater (Microplane)', 'salad spinner or clean towels', 'tongs'],
    prep: {
      'Romaine Lettuce': 'base trimmed, leaves separated',
      'Parmesan': 'finely grated (about ½ cup loosely packed), split into two piles',
      'Croutons': 'kept aside until the very end',
      'Mayonnaise': 'measured into the small bowl',
      'Worcestershire': { name: 'Worcestershire sauce' },
      'Garlic': 'peeled',
      'Lemon': 'about 1 tbsp juice, seeds removed',
      'Black Pepper': 'freshly cracked',
    },
    steps: [
      { section: 'Make the dressing', duration: 180,
        lines: [
          'In the small bowl, add **2 tbsp mayonnaise**, **1 tsp Dijon mustard** and **1 tsp Worcestershire sauce**.',
          'Grate **1 clove garlic** straight into the bowl (about ½ tsp grated).',
          'Squeeze in the juice of **½ lemon** (about **1 tbsp**). Catch the seeds with your fingers.',
          'Whisk for **30 seconds** until smooth and pale, then stir in half the parmesan (**20 g, about ¼ cup**).',
          'Taste: it should be tangy and garlicky. Too thick? Whisk in **1 tsp water**.',
        ],
        tip: 'Grate the garlic on a Microplane so it melts into the dressing instead of leaving raw chunks.',
        youtubeQuery: 'easy caesar dressing with mayonnaise' },
      { section: 'Wash, dry and chop the romaine', duration: 240,
        lines: [
          'Rinse the romaine leaves under cold water, rubbing the base of each leaf where grit hides.',
          'Spin dry, or roll in a clean towel and press. The leaves must be completely dry.',
          'Stack 4 to 5 leaves and cut across into **1 inch (2.5 cm)** wide ribbons. Discard the very bottom 1 inch of stem.',
          'Put all the chopped romaine (about **6 cups**) in the large bowl.',
        ],
        tip: 'Wet leaves water down the dressing and it slides off. Dry them twice if in doubt.',
        youtubeQuery: 'how to cut romaine lettuce for salad' },
      { section: 'Toss and serve', duration: 120,
        lines: [
          'Pour about **two thirds** of the dressing over the romaine.',
          'Toss with tongs for **20 to 30 seconds**, lifting from the bottom, until every leaf has a light coat. Add the rest only if it looks dry.',
          'Scatter **1 cup croutons** and the remaining **20 g parmesan** on top.',
          'Finish with **1 tsp black pepper** and serve right away, split between **2 plates**.',
        ],
        tip: 'Croutons go on last so they stay crunchy.',
        youtubeQuery: 'how to toss caesar salad' },
    ],
  },

  'aglio-olio-spaghetti': {
    prepSecs: 180,
    equipment: ['large pot (at least 4 qt / 4 L)', '12 inch (30 cm) skillet', 'tongs', 'heatproof mug for pasta water', 'colander'],
    prep: {
      'Spaghetti': 'measured, still dry',
      'Garlic': 'peeled and sliced paper thin',
      'Olive Oil': 'measured, not yet in the pan',
      'Chili': 'finely chopped (remove seeds for less heat)',
      'Parmesan': 'finely grated (about ⅓ cup)',
      'Salt': 'for the pasta water',
    },
    extras: ['**3 quarts (3 L) water** for the pasta'],
    steps: [
      { section: 'Boil the water', duration: 420,
        lines: [
          'Fill the large pot with **3 quarts (3 L) water**, cover and bring to a rolling boil over high heat (about 7 minutes).',
          'Add **1 tsp salt** once it boils.',
        ],
        tip: 'A lid gets the water boiling noticeably faster.',
        youtubeQuery: 'how to boil water for pasta' },
      { section: 'Cook the spaghetti', duration: 480,
        lines: [
          'Add **7 oz (200 g) spaghetti** and stir for the first **30 seconds** so it doesn\u2019t stick.',
          'Boil uncovered for **1 minute less** than the packet says (usually **8 minutes**).',
          'Before draining, scoop out **1 cup (240 ml) pasta water** with the mug. Then drain.',
        ],
        tip: 'Start the garlic (next step) when the pasta has about 4 minutes left so both finish together.',
        youtubeQuery: 'how to cook spaghetti al dente' },
      { section: 'Gently cook the garlic and chili', duration: 240,
        lines: [
          'Put **3 tbsp olive oil**, the sliced **4 cloves garlic** and the chopped **1 chili** in the cold skillet.',
          'Turn the heat to **medium-low**. Cook **3 to 4 minutes**, stirring, until the garlic is pale gold and smells sweet.',
          'If the garlic starts to brown, pull the pan off the heat right away. Brown garlic tastes bitter.',
        ],
        tip: 'Starting garlic in cold oil lets it flavour the oil slowly without burning.',
        youtubeQuery: 'aglio e olio garlic oil' },
      { section: 'Toss and serve', duration: 120,
        lines: [
          'Add the drained spaghetti to the skillet with **¼ cup (60 ml)** of the pasta water.',
          'Toss with tongs over **medium heat** for **1 to 2 minutes** until the liquid turns glossy and coats the strands. Add another splash of water if it looks dry.',
          'Turn off the heat, add **30 g (about ⅓ cup) parmesan**, toss again and serve on **2 plates**.',
        ],
        tip: 'Constant tossing is what turns the oil and starchy water into a silky sauce.',
        youtubeQuery: 'aglio e olio emulsify pasta water' },
    ],
  },

  'caesar-wrap': {
    prepSecs: 300,
    equipment: ['10 inch (25 cm) skillet', 'cutting board and sharp knife', 'medium bowl', 'fine grater', 'instant-read thermometer (optional)'],
    prep: {
      'Tortillas': 'large (10 inch / 25 cm), at room temperature',
      'Chicken Breast': 'patted dry, seasoned with a pinch of salt and pepper on both sides',
      'Romaine Lettuce': 'washed, dried and chopped into ½ inch (1 cm) ribbons (about 3 cups)',
      'Parmesan': 'finely grated (about ¼ cup)',
      'Garlic': 'peeled and finely grated',
    },
    extras: ['**1 tsp oil** for the pan, plus salt and pepper'],
    steps: [
      { section: 'Cook the chicken', duration: 720,
        lines: [
          'Heat **1 tsp oil** in the skillet over **medium-high** heat until it shimmers (about 1 minute).',
          'Lay in the **7 oz (200 g) chicken breast** and cook **5 to 6 minutes** without moving it, until golden underneath.',
          'Flip and cook **5 to 6 minutes** more, until the thickest part reads **165°F (74°C)** or the juices run clear.',
          'Move to the board and rest **5 minutes**, then slice into thin strips.',
        ],
        tip: 'If the breast is thicker than 1 inch, slice it in half horizontally first so it cooks evenly.',
        youtubeQuery: 'how to pan fry chicken breast juicy' },
      { section: 'Dress the lettuce', duration: 120,
        lines: [
          'In the medium bowl, mix **2 tbsp mayonnaise**, the grated **1 clove garlic** and half the parmesan (**10 g**).',
          'Add the chopped **½ head romaine** and the remaining **10 g parmesan**. Toss until coated.',
        ],
        tip: 'Dress the lettuce right before wrapping so it stays crisp.',
        youtubeQuery: 'chicken caesar wrap' },
      { section: 'Warm, fill and roll', duration: 180,
        lines: [
          'Wipe the skillet and warm each of the **2 tortillas** over **medium** heat for **20 seconds per side** so they bend without cracking.',
          'Lay half the lettuce and half the chicken in a line across the lower third of each tortilla.',
          'Fold in the sides, then roll up tightly from the bottom. Cut each wrap in half on the diagonal.',
        ],
        tip: 'Keep the filling in a tight line and leave a 2 inch border at the sides so the wrap closes.',
        youtubeQuery: 'how to roll a wrap burrito fold' },
    ],
  },

  'bacon-ham-sandwich': {
    prepSecs: 120,
    equipment: ['10 inch (25 cm) skillet', 'paper towels', 'spatula', 'butter knife'],
    prep: {
      'Bread': 'sandwich slices',
      'Bacon': 'straight from the fridge',
      'Cheese': 'sliced or grated (about ⅓ cup grated)',
      'Egg': 'kept in the shell until needed',
      'Butter': 'softened, so it spreads',
    },
    steps: [
      { section: 'Cook the bacon', duration: 420,
        lines: [
          'Lay **3 slices bacon** in the cold skillet, side by side.',
          'Turn the heat to **medium**. Cook **6 to 8 minutes**, turning every 2 minutes, until crisp and deep golden.',
          'Move the bacon to paper towels. Leave about **1 tsp fat** in the pan and pour off the rest.',
        ],
        tip: 'Starting bacon in a cold pan renders the fat slowly, so it crisps evenly instead of burning.',
        youtubeQuery: 'how to cook crispy bacon in a pan' },
      { section: 'Fry the egg', duration: 180,
        lines: [
          'Keep the pan on **medium-low**. Crack in **1 egg**.',
          'Cook **2 to 3 minutes** until the white is fully set and the yolk is still soft. For a firm yolk, flip and cook **1 more minute**.',
          'Season with a small pinch of salt and pepper and slide it onto a plate.',
        ],
        tip: 'Low heat keeps the edges from going brown and rubbery.',
        youtubeQuery: 'how to fry an egg perfectly' },
      { section: 'Toast and assemble', duration: 240,
        lines: [
          'Spread **1 tbsp butter** over one side of both **2 slices bread**.',
          'Put the bread butter-side down in the pan over **medium** heat. Top one slice with the **30 g cheese**.',
          'Toast **2 to 3 minutes** until golden underneath and the cheese starts to melt.',
          'Layer the bacon and egg on the cheese, close with the other slice (butter-side out), press lightly and cut in half.',
        ],
        tip: 'Cover the pan for the last minute to melt the cheese faster.',
        youtubeQuery: 'bacon egg and cheese sandwich' },
    ],
  },

  'guacamole': {
    prepSecs: 120,
    equipment: ['medium bowl', 'fork or potato masher', 'cutting board and sharp knife', 'spoon', 'citrus squeezer (optional)'],
    prep: {
      'Avocado': 'ripe (they give slightly when pressed)',
      'Lime': 'rolled on the counter, then halved',
      'Onion': 'finely diced (about ¼ cup)',
      'Cilantro': 'leaves and tender stems finely chopped (about ¼ cup)',
      'Chili': 'seeds removed, finely minced',
      'Salt': 'kosher or sea salt',
    },
    steps: [
      { section: 'Chop the aromatics', duration: 180,
        lines: [
          'Finely dice **½ onion** into pieces about **⅛ inch (3 mm)**. You want about **¼ cup**.',
          'Cut **1 chili** in half lengthways, scrape out the seeds and white ribs, then mince very finely.',
          'Chop **1 bunch cilantro** leaves and tender stems. Measure about **¼ cup** for the guacamole and keep the rest for garnish.',
          'Put the onion and chili in the bowl with **½ tsp salt** and the juice of **½ lime**. Leave **2 minutes** to soften.',
        ],
        tip: 'Letting the onion sit in lime and salt takes away its harsh raw bite.',
        youtubeQuery: 'how to finely dice onion' },
      { section: 'Mash the avocado', duration: 180,
        lines: [
          'Cut **2 avocados** in half around the pit, twist apart and remove the pit with a spoon.',
          'Scoop the flesh into the bowl with the onion mixture.',
          'Mash with the fork for **30 to 45 seconds**, leaving some small chunks for texture.',
        ],
        tip: 'Mashing on top of the lime juice coats the avocado straight away and keeps it green.',
        youtubeQuery: 'how to cut and pit an avocado' },
      { section: 'Season and serve', duration: 60,
        lines: [
          'Fold in the chopped cilantro.',
          'Taste, then add up to **½ tsp more salt** and the juice of the other **½ lime** if it needs brightness.',
          'Serve right away for **3 people**, or press plastic wrap directly onto the surface and chill up to **2 hours**.',
        ],
        tip: 'Guacamole usually needs more salt and lime than you expect. Taste on a chip, not a spoon.',
        youtubeQuery: 'how to season guacamole' },
    ],
  },

  'chicken-nuggets': {
    prepSecs: 300,
    equipment: ['baking sheet lined with parchment', '3 shallow bowls', 'food processor or box grater', 'cutting board and knife', 'instant-read thermometer (optional)'],
    prep: {
      'Chicken Breast': 'patted dry and cut into 1½ inch (4 cm) chunks (about 20 pieces)',
      'Flour': 'in bowl 1, mixed with the salt and pepper',
      'Egg': 'beaten with 1 tbsp water in bowl 2',
      'Bread': 'blitzed or grated into fine crumbs in bowl 3 (about 1 cup)',
      'Salt': 'mixed into the flour',
      'Black Pepper': 'mixed into the flour',
    },
    extras: ['Oil spray or **1 tbsp oil** for the crumbs (optional, helps browning)'],
    steps: [
      { section: 'Heat the oven', duration: 60,
        lines: [
          'Heat the oven to **425°F (220°C)** with a rack in the middle.',
          'Line the baking sheet with parchment.',
        ],
        tip: 'A fully hot oven is what makes the coating crisp. Give it 10 minutes to preheat while you coat.',
        youtubeQuery: 'how to preheat oven' },
      { section: 'Coat the chicken', duration: 360,
        lines: [
          'Toss the chicken chunks in the flour bowl (**100 g flour** with **1 tsp salt** and **1 tsp pepper**) and shake off the excess.',
          'Dip each piece in the beaten **1 egg**, letting the extra drip back into the bowl.',
          'Roll in the breadcrumbs from **2 slices bread** and press so they stick.',
          'Lay the pieces on the sheet with **1 inch (2.5 cm)** between them. Spray or drizzle lightly with oil if using.',
        ],
        tip: 'Use one hand for the dry bowls and the other for the egg so your fingers don\u2019t clump with breading.',
        youtubeQuery: 'how to bread chicken flour egg breadcrumbs' },
      { section: 'Bake', duration: 960,
        lines: [
          'Bake **8 minutes**, then flip each nugget with tongs.',
          'Bake **7 to 9 minutes** more, until golden and the centre of a large piece reads **165°F (74°C)**.',
          'Rest **2 minutes** on the sheet before serving to **2 people**.',
        ],
        tip: 'Cut one open if you have no thermometer. It should be white all the way through with clear juices.',
        youtubeQuery: 'baked chicken nuggets crispy' },
    ],
  },

  'chicken-strips': {
    prepSecs: 300,
    equipment: ['12 inch (30 cm) skillet', '2 shallow bowls', 'tongs', 'plate lined with paper towels', 'instant-read thermometer (optional)'],
    prep: {
      'Chicken Breast': 'patted dry and cut lengthways into strips ½ inch (1 cm) thick (about 10 strips)',
      'Flour': 'in bowl 1, mixed with the paprika and ½ tsp salt',
      'Egg': 'beaten in bowl 2',
      'Paprika': 'mixed into the flour',
      'Oil': 'measured, not yet in the pan',
    },
    extras: ['**½ tsp salt** for the flour'],
    steps: [
      { section: 'Coat the strips', duration: 240,
        lines: [
          'Dredge each strip in the flour mix (**80 g flour**, **1 tsp paprika**, **½ tsp salt**) and shake off the excess.',
          'Dip in the beaten **1 egg**, then back into the flour for a second, thicker coat.',
          'Set the strips on a plate in a single layer.',
        ],
        tip: 'The double dip (flour, egg, flour) gives a craggy coating that fries up extra crisp.',
        youtubeQuery: 'double dredge chicken tenders' },
      { section: 'Pan-fry', duration: 480,
        lines: [
          'Heat **2 tbsp oil** in the skillet over **medium-high** until it shimmers (a pinch of flour should sizzle).',
          'Add half the strips with space between them. Cook **3 to 4 minutes** until deep golden underneath.',
          'Flip and cook **3 minutes** more, until the thickest strip reads **165°F (74°C)**.',
          'Drain on the paper towels and repeat with the rest, adding a little more oil if the pan looks dry.',
        ],
        tip: 'Crowding the pan drops the heat and makes the coating soggy. Cook in two batches.',
        youtubeQuery: 'how to pan fry chicken tenders' },
      { section: 'Rest and serve', duration: 120,
        lines: [
          'Rest the strips **2 minutes** so the coating sets.',
          'Sprinkle with a pinch of salt while hot and serve to **2 people**.',
        ],
        tip: 'Salt right out of the pan so it sticks to the hot coating.',
        youtubeQuery: 'chicken strips dipping sauce' },
    ],
  },

  'chicken-fries': {
    prepSecs: 420,
    equipment: ['large baking sheet lined with parchment', '10 inch (25 cm) skillet', 'large bowl', 'shallow bowl', 'tongs', 'paper towels'],
    prep: {
      'Chicken Breast': 'patted dry and cut into fry-shaped sticks ½ inch (1 cm) thick',
      'Potato': 'scrubbed and cut into ⅓ inch (8 mm) fries, rinsed and dried well',
      'Flour': 'in the shallow bowl with ½ tsp of the salt',
      'Oil': 'split: 1½ tbsp for the potatoes, 1½ tbsp for the chicken',
      'Salt': 'split: ½ tsp for the potatoes, ½ tsp for the flour',
    },
    steps: [
      { section: 'Roast the potato fries', duration: 1500,
        lines: [
          'Heat the oven to **425°F (220°C)**.',
          'In the large bowl, toss the fries cut from **3 potatoes** with **1½ tbsp oil** and **½ tsp salt**.',
          'Spread on the sheet in a single layer, not touching. Roast **12 minutes**, flip, then roast **10 to 13 minutes** more until golden and crisp.',
        ],
        tip: 'Dry the cut potatoes really well. Surface water steams them instead of crisping.',
        youtubeQuery: 'crispy oven baked fries' },
      { section: 'Coat and fry the chicken', duration: 480,
        lines: [
          'While the potatoes roast, toss the **9 oz (250 g) chicken** sticks in the flour (**60 g** with **½ tsp salt**) until coated.',
          'Heat **1½ tbsp oil** in the skillet over **medium-high** until it shimmers.',
          'Fry the chicken **2 to 3 minutes per side** until golden and cooked through (**165°F / 74°C**). Drain on paper towels.',
        ],
        tip: 'Time the chicken to start when the potatoes are flipped, so everything is hot at the same time.',
        youtubeQuery: 'chicken fries recipe' },
      { section: 'Serve', duration: 60,
        lines: [
          'Pile the potato fries and chicken fries together on **2 plates**.',
          'Season with a final pinch of salt while hot.',
        ],
        tip: 'Serve straight away. Both lose their crunch as they cool.',
        youtubeQuery: 'chicken fries dipping sauce' },
    ],
  },

  'bundt-cake': {
    prepSecs: 600,
    equipment: ['10 to 12 cup bundt pan', 'stand or hand mixer', '2 mixing bowls', 'fine grater (for lemon zest)', 'spatula', 'skewer or toothpick', 'cooling rack'],
    prep: {
      'Flour': 'all-purpose, spooned and levelled (about 2½ cups)',
      'Sugar': 'granulated (about 1¼ cups)',
      'Butter': 'softened at room temperature for 1 hour, plus a little extra for the pan',
      'Egg': 'at room temperature',
      'Milk': 'at room temperature',
      'Lemon': 'zest finely grated, then juiced (about 3 tbsp juice)',
    },
    extras: ['**2 tsp baking powder** and **¼ tsp salt** (pantry, needed for the cake to rise)'],
    steps: [
      { section: 'Prep the pan and dry mix', duration: 300,
        lines: [
          'Heat the oven to **350°F (175°C)** with a rack in the lower middle.',
          'Brush every ridge of the bundt pan with soft butter, then dust with **1 tbsp flour**, tap out the excess.',
          'In one bowl, whisk the rest of the **300 g flour** with **2 tsp baking powder** and **¼ tsp salt**.',
        ],
        tip: 'Bundt cakes stick in the ridges. Grease every groove, including the centre tube.',
        youtubeQuery: 'how to grease a bundt pan' },
      { section: 'Cream the butter and sugar', duration: 300,
        lines: [
          'Beat **200 g butter** with **250 g sugar** and the lemon zest on **medium-high** for **3 to 4 minutes**, until pale and fluffy.',
          'Add the **4 eggs** one at a time, beating **30 seconds** after each. Scrape down the bowl.',
        ],
        tip: 'Proper creaming whips air into the butter. That air is a big part of what makes the cake light.',
        youtubeQuery: 'how to cream butter and sugar' },
      { section: 'Make the batter', duration: 180,
        lines: [
          'On **low** speed, add a third of the flour mix, then half the **200 ml milk** mixed with **2 tbsp lemon juice**.',
          'Repeat: flour, the rest of the milk, then the last of the flour. Mix only until no dry streaks remain.',
          'Spoon the batter into the pan, smooth the top and tap the pan on the counter twice to pop air bubbles.',
        ],
        tip: 'Stop mixing as soon as the flour disappears. Overmixing makes a tough, dense cake.',
        youtubeQuery: 'alternating dry and wet ingredients cake batter' },
      { section: 'Bake', duration: 2700,
        lines: [
          'Bake **45 to 50 minutes**, until golden and a skewer pushed into the thickest part comes out clean.',
          'Cool in the pan for **10 minutes**, then turn out onto the rack.',
          'Drizzle with the last **1 tbsp lemon juice** while warm. Cool fully (about **1 hour**) before slicing into **8 pieces**.',
        ],
        tip: 'Don\u2019t open the oven in the first 30 minutes or the cake can sink.',
        youtubeQuery: 'lemon bundt cake baking test doneness' },
    ],
  },

  'tomato-spinach-pasta': {
    prepSecs: 240,
    equipment: ['large pot (at least 4 qt / 4 L)', '12 inch (30 cm) skillet', 'wooden spoon', 'colander', 'heatproof mug for pasta water'],
    prep: {
      'Penne Pasta': 'measured, still dry (about 2 cups)',
      'Tomato': 'cored and chopped into ½ inch (1 cm) pieces (about 2 cups)',
      'Spinach': 'rinsed and drained (about 3 packed cups)',
      'Garlic': 'peeled and thinly sliced',
      'Olive Oil': 'measured',
      'Parmesan': 'finely grated (about ⅓ cup)',
    },
    extras: ['**3 quarts (3 L) water** and **1 tbsp salt** for the pasta'],
    steps: [
      { section: 'Cook the penne', duration: 660,
        lines: [
          'Bring **3 quarts (3 L) water** with **1 tbsp salt** to a rolling boil.',
          'Add **7 oz (200 g) penne** and boil for the packet time minus **1 minute** (usually **10 minutes**), stirring now and then.',
          'Scoop out **½ cup (120 ml) pasta water**, then drain.',
        ],
        tip: 'Start the sauce once the penne goes in. It takes about the same time.',
        youtubeQuery: 'how to cook penne pasta' },
      { section: 'Make the tomato sauce', duration: 420,
        lines: [
          'Warm **2 tbsp olive oil** in the skillet over **medium** heat. Add the sliced **2 cloves garlic** and cook **1 minute** until fragrant, not brown.',
          'Add the chopped **3 tomatoes** and a pinch of salt. Cook **5 to 6 minutes**, pressing with the spoon, until they collapse into a chunky sauce.',
        ],
        tip: 'Pressing the tomatoes as they soften helps them break down faster.',
        youtubeQuery: 'quick fresh tomato sauce' },
      { section: 'Wilt the spinach and combine', duration: 180,
        lines: [
          'Add the **100 g spinach** a handful at a time, stirring until each batch wilts (about **1 minute** total).',
          'Tip in the drained penne and **¼ cup (60 ml)** of the pasta water. Toss **1 minute** until glossy.',
          'Off the heat, stir in **30 g parmesan**. Taste for salt and serve on **2 plates**.',
        ],
        tip: 'The spinach looks like a lot but shrinks to almost nothing. Add it gradually so it wilts evenly.',
        youtubeQuery: 'pasta with tomato and spinach' },
    ],
  },

  'veggie-omelette': {
    prepSecs: 180,
    equipment: ['8 inch (20 cm) non-stick pan', 'small bowl', 'fork or whisk', 'silicone spatula'],
    prep: {
      'Egg': 'cracked into the small bowl',
      'Bell Pepper': 'seeds removed, cut into ¼ inch (5 mm) dice (about ⅓ cup)',
      'Onion': 'finely diced (about 2 tbsp)',
      'Cheese': 'grated (about ⅓ cup)',
      'Butter': 'measured',
      'Salt': 'split: a pinch for the veg, the rest for the eggs',
    },
    steps: [
      { section: 'Soften the vegetables', duration: 180,
        lines: [
          'Melt **½ tbsp butter** in the pan over **medium** heat until it foams.',
          'Add the diced **½ bell pepper** and **¼ onion** with a pinch of salt. Cook **2 to 3 minutes**, stirring, until soft.',
          'Spread the vegetables evenly across the pan and add the remaining **½ tbsp butter**.',
        ],
        tip: 'Softening the veg first means it isn\u2019t crunchy inside a 2 minute omelette.',
        youtubeQuery: 'saute peppers and onions' },
      { section: 'Cook and fold', duration: 150,
        lines: [
          'Pour in the eggs. Let them sit **15 seconds**, then push the set edges to the centre with the spatula and tilt the pan so raw egg runs underneath.',
          'Repeat for **1 to 1½ minutes** until the top is softly set but still slightly glossy.',
          'Scatter **30 g cheese** over one half. Fold the other half over, cook **30 seconds**, and slide onto a plate.',
        ],
        tip: 'Take it off while the top still looks slightly wet. It finishes cooking on the plate.',
        youtubeQuery: 'how to fold an omelette' },
    ],
  },

  'garlic-butter-salmon': {
    prepSecs: 240,
    equipment: ['12 inch (30 cm) skillet (stainless or cast iron)', 'fish spatula or thin spatula', 'spoon for basting', 'paper towels'],
    prep: {
      'Salmon': { name: 'Salmon fillets', note: 'about 6 oz (170 g) each, skin on, out of the fridge 10 minutes, patted very dry' },
      'Butter': 'cut into cubes',
      'Garlic': 'peeled and thinly sliced',
      'Lemon': 'half cut into wedges, half kept for juicing',
      'Black Pepper': 'freshly cracked',
    },
    extras: ['**1 tbsp oil** for searing and **½ tsp salt** for seasoning'],
    steps: [
      { section: 'Season the salmon', duration: 120,
        lines: [
          'Pat the **2 salmon fillets** dry on all sides with paper towels.',
          'Season the flesh side with **½ tsp salt** and **1 tsp black pepper**.',
        ],
        tip: 'A dry surface is the secret to crisp skin. Any moisture steams the fish.',
        youtubeQuery: 'how to prep salmon for pan searing' },
      { section: 'Sear skin-side down', duration: 330,
        lines: [
          'Heat **1 tbsp oil** in the skillet over **medium-high** until it shimmers (about 2 minutes).',
          'Lay the fillets skin-side down, away from you. Press each one with the spatula for **10 seconds** so the skin stays flat.',
          'Cook **4 to 5 minutes** without moving, until the flesh is opaque about two thirds of the way up the sides.',
          'Flip and cook **1 to 2 minutes** more, until the centre reads **125 to 130°F (52 to 54°C)** for medium.',
        ],
        tip: 'If the fillet sticks when you try to flip, wait 30 seconds. It releases when the skin is crisp.',
        youtubeQuery: 'how to pan sear salmon crispy skin' },
      { section: 'Baste with garlic butter', duration: 90,
        lines: [
          'Turn the heat to **low**. Add **2 tbsp butter** and the sliced **3 cloves garlic**.',
          'Tilt the pan and spoon the foaming butter over the salmon for **45 to 60 seconds**, until the garlic is light gold.',
          'Squeeze over the juice of **½ lemon** and serve with the lemon wedges and pan butter on **2 plates**.',
        ],
        tip: 'Pull the pan off the heat as soon as the garlic turns golden. It burns fast in butter.',
        youtubeQuery: 'butter basting salmon garlic' },
    ],
  },

  'chickpea-curry': {
    prepSecs: 300,
    equipment: ['large deep skillet or saucepan with lid', 'wooden spoon', 'colander', 'fine grater', 'can opener'],
    prep: {
      'Chickpeas': '15 oz (425 g) each, drained and rinsed',
      'Tomato': 'chopped into ½ inch (1 cm) pieces (about 1½ cups)',
      'Onion': 'finely diced (about 1 cup)',
      'Garlic': 'peeled and finely grated',
      'Ginger': 'peeled and finely grated (a 1 inch / 2.5 cm piece)',
      'Cumin': 'ground cumin, measured',
      'Oil': 'measured',
    },
    extras: ['**1 tsp salt** and **1 cup (240 ml) water**'],
    steps: [
      { section: 'Cook the onion', duration: 420,
        lines: [
          'Heat **2 tbsp oil** in the pan over **medium** heat.',
          'Add the diced **1 onion** with a pinch of salt. Cook **6 to 7 minutes**, stirring every minute, until soft and golden at the edges.',
        ],
        tip: 'Properly golden onion is the backbone of the curry\u2019s flavour. Don\u2019t rush it on high heat.',
        youtubeQuery: 'how to caramelize onions for curry' },
      { section: 'Add the spices', duration: 90,
        lines: [
          'Stir in the grated **2 cloves garlic** and **1 tbsp ginger**. Cook **1 minute**.',
          'Add **1 tsp cumin** and stir **30 seconds** until it smells toasty. Add a splash of water if anything starts to catch.',
        ],
        tip: 'Toasting ground spices in oil wakes up their flavour. Keep stirring so they don\u2019t burn.',
        youtubeQuery: 'blooming spices in oil' },
      { section: 'Make the sauce', duration: 300,
        lines: [
          'Add the chopped **2 tomatoes** and **½ tsp salt**.',
          'Cook **4 to 5 minutes**, mashing with the spoon, until they break down into a thick paste and the oil starts to separate at the edges.',
        ],
        tip: 'The oil pooling at the sides is the sign the tomato base is cooked.',
        youtubeQuery: 'curry tomato masala base' },
      { section: 'Simmer the chickpeas', duration: 600,
        lines: [
          'Add the **2 cans chickpeas** and **1 cup (240 ml) water**. Stir and bring to a bubble.',
          'Cover and simmer on **low** for **8 to 10 minutes**, stirring halfway.',
          'Mash about **¼ cup** of chickpeas against the side of the pan to thicken the sauce. Taste and add up to **½ tsp salt**. Serves **3**.',
        ],
        tip: 'Too thick? Add water 2 tbsp at a time. Too thin? Simmer uncovered for 2 more minutes.',
        youtubeQuery: 'easy chickpea curry chana masala' },
    ],
  },

  'banana-pancakes': {
    prepSecs: 180,
    equipment: ['large mixing bowl', 'fork and whisk', 'non-stick skillet or griddle', 'thin spatula', '¼ cup measure or ladle'],
    prep: {
      'Banana': 'very ripe (brown spots), peeled',
      'Flour': 'all-purpose, spooned and levelled (about 1¼ cups)',
      'Egg': 'at room temperature if possible',
      'Milk': 'measured',
      'Butter': 'half melted for the batter, half kept for the pan',
    },
    extras: ['**1 tsp baking powder** and a pinch of salt (pantry, makes them fluffy)'],
    steps: [
      { section: 'Make the batter', duration: 240,
        lines: [
          'Mash **2 bananas** in the bowl with a fork until almost smooth.',
          'Whisk in **2 eggs**, the **150 ml milk** and **½ tbsp melted butter**.',
          'Add **150 g flour**, **1 tsp baking powder** and a pinch of salt. Fold just until no dry flour shows. Small lumps are fine.',
          'Rest the batter **5 minutes** while the pan heats.',
        ],
        tip: 'Overmixing makes pancakes tough. Stop as soon as the flour disappears.',
        youtubeQuery: 'banana pancake batter' },
      { section: 'Cook the pancakes', duration: 480,
        lines: [
          'Heat the pan over **medium-low** and wipe with a little of the remaining **½ tbsp butter**.',
          'Pour **¼ cup** of batter per pancake, leaving space between them.',
          'Cook **2 to 3 minutes** until bubbles form and pop on top and the edges look set.',
          'Flip and cook **1 to 2 minutes** more until golden. Repeat, buttering the pan between batches. Makes about **8 pancakes**.',
        ],
        tip: 'Banana batter browns faster than plain. Keep the heat at medium-low.',
        youtubeQuery: 'how to flip pancakes' },
    ],
  },

  'shrimp-fried-rice': {
    prepSecs: 360,
    equipment: ['wok or 12 inch (30 cm) skillet', 'wide spatula', 'small bowl', '2 plates for holding cooked shrimp and egg'],
    prep: {
      'Rice': { name: 'Cooked rice', note: 'cold, ideally cooked the day before (from about 1 cup / 100 g uncooked), clumps broken up by hand' },
      'Shrimp': 'peeled, deveined and patted dry',
      'Egg': 'beaten in the small bowl with a pinch of salt',
      'Carrot': 'peeled and cut into ¼ inch (5 mm) dice (about ½ cup)',
      'Onion': 'diced ¼ inch (5 mm) (about ½ cup)',
      'Soy Sauce': 'measured',
      'Oil': 'split: 1 tbsp for shrimp and egg, 1 tbsp for the rice',
    },
    steps: [
      { section: 'Sear the shrimp', duration: 180,
        lines: [
          'Heat **1 tbsp oil** in the wok over **high** until it just starts to smoke.',
          'Add the **7 oz (200 g) shrimp** in one layer. Cook **1 minute per side** until pink and curled into a C shape.',
          'Move to a plate.',
        ],
        tip: 'Shrimp curled into a tight O is overcooked. Pull them at a loose C.',
        youtubeQuery: 'how to stir fry shrimp' },
      { section: 'Scramble the eggs', duration: 60,
        lines: [
          'Pour the beaten **2 eggs** into the hot wok.',
          'Stir for **30 to 45 seconds** until just set in soft curds, then add to the shrimp plate.',
        ],
        tip: 'Cook the egg separately so it stays in tender pieces instead of coating the rice.',
        youtubeQuery: 'egg for fried rice' },
      { section: 'Fry the vegetables and rice', duration: 300,
        lines: [
          'Add **1 tbsp oil**, then the diced **1 carrot** and **½ onion**. Stir-fry **2 minutes** on **high**.',
          'Add the **10.5 oz (300 g) cold rice**. Press it flat against the wok, leave **30 seconds**, then toss. Repeat for **3 minutes** until hot and lightly toasted.',
        ],
        tip: 'Fresh warm rice turns mushy. Cold rice fries into separate grains.',
        youtubeQuery: 'wok fried rice technique' },
      { section: 'Season and serve', duration: 90,
        lines: [
          'Drizzle **2 tbsp soy sauce** around the edge of the wok so it sizzles, then toss.',
          'Return the shrimp and egg and toss **1 minute** until hot. Taste, and add up to **1 tsp** more soy if needed. Serves **2**.',
        ],
        tip: 'Pouring soy around the hot rim caramelises it slightly for deeper flavour.',
        youtubeQuery: 'shrimp fried rice' },
    ],
  },

  'greek-yogurt-berry-bowl': {
    prepSecs: 60,
    equipment: ['serving bowl', 'spoon', 'small knife'],
    prep: {
      'Greek Yogurt': 'cold, stirred smooth (about ¾ cup)',
      'Berries': 'rinsed and dried, large strawberries halved (about ⅔ cup)',
      'Honey': 'measured',
    },
    steps: [
      { section: 'Assemble the bowl', duration: 120,
        lines: [
          'Spoon **7 oz (200 g) Greek yogurt** into the bowl and swirl the top with the back of the spoon.',
          'Scatter **3.5 oz (100 g) berries** over the yogurt.',
          'Drizzle **1 tbsp honey** over the top and eat straight away.',
        ],
        tip: 'Add the honey last so it sits on top instead of sinking in.',
        youtubeQuery: 'greek yogurt berry bowl' },
    ],
  },
}

// ── Builders ───────────────────────────────────────────────────────────────
// "Add **2 tbsp** oil" -> { text: 'Add 2 tbsp oil', parts: [{t:'Add '},{t:'2 tbsp',hl:true},{t:' oil'}] }
export function parseLine(line) {
  const parts = String(line).split('**').map((t, i) => ({ t, hl: i % 2 === 1 })).filter(p => p.t)
  return { text: parts.map(p => p.t).join(''), parts }
}

const toStep = (s) => ({
  section: s.section, duration: s.duration, tip: s.tip, youtubeQuery: s.youtubeQuery,
  ...(s.meanwhile ? { meanwhile: s.meanwhile } : {}), // multitasking cue during a hands-off wait
  instructions: s.lines.map(parseLine),
})

// ── Mise en place: station setup, in order, before any cooking step ────────
// Written as actions ("Bowl 1: mix…", "Beat…"), never a repeat of the
// ingredient list. Oven preheating is added automatically (see hoistHeat).
const MISE = {
  'caesar-salad': [
    'Trim the base of the **1 head romaine** and separate the leaves.',
    'Finely grate **40 g parmesan** and split it into two piles.',
    'Peel **1 clove garlic** and halve the **lemon**, picking out the seeds.',
    'Small bowl: measure in **2 tbsp mayonnaise**. Keep the **1 cup croutons** aside for the very end.',
  ],
  'aglio-olio-spaghetti': [
    'Peel **4 cloves garlic** and slice them paper thin.',
    'Finely chop **1 chili** (scrape out the seeds for less heat).',
    'Measure **3 tbsp olive oil** and **7 oz (200 g) spaghetti**.',
    'Finely grate **30 g parmesan** and set the heatproof mug by the stove for pasta water.',
  ],
  'caesar-wrap': [
    'Pat the **7 oz (200 g) chicken breast** dry and season both sides with a pinch of salt and pepper.',
    'Wash, dry and chop **½ head romaine** into ½ inch (1 cm) ribbons.',
    'Finely grate **20 g parmesan** and **1 clove garlic**.',
    'Medium bowl: measure in **2 tbsp mayonnaise**, and set out the **2 tortillas**.',
  ],
  'bacon-ham-sandwich': [
    'Set the skillet on the stove and line a plate with paper towels.',
    'Leave **1 tbsp butter** out to soften, and slice or grate **30 g cheese**.',
    'Set out **2 slices bread**, **3 slices bacon** and **1 egg**.',
  ],
  'guacamole': [
    'Set out the bowl, a fork, the board and a sharp knife.',
    'Roll the **1 lime** firmly on the counter, then halve it.',
    'Check the **2 avocados**: they should give slightly when pressed.',
  ],
  'chicken-nuggets': [
    'Pat the **chicken breast** dry and cut it into 1½ inch (4 cm) chunks (about 20 pieces).',
    'Bowl 1 (dry station): mix **100 g flour** with **1 tsp salt** and **1 tsp pepper**.',
    'Bowl 2: beat **1 egg** with **1 tbsp water** until smooth.',
    'Bowl 3: blitz or grate **2 slices bread** into fine crumbs.',
  ],
  'chicken-strips': [
    'Bowl 1 (dry station): mix **80 g flour**, **1 tsp paprika** and **½ tsp salt**.',
    'Bowl 2: beat **1 egg** until no streaks of white remain.',
    'Pat the **chicken breast** dry and cut it lengthways into strips ½ inch (1 cm) thick.',
    'Line a plate with paper towels and measure **2 tbsp oil**.',
  ],
  'chicken-fries': [
    'Scrub **3 potatoes**, cut them into ⅓ inch (8 mm) fries, then rinse and dry them really well.',
    'Cut the **9 oz (250 g) chicken breast** into fry-shaped sticks ½ inch (1 cm) thick.',
    'Shallow bowl (dry station): mix **60 g flour** with **½ tsp salt**.',
    'Line the baking sheet with parchment and a plate with paper towels.',
  ],
  'bundt-cake': [
    'Leave **200 g butter** out to soften (about 1 hour ahead).',
    'Bring the **4 eggs** and **200 ml milk** to room temperature.',
    'Zest the **lemon**, then juice it (about 3 tbsp).',
    'Measure **300 g flour**, **250 g sugar**, **2 tsp baking powder** and **¼ tsp salt**.',
  ],
  'tomato-spinach-pasta': [
    'Core **3 tomatoes** and chop them into ½ inch (1 cm) pieces.',
    'Rinse and drain **100 g spinach**.',
    'Thinly slice **2 cloves garlic** and finely grate **30 g parmesan**.',
    'Set the heatproof mug by the stove for pasta water.',
  ],
  'veggie-omelette': [
    'Small bowl: crack in **3 eggs**, add **½ tsp salt** and beat with a fork for 20 to 30 seconds until no streaks of white remain.',
    'Dice **½ bell pepper** into ¼ inch (5 mm) pieces and finely dice **¼ onion**.',
    'Grate **30 g cheese** and measure **1 tbsp butter**.',
  ],
  'garlic-butter-salmon': [
    'Take the **2 salmon fillets** out of the fridge 10 minutes ahead.',
    'Thinly slice **3 cloves garlic** and cube **2 tbsp butter**.',
    'Cut half the **lemon** into wedges and keep the other half for juicing.',
    'Set out paper towels, a basting spoon and a thin spatula.',
  ],
  'chickpea-curry': [
    'Drain and rinse **2 cans chickpeas**.',
    'Finely dice **1 onion** and chop **2 tomatoes** into ½ inch (1 cm) pieces.',
    'Finely grate **2 cloves garlic** and **1 tbsp ginger**.',
    'Measure **2 tbsp oil**, **1 tsp cumin** and **1 cup (240 ml) water**.',
  ],
  'banana-pancakes': [
    'Peel **2 very ripe bananas**.',
    'Melt **½ tbsp butter** for the batter and keep **½ tbsp** for the pan.',
    'Measure **150 g flour**, **1 tsp baking powder**, a pinch of salt and **150 ml milk**.',
    'Set out the bowl, fork and whisk, the skillet and a ¼ cup measure.',
  ],
  'shrimp-fried-rice': [
    'Break up **10.5 oz (300 g) cold cooked rice** with your hands.',
    'Pat the **7 oz (200 g) shrimp** dry (peeled and deveined).',
    'Small bowl: beat **2 eggs** with a pinch of salt.',
    'Dice **1 carrot** and **½ onion** into ¼ inch (5 mm) pieces.',
    'Measure **2 tbsp soy sauce** and set out 2 plates for the shrimp and egg.',
  ],
  'greek-yogurt-berry-bowl': [
    'Rinse and dry **100 g berries**, halving any large strawberries.',
    'Set out the serving bowl, **200 g Greek yogurt** and **1 tbsp honey**.',
  ],
}

// Oven preheating and pan lining are setup, not cooking: pull those lines out
// of every recipe's steps so they happen first. Steps left empty are dropped.
const HEAT_RE = /^(pre)?heat the oven|^line the baking sheet/i
function hoistHeat(steps) {
  const heat = []
  const rest = steps.map(s => {
    const keep = s.lines.filter(l => (HEAT_RE.test(l) ? (heat.push(l), false) : true))
    return { ...s, lines: keep }
  }).filter(s => s.lines.length)
  return { heat, steps: rest }
}

// Step 0 for every recipe: the station setup. Written tasks when we have
// them; otherwise built from each ingredient's prep note (so new recipes
// still get a real setup phase), plus the tools to pull out.
function prepStep(spec, name, ingredients, slug, heat) {
  let lines = MISE[slug]
  if (!lines) {
    lines = ingredients.map(ing => {
      const p = spec?.prep?.[ing.display]
      const rename = p && typeof p === 'object' ? p.name : undefined
      const note = p && typeof p === 'object' ? p.note : p
      return `**${amountLabel(ing, rename)}**${ing.optional ? ' (optional)' : ''}${note ? `: ${note}` : ''}`
    })
    for (const x of spec?.extras || []) lines.push(x)
    if (spec?.equipment?.length) lines.push(`Set out: ${spec.equipment.join(', ')}.`)
  }
  return {
    section: 'Get everything ready', duration: spec?.prepSecs || 300,
    lines: [...heat, ...lines],
    tip: 'Set up every station before any heat goes under a pan. Once cooking starts, each step moves quickly.',
    youtubeQuery: `${name} mise en place`,
  }
}

// Fallback for recipes added later without written steps: still lists every
// ingredient with its amount, then sensible technique-based steps.
function genericSteps(name) {
  return [
    { section: 'Cook', duration: 600,
      lines: [
        'Heat **1 tbsp oil** in a large skillet over **medium** heat until it shimmers.',
        'Add any onion or garlic first and cook **2 to 3 minutes** until soft and fragrant.',
        `Add the main ingredients for ${name}, longest-cooking first, and cook, stirring, until done through (meat to **165°F / 74°C**).`,
        'Season with salt and pepper, tasting as you go.',
      ],
      tip: 'Add ingredients in order of how long they take to cook.',
      youtubeQuery: `how to cook ${name}` },
    { section: 'Plate and serve', duration: 120,
      lines: ['Taste once more for salt, plate up and add any fresh garnish.', 'Serve while hot.'],
      tip: 'A squeeze of lemon or a few fresh herbs lifts almost any dish.',
      youtubeQuery: `${name} plating` },
  ]
}

// "Meanwhile…" cues for hands-off waits: what to do with your free hands.
// Step numbers match cooking mode, where prep is a drawer (not step 1).
// Steps without one get a generated cue in cooking mode (lib/cookFlow.js).
const MEANWHILE = {
  'aglio-olio-spaghetti': {
    'Boil the water': 'While the water heats, put the oil, sliced garlic and chili in the cold skillet so it\u2019s ready to go.',
    'Cook the spaghetti': 'When the pasta has about 4 minutes left, start the garlic in the skillet (step 3) so both finish together.',
  },
  'tomato-spinach-pasta': {
    'Cook the penne': 'While the penne boils, start the tomato sauce (step 2). It takes about the same time.',
  },
  'chicken-fries': {
    'Roast the potato fries': 'While the fries roast, set out the flour, egg and crumb bowls and coat the chicken for step 2.',
  },
  'banana-pancakes': {
    'Make the batter': 'While the batter rests, heat the pan over medium-low and set a plate by the stove for finished pancakes.',
  },
  'caesar-wrap': {
    'Cook the chicken': 'While the chicken rests, dress the lettuce (step 2) so the wraps come together in one go.',
  },
  'chickpea-curry': {
    'Simmer the chickpeas': 'While it simmers, rinse the prep bowls and set out bowls and spoons.',
  },
  'bundt-cake': {
    'Bake': 'While it bakes, wash the mixer bowl and set the cooling rack by the oven.',
  },
  'chicken-nuggets': {
    'Bake': 'While they bake, stir together a dipping sauce and set the table.',
  },
}

export function stepsFor(slug, name, ingredients = []) {
  const spec = RECIPES[slug]
  const cues = MEANWHILE[slug] || {}
  const written = (spec ? spec.steps : genericSteps(name)).map(s => (cues[s.section] ? { ...s, meanwhile: cues[s.section] } : s))
  const { heat, steps: cooking } = hoistHeat(written)
  return [prepStep(spec, name, ingredients, slug, heat), ...cooking].map(toStep)
}

export const hasWrittenSteps = (slug) => !!RECIPES[slug]
