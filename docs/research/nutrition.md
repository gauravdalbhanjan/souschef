# Nutrition table: USDA FoodData Central

Output: `lib/data/nutrition.json` (64 canonicals).

## Licence

Read on https://fdc.nal.usda.gov/ (home page, "Licensing") and repeated on https://fdc.nal.usda.gov/api-guide/:

> USDA FoodData Central data are in the public domain and they are not copyrighted. They are published under CC0 1.0 Universal (CC0 1.0). No permission is needed for their use, but we request that users list FoodData Central as the source of the data, and when possible, notify us of the product that uses the data so we may better track how FDC is being used in the public domain.

Suggested citation (home page): U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition Research Center. FoodData Central. [Internet]. [cited (enter date)]. Available from https://fdc.nal.usda.gov/.

API terms (api-guide): anyone may use the API with a data.gov API key. The key holder must keep the key private. Default limit is 1,000 requests per hour per IP address; exceeding it blocks the key for 1 hour. DEMO_KEY has lower limits (the guide says 30 per hour and 50 per day; the live headers returned `X-RateLimit-Limit: 10`).

## Method

1. DEMO_KEY could not be used for 64 searches plus 64 detail calls (header showed a limit of 10 requests per hour). The same data was read from FDC's bulk JSON downloads instead (https://fdc.nal.usda.gov/download-datasets/): Foundation Foods (2025-12-18) and SR Legacy (2018-04). No data from any other source was used.
2. For each canonical, the most representative raw or as-sold food was chosen. Foundation was preferred, then SR Legacy.
3. Per 100 g values: kcal = Energy (KCAL, nutrient 208). Foundation foods have no 208. For them kcal is Energy (Atwater Specific Factors, 958), else General (957), as noted per item. No kJ conversion was needed. protein_g = Protein, carbs_g = Carbohydrate by difference, fat_g = Total lipid (fat). Rounded to 1 decimal.
4. Foundation records for canola oil, extra virgin olive oil and iodized salt contain no nutrient values, so the SR Legacy records were used for those three.
5. Household weights come from FDC `foodPortions`. Each `grams` value is the weight of ONE unit (gramWeight / amount); `portion` is the original FDC description including its amount (for example "0.25 cup" gives cup = 4 x the listed gram weight). Foundation foods carry few household portions, so where needed the weight comes from the SR Legacy record of the same food, tagged `[SR Legacy <fdcId>]` in `portion`. Where FDC has no portion, the value is null. No weights were estimated.
6. `grams` always has cup, tbsp, tsp and unit. Extra keys (slice, clove, head, bunch, can, stick) appear only where FDC has that portion and the recipe or category uses it.

## Table

| canonical | fdcId | description | kcal/100g | units (grams per 1 unit) |
|---|---|---|---|---|
| apple | 171688 | Apples, raw, with skin (Includes foods for USDA's Food Distribution Program) (SR Legacy) | 52 | cup 125 g; unit 182 g |
| avocado | 171705 | Avocados, raw, all commercial varieties (SR Legacy) | 160 | cup 150 g; unit 201 g |
| bacon | 168277 | Pork, cured, bacon, unprepared (SR Legacy) | 393 | slice 28 g |
| banana | 173944 | Bananas, raw (SR Legacy) | 89 | cup 150 g; unit 118 g |
| basil | 172232 | Basil, fresh (SR Legacy) | 23 | cup 24 g; tbsp 2.7 g |
| beans | 173734 | Beans, black, mature seeds, raw (SR Legacy) | 341 | cup 194 g; tbsp 12.1 g |
| beef | 2514744 | Beef, ground, 80% lean meat / 20% fat, raw (Foundation) | 248 | none |
| bell pepper | 170427 | Peppers, sweet, green, raw (SR Legacy) | 20 | cup 149 g; tbsp 9.3 g; unit 119 g |
| berries | 2346411 | Blueberries, raw (Foundation) | 57.4 | cup 148 g |
| black pepper | 170931 | Spices, pepper, black (SR Legacy) | 251 | tbsp 6.9 g; tsp 2.3 g |
| bread | 325871 | Bread, white, commercially prepared (Foundation) | 270 | slice 27.3 g |
| broccoli | 747447 | Broccoli, raw (Foundation) | 31 | cup 76 g |
| butter | 173410 | Butter, salted (SR Legacy) | 717 | cup 227 g; tbsp 14.2 g; stick 113 g |
| carrot | 170393 | Carrots, raw (SR Legacy) | 41 | cup 128 g; unit 61 g |
| cheese | 328637 | Cheese, cheddar (Foundation) | 408 | cup 105 g; slice 17 g |
| chicken | 171077 | Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw (SR Legacy) | 120 | none |
| chickpeas | 2644288 | Chickpeas (garbanzo beans, bengal gram), canned, sodium added, drained and rinsed (Foundation) | 133 | can 253 g |
| chili | 170497 | Peppers, hot chili, green, raw (SR Legacy) | 40 | cup 150 g; unit 45 g |
| cilantro | 169997 | Coriander (cilantro) leaves, raw (SR Legacy) | 23 | cup 16 g |
| coffee | 171893 | Beverages, coffee, instant, regular, powder (SR Legacy) | 353 | tsp 1 g |
| cream | 170859 | Cream, fluid, heavy whipping (SR Legacy) | 340 | cup 238 g; tbsp 15 g |
| croutons | 172751 | Croutons, plain (SR Legacy) | 407 | cup 30 g |
| cucumber | 2346406 | Cucumber, with peel, raw (Foundation) | 13.9 | cup 104 g; unit 301 g |
| cumin | 170923 | Spices, cumin seed (SR Legacy) | 375 | tbsp 6 g; tsp 2.1 g |
| dijon mustard | 326698 | Mustard, prepared, yellow (Foundation) | 61 | cup 249 g; tsp 6 g |
| egg | 171287 | Egg, whole, raw, fresh (SR Legacy) | 143 | cup 243 g; unit 50 g |
| flour | 168936 | Wheat flour, white, all-purpose, enriched, unbleached (SR Legacy) | 364 | cup 125 g |
| garlic | 1104647 | Garlic, raw (Foundation) | 143 | cup 136 g; tsp 2.8 g; clove 3 g |
| garlic powder | 171325 | Spices, garlic powder (SR Legacy) | 331 | tbsp 9.7 g; tsp 3.1 g |
| ginger | 169231 | Ginger root, raw (SR Legacy) | 80 | tsp 2 g |
| grapes | 2346412 | Grapes, red, seedless, raw (Foundation) | 77.2 | cup 151 g |
| honey | 169640 | Honey (SR Legacy) | 304 | cup 339 g; tbsp 21 g |
| lemon | 167746 | Lemons, raw, without peel (SR Legacy) | 29 | cup 212 g; unit 58 g |
| lettuce | 169248 | Lettuce, iceberg (includes crisphead types), raw (SR Legacy) | 14 | cup 72 g; head 539 g |
| lime | 168155 | Limes, raw (SR Legacy) | 30 | unit 67 g |
| mango | 169910 | Mangos, raw (SR Legacy) | 60 | cup 165 g; unit 336 g |
| mayonnaise | 171009 | Salad dressing, mayonnaise, regular (SR Legacy) | 680 | cup 220 g; tbsp 13.8 g |
| milk | 746782 | Milk, whole, 3.25% milkfat, with added vitamin D (Foundation) | 60 | cup 249 g |
| mushroom | 1999629 | Mushrooms, white button (Foundation) | 24.9 | cup 70 g; unit 18 g |
| oats | 173904 | Cereals, oats, regular and quick, not fortified, dry (SR Legacy) | 379 | cup 81 g |
| oil | 172336 | Oil, canola (SR Legacy) | 884 | cup 218 g; tbsp 14 g; tsp 4.5 g |
| olive oil | 171413 | Oil, olive, salad or cooking (SR Legacy) | 884 | cup 216 g; tbsp 13.5 g; tsp 4.5 g |
| onion | 170000 | Onions, raw (SR Legacy) | 40 | cup 160 g; tbsp 10 g; unit 110 g |
| orange | 169097 | Oranges, raw, all commercial varieties (SR Legacy) | 47 | cup 180 g; unit 131 g |
| paprika | 171329 | Spices, paprika (SR Legacy) | 282 | tbsp 6.8 g; tsp 2.3 g |
| parmesan | 325036 | Cheese, parmesan, grated (Foundation) | 421 | cup 100 g; tbsp 7.6 g |
| pasta | 168927 | Pasta, dry, unenriched (SR Legacy) | 371 | none |
| pork | 2514745 | Pork, ground, raw (Foundation) | 233 | none |
| potato | 170026 | Potatoes, flesh and skin, raw (SR Legacy) | 77 | cup 150 g; unit 213 g |
| rice | 169756 | Rice, white, long-grain, regular, raw, unenriched (SR Legacy) | 365 | cup 185 g |
| salmon | 2684441 | Fish, salmon, Atlantic, farm raised, raw (Foundation) | 203 | unit 396 g |
| salt | 173468 | Salt, table (SR Legacy) | 0 | cup 292 g; tbsp 18 g; tsp 6 g |
| shrimp | 2684443 | Crustaceans, shrimp, farm raised, raw (Foundation) | 75.7 | none |
| soy sauce | 174277 | Soy sauce made from soy and wheat (shoyu) (SR Legacy) | 53 | cup 255 g; tbsp 16 g; tsp 5.3 g |
| spinach | 168462 | Spinach, raw (SR Legacy) | 23 | cup 30 g; bunch 340 g |
| sugar | 746784 | Sugars, granulated (Foundation) | 385 | cup 188 g; tsp 4 g |
| tea | 173230 | Beverages, tea, instant, unsweetened, powder (SR Legacy) | 315 | tsp 0.7 g |
| tofu | 172475 | Tofu, raw, firm, prepared with calcium sulfate (SR Legacy) | 144 | cup 252 g |
| tomato | 170457 | Tomatoes, red, ripe, raw, year round average (SR Legacy) | 18 | cup 180 g; unit 123 g |
| tortilla | 173242 | Tortillas, ready-to-bake or -fry, flour, without added calcium (SR Legacy) | 325 | unit 49 g |
| vinegar | 172237 | Vinegar, distilled (SR Legacy) | 18 | cup 238 g; tbsp 14.9 g; tsp 5 g |
| worcestershire | 171610 | Sauce, worcestershire (SR Legacy) | 77 | cup 275 g; tbsp 17 g |
| yogurt | 2259793 | Yogurt, plain, whole milk (Foundation) | 77.3 | cup 245 g |
| zucchini | 169291 | Squash, summer, zucchini, includes skin, raw (SR Legacy) | 17 | cup 124 g; unit 196 g |

## No match

None. All 64 canonicals have an fdcId. Proxies and caveats:

- berries: kcal from Atwater energy (specific factors); no analytical KCAL | Proxy: blueberries. Strawberries and raspberries differ in kcal per 100 g.
- cheese: Proxy: cheddar. Other cheeses differ (e.g. mozzarella, feta).
- coffee: Dry INSTANT powder, not roasted ground beans and not brewed. Brewed coffee is about 1 kcal/100 g.
- cream: Proxy for generic 'cream'. Half-and-half is much lower in fat and kcal.
- dijon mustard: Proxy: yellow mustard. Dijon differs in sodium and fat; treat as approximate.
- lettuce: Proxy for generic 'lettuce'; romaine is slightly higher in kcal.
- oil: Proxy: canola oil. Other vegetable oils are similar per 100 g.
- pasta: FDC cup weights depend on pasta shape (64 to 122 g), so no single cup weight is recorded.
- pork: kcal from Atwater energy (specific factors); no analytical KCAL | Proxy for generic 'pork'. Loin cuts are leaner.
- tea: Dry INSTANT tea powder, not tea leaves and not brewed. Brewed black tea is about 1 kcal/100 g.

## Recipe units with no FDC portion weight

- cilantro: bunch
- ginger: tbsp
- worcestershire: tsp

Counts by unit: bunch 1, tbsp 1, tsp 1.

Recipe units `g` and `ml` are not listed as missing (g needs no conversion; for milk use the cup weight).
