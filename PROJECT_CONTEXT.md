# SousChef: Project Context

**Last updated:** 2026-11-17 (device-only + guardrails build; **local preview only, not committed or deployed**)
**Repo:** `F:\kiro\souschef` → `github.com/gauravdalbhanjan/souschef` (`main`, last commit `50dc14a`; everything below is uncommitted local work)

Legend: **UNKNOWN** = not verifiable from the repo or public probes. **NEEDS CONFIRMATION** = an inference the owner should confirm. **FOR REVIEW** = owner decision needed.

---

## 1. Product overview

A mobile-first web app that tracks what's in your kitchen and helps you cook from it. **Device-only: no accounts, no login, no server database.** Everything is stored in this browser (IndexedDB).

| Flow | What happens | Main files |
|---|---|---|
| Home / Ask Chef | Request → policy check → filter (model or rules) → results in the existing tile grid with the filter bar and removable "understood" chips; optional AI recipe tiles | `components/ChefHome.jsx`, `lib/search.js`, `lib/guardrails/*` |
| Add groceries | Receipt photo (OCR, self-hosted Tesseract) → rule parser → optional AI cleanup (validated) → one-by-one confirm; pasted email receipt; typed/voice list | `components/AddGroceries.jsx`, `lib/ocr.js`, `lib/receiptParser.js`, `lib/guardrails/receipt.js`, `lib/aiTasks.js` |
| Pantry | Inventory with low-stock rules, "Check before using" past estimated shelf life (+ "Still good" override), inline edit, Staples | `components/InventoryPage.jsx`, `api.js` |
| Recipe page | Checklist, steps, code-computed nutrition (estimate), allergy note, origin, numbered sources, AI-only: safe temps, risky-method warnings + calendar reminder, feedback | `components/RecipeDetail.jsx`, `components/RecipeExtras.jsx` |
| Cooking mode | Mise en place, step feed, timers, fixed kitchen-safety text with sources | `components/CookingMode.jsx` |
| Routines / Events / Cart | Unchanged features, now stored on the device | `components/RoutinePage.jsx`, `EventsPage.jsx`, `CartPage.jsx` |
| Settings / Privacy | On-device AI choice, Downloads, My kitchen, Export / Import / Export feedback, Privacy page | `components/SettingsPage.jsx`, `components/PrivacyPage.jsx` |

Removed this round: login (Supabase Auth), guest mode, onboarding screen, root-level duplicate components, unused stubs (stats, to-dos, daily tips, timer card, etc.), `supabase/`, the committed `.env`, the GitHub Pages workflow.

---

## 2. Tech stack (exact versions, pinned in `package.json`)

| Runtime deps | Version | | Dev deps | Version |
|---|---|---|---|---|
| react / react-dom | 19.2.7 | | vite | 8.3.8 |
| @mui/material / icons-material | 9.0.1 | | @vitejs/plugin-react | 6.0.2 |
| @emotion/react / styled | 11.14.0 / 11.14.1 | | vitest | 5.1.1 |
| @mlc-ai/web-llm | 0.2.88 | | eslint | 10.15.0 (+ @eslint/js 10.0.1, react-hooks 7.1.1, react-refresh 0.5.2, globals 17.6.0) |
| tesseract.js | 5.1.1 | | @tesseract.js-data/eng | 1.0.0 (copied to `public/tesseract/` at build) |
| zod | 4.6.7 | | @types/react / react-dom | 19.2.16 / 19.2.3 |
| @vercel/analytics | 1.6.1 | | | |

Removed: `@supabase/supabase-js`, `@vitejs/plugin-basic-ssl` (unused). Playwright was used only for local e2e checks (`--no-save`, not a dependency).

---

## 3. Architecture

```
Browser (everything runs here)
  main.jsx ─ hydrateLocalStore() (IndexedDB "souschef/kv" → memory) ─ App.jsx (no auth)
  Screens (components/*) ── api.js (same function names as before) ── lib/deviceStore.js ── IndexedDB
  Guardrails (code owns every number, rule, source, link, filter):
    lib/guardrails/policy.js      fixed refusals, medical note, blocked methods, English-only, injection checks
    lib/guardrails/recipe.js      zod schema + validation pipeline for AI recipes
    lib/guardrails/foodSafety.js  FDA temperatures, must-cook / never / limit lists
    lib/guardrails/techniques.js  time ranges + doneness cues per technique
    lib/guardrails/plausibility.js banned pairs (bannedPairs.json, owner-editable) + cuisine/dish fit
    lib/guardrails/allergens.js   FDA 9 allergens, "may contain" packaged items, hide-unknown rule
    lib/guardrails/diet.js        vegetarian / vegan / gluten-free / dairy-free (no keto)
    lib/guardrails/nutrition.js   USDA FDC per-serving estimates (lib/data/nutrition.json)
    lib/guardrails/convert.js     one unit system, F/C, grams via FDC weights
    lib/guardrails/scaling.js     party scaling with non-linear seasoning + cook-time flag
    lib/guardrails/filter.js      chat → filter (zod), rule parser, apply, chips
    lib/guardrails/receipt.js     receipt cleanup validation (grounded in OCR lines)
    lib/guardrails/sources.js     source registry, approved hosts, origins, broken-link hiding
    lib/guardrails/safetyText.js  fixed kitchen-safety / risky-method / template text
  AI: lib/llm.js (+ llm.worker.js, WebLLM in a Web Worker), lib/aiTasks.js (filter / recipe / receipt)
  OCR: lib/ocr.js (Tesseract.js, files from /tesseract/ on this site)
  Images: lib/images.js + lib/imageScore.js → /api/image-search
Server (only one small function)
  api/image-search.js  Vercel serverless function: holds image API keys, text query ≤100 chars,
                       per-visitor rate limit, 24 h cache, safe-search params, Unsplash download ping,
                       Pixabay image proxy (no hotlinking). Local preview: Vite dev middleware.
  public/ai-config.json  kill switch for AI recipe generation
```

---

## 4. Deployments

| | Status |
|---|---|
| Vercel (`souschef-hvj5.vercel.app`) | Primary. New `vercel.json` adds security headers (§7). Env vars needed for images: `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY` (server-side only; set in Vercel; not set yet). Supabase env vars are no longer used. **This build is not deployed.** |
| GitHub Pages | Workflow removed (it shipped a blank page). |
| AWS Amplify | No config in repo or history. UNKNOWN / NEEDS CONFIRMATION. |
| CI | New `.github/workflows/ci.yml`: `npm ci`, lint, tests, build, gitleaks secret scan (full history). |

---

## 5. Data layer

- **Supabase: removed completely.** Deleted `supabaseClient.js`, `useSession.js`, `components/AuthPage.jsx`, `supabase/` (schema + seed), root `.env`; `.env` / `.env.*` now gitignored (`.env.example` kept for the image-key names). History still contains the old public publishable key (harmless, but rotate/delete the Supabase project if unused).
- **Device store:** `lib/localStore.js` (IndexedDB, synchronous cache, falls back to localStorage) + `lib/deviceStore.js` tables: pantry, cart, sessions, AI recipes, feedback, reports, kitchen, allergies. `api.js` keeps every exported function name.
- **Clearing browser data erases everything** (stated in Settings and Privacy). Export / Import: `lib/backup.js` (≤5 MB, known keys only, zod per key, all-or-nothing).
- Old per-account localStorage keys (`souschef_routines_<uid>` etc.) are not migrated to the new fixed keys. NEEDS CONFIRMATION if anyone has real data there.
- **Legacy `server/`:** moved out of the repo to `F:\kiro\_archive\souschef-server-2026-11-17` (it was never committed, so deleting it would have been permanent). Delete that folder when you're sure.

---

## 6. On-device AI (WebLLM 0.2.88)

| Setting | Model ID (verified in WebLLM's list) | Real download (MB) | GPU memory (MB) |
|---|---|---|---|
| Off (default) | — | 0 | — |
| Gemma 3 1B | `gemma3-1b-it-q4f16_1-MLC` | **621** (609 model files + 12 engine code) | 711 |
| Qwen2.5 1.5B | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | **899** (887 + 12) | 1,630 |

Your 711 / 1,630 MB figures are GPU memory, not download size; both are recorded above.

- **Pinning / integrity (gap 10):** `scripts/pin-models.mjs` → `lib/modelPins.json`. Model URLs pinned to exact Hugging Face commits (Gemma `0f6103ed63…`, Qwen `9bd564b064…`), WASM libs pinned to `binary-mlc-llm-libs` commit `5b7251f3bd…`. SRI SHA-256 for `mlc-chat-config.json`, the WASM library and tokenizer files, `onFailure: 'error'` (mismatch refuses to load; tested). Weight shards are covered by the pinned commit (HF commits are immutable), **not** individually hashed: WebLLM 0.2.88 has no per-shard integrity option.
- **Shared config:** temperature 0.3, top_p 0.6, per-task `max_tokens` cap (filter 120, recipe/receipt 900), JSON mode, repetition detection while streaming, 60 s timeout, one request at a time (queue), Cancel. Runs in a Web Worker.
- **Device check:** WebGPU + secure context; `shader-f16` required (both models are q4f16); `navigator.deviceMemory ≥ 1.5× GPU need` when the browser reports it. Unsupported options are hidden. Load failure → smaller cached model → Off. The 6 MB WebLLM library is loaded only when a model is used.
- **Downloads:** own dialog (what, MB, why, [Download] [Not now]); cellular/Save-Data warning for the AI model only; one model at a time with an offer to delete the old one; Settings → Downloads lists and deletes.
- **Kill switch (gap 21):** `GET /ai-config.json` on this site, `cache: no-store`, no credentials. `{"recipeGeneration": false, "message": "..."}` turns off AI recipe writing with the message. Privacy: a normal same-site request (IP, user agent), nothing about the user.
- **Versioning (gap 22):** every saved AI recipe stores `ruleVersion` (`guardrails-2026-11-17`) and `modelId`.

---

## 7. Security and privacy

- **Headers (`vercel.json`, production only; not testable with the dev server):** CSP (`default-src 'self'`, images only from Unsplash/Pexels/Pixabay/Wikimedia + data/blob, connect only to self, Open-Meteo, Hugging Face hosts, raw.githubusercontent.com; `frame-ancestors 'none'`; `'wasm-unsafe-eval'` for Tesseract/WebLLM), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera/microphone/geolocation self only). The exact Hugging Face CDN host names used for weight files are NEEDS CONFIRMATION in a production test.
- **Rendering:** plain text only; no `dangerouslySetInnerHTML` / `eval`.
- **Secrets:** none in client or repo; image keys server-side only; gitleaks in CI.
- **Analytics:** Vercel Web Analytics (page visits) is still on; no prompts, pantry, receipts or outputs are logged anywhere.
- **npm audit:** production dependencies **0** findings. Dev tooling: 6 high (vite, vitest, @vitejs/plugin-react via picomatch/fdir/tinyglobby); fixes need a major-version bump (`npm audit fix --force`). FOR REVIEW.
- **Language:** English only; other languages get "I didn't catch that. Try different keywords." (heuristic, `policy.js`).
- **Legal:** disclaimer and Privacy wording are **placeholders pending legal review** before a public launch (gap 19).

### Privacy statements: verification

| Statement on the Privacy page | Verified against |
|---|---|
| Data saved in this browser | `lib/localStore.js`, `lib/deviceStore.js`; no other storage calls |
| App + receipt-scanner files load from this site | `lib/ocr.js` paths `/tesseract/`; `scripts/copy-ocr.mjs` |
| Page analytics = Vercel Web Analytics | `main.jsx` `<Analytics />`; no app data in URLs (history uses state, not paths) |
| Image search sends only cuisine, dish type, ≤3 ingredient names | `lib/imageScore.js buildQuery`, `lib/aiRecipes.js dishFor`; function accepts only `source` + `q` |
| Model files from huggingface.co and raw.githubusercontent.com | `lib/modelPins.json` (page reads the hosts from it) |
| Model processing on device | `lib/llm.js` (WebLLM in a Worker; no network in `generate`) |
| Weather: coordinates rounded to 2 decimals → Open-Meteo | `lib/ambience.js` line 51 `toFixed(2)` |
| Voice may be sent to the browser maker's service | MDN Web Speech API page (sources.json `mdn-speech`); app uses the browser's `SpeechRecognition` |
| Calendar: Google link / .ics file, no allergy or health details | `lib/calendar.js` (title, time, one safety line only) |

---

## 8. What the model may do, and the checks

- **Allowed:** (a) draft new recipes (American, Indian, Mexican, Asian) from pantry + staples, (b) clean receipt lines, (c) turn chat into a filter. Everything else gets fixed text before the model sees it: refusal "I can only help with cooking and recipes. Try different keywords.", medical note "I can't give medical or diet advice. Please ask a professional.", or blocked-method text + source link.
- **Recipe output** must map onto the existing recipe shape; optional fields are stored under `recipe.ai` (cuisine, dish_type, equipment, temp_f, temps, time_min [lo,hi], allergens, nutrition, sources, origin, risky, photo, ruleVersion, modelId) and rendered only when present.
- **Code-owned:** ingredients only from pantry (not past shelf life) + available staples, quantities capped at stock (cross-unit via FDC grams), staple caps per serving, equipment only from My kitchen, brand only from pantry/receipt, every temperature from the FDA table (model temps stripped), every number stripped from model text (code re-adds times), times clamped per technique, must-cook / never / limit lists, banned pairs + cuisine fit, retry once then fallback.
- **Labels:** "AI-generated recipe · check doneness yourself"; origin "AI-generated on this device"; catalog recipes "Inspired by Wikipedia: …" only where a verified dish page exists (11 of 16; `lib/data/origins.json`). TheMealDB not used (terms unclear for a free public app).

---

## 9. Sources (attached by code)

`lib/guardrails/sources.json` (checked 2026-11-17). fsis.usda.gov and cdc.gov returned HTTP 403 to the research fetcher, so the **FDA "Safe Food Handling"** page (same temperature chart) is the cited source; the FSIS entry is marked UNVERIFIED and never shown.

| id | Supports | Status |
|---|---|---|
| fda-safe-handling | 165 / 160 / 145+3 min / 145 fish / 160 eggs / 165 leftovers, 40°F, 2 h (1 h > 90°F), 20 s handwash, marinate in fridge | verified |
| fda-seafood, fda-raw-flour, fda-allergens, fda-bad-bug-book | raw seafood, raw dough, 9 allergens, B. cereus/rice | verified |
| who-natural-toxins, who-botulism | cassava, almonds, kidney beans (12 h soak, 10 min boil); canning / fermented fish | verified |
| nchfp | tested canning / pickling methods | verified (home page only) |
| fdc | nutrition, CC0 1.0 | verified |
| mdn-speech, open-meteo-terms | voice privacy, weather terms | verified |
| fsis-temps | — | UNVERIFIED (403) |

Not verified, so **not shown as numbers:** how many days leftovers keep, nutmeg amounts (enforced only as an app limit, ≤1 tsp per recipe), sous-vide temperatures (no official source found; sous vide is not offered as a technique), yogurt/pickle template temperatures (templates show steps without numbers + NCHFP link).

Image API terms: `docs/research/image-apis.md`, `lib/data/imageSources.json` (Pexels license/terms pages returned 403: partially UNVERIFIED).

---

## 10. Real download sizes (measured in the production build)

| Item | Size | When |
|---|---|---|
| App shell (all JS/CSS except AI engine) | 0.93 MB | first visit |
| Receipt scanner (worker 0.12 + SIMD LSTM core 3.76 + English data 2.82) | **6.7 MB** (dialog says "about 7 MB") | first scan, after the dialog |
| Non-SIMD core fallback | 3.76 MB | only on browsers without WASM SIMD |
| AI engine code (WebLLM lib + worker chunks) | 11.7 MB | only when a model is chosen |
| Gemma 3 1B model files | 609 MB | after the download dialog |
| Qwen2.5 1.5B model files | 887 MB | after the download dialog |

Bundling decision (receipt scanner): **self-hosted** from this site instead of jsDelivr: no extra third-party host for privacy/CSP, cached after first scan, works the same on every deploy. Still asked on first scan.

---

## 11. Feature status

| Feature | Status | Notes |
|---|---|---|
| Device-only data (IndexedDB), no login | Working | e2e: no auth screen, `souschef` IndexedDB |
| Ask Chef → filter → existing tile grid + chips | Working | rules with AI Off; model filter validated |
| Refusals / medical note / blocked methods / non-English | Working | e2e + tests |
| Allergies filter + hidden-unknown note + recipe-page note | Working | e2e: peanuts 16 → 8 tiles |
| AI recipe tiles | Implemented, **not tested with a live model** in this round (headless browser has no WebGPU) | validation pipeline fully unit-tested |
| AI receipt cleanup | Implemented, not tested with a live model | validation unit-tested; rule-based path e2e-tested |
| Receipt OCR download dialog + self-hosted OCR | Working | e2e: dialog "About 7 MB", 4 items read |
| OCR retake prompt | Working (unit-tested) | confidence < 45 or < 2 readable lines |
| Nutrition estimates | Working | catalog differences FOR REVIEW (§13) |
| Sources: markers, collapsed list, approved hosts, broken-link hiding | Working | catalog pages show catalog + FDC sources |
| Images for AI recipes | Implemented | Wikimedia works without keys (e2e: 10 results); Pexels/Pixabay/Unsplash need keys |
| Settings / Downloads / My kitchen / Export / Import / Privacy | Working | e2e |
| Calendar reminders | Implemented | shown on AI recipes with marinate/chill steps |
| Feedback (thumbs, reasons, unsafe hides, export preview) | Implemented | AI recipe pages only |
| Kill switch | Working (unit-tested) | |
| Party-size scaling | Logic implemented + tested (`scaling.js`); the recipe page doesn't yet show a servings stepper, and chat "for 8 people" isn't linked to Events | FOR REVIEW |
| Login screen | "Accounts coming soon" (`LoginPage.jsx`), disabled fields, **Guest access** button | everything runs as guest, on the device |
| Receipt scan | No download dialog; the ~7 MB OCR download is only recorded in Settings → Downloads | camera permission is the only prompt |
| Pantry warnings | From quantity only: out, ≤25% of bought amount, or < 2 meals left. Shelf life is information | `boughtQty` tracked in `api.js` |
| Cart badge | `CartButton.jsx`: count badge + "+N" float on add (Pantry, Events, home) | |
| Tiered AI feed (`lib/aiIdeas.js`, replaces `autoFeed.js`) | **Tier 1:** when the model is ready, one short streamed request lists 12 dish names from the pantry ("Name \| cuisine \| items"); each line becomes a tile as soon as it's written, and its photo is fetched at once. Code checks each line (blocked methods, harmful text, cuisine list, items must be in the pantry, allergies, duplicates). **Tier 2:** opening a tile writes the full recipe (progress % + time left), validated by `validateModelRecipe`; nutrition and safety come from code. **Tier 3:** while idle, full recipes for the next tiles are written in the background; a tap or chat always goes first. Loader: "Increasing bandwidth N%" → "Adding Recipes · N of 12 dishes · Stop". "Browse all N recipes" counts the name tiles | prompt follows the owner's wording ("create … detailed steps, ingredients, techniques and other requirements … follow the guardrails"); `tests/ideas.test.js` |
| Background vs chat | Feed requests are `background`; a chat request stops the running feed request and goes next | `lib/llm.js` `currentRun` |
| Pantry answers (`aiAnswer`) | With the model on, Ask Chef also writes an answer (up to 300 tokens, streamed as it's written) using only pantry items, under "AI answer from your pantry". Code drops sentences with temperatures, "safe", health/diet/allergy words, links. Empty pantry → fixed reply, no model call | `tests/answer.test.js` |
| Phone preview | `npm run dev:phone` → HTTPS (self-signed) on port 5181, so a phone on the same WiFi gets WebGPU | accept the certificate warning once |

### Open recipe dataset + tiered images (this tier: non-profit)
- **On-device AI is switched off** (`lib/features.js` `ON_DEVICE_AI = false`): no AI chips, no model download, no idea feed, Settings hides the AI section. The WebLLM code is kept (reversible); HF/GitHub hosts were removed from `connect-src`.
- **Wikibooks Cookbook (CC BY-SA 4.0)**: `scripts/build-dataset.mjs` (run by hand; raw cache in `../_data/wikibooks`, outside the repo) builds `public/data/recipes-wikibooks.json`: 3,251 recipes, 691 with their own Commons photo, 4.1 MB (1.0 MB gzipped). Build guardrails: blocked methods / harmful text (same checks as model output), drinks/alcohol/canning/curing categories dropped, URLs stripped, sentences with "safe" removed, 2–25 ingredients and 2+ steps.
- **Loading**: nothing loads on first open. `lib/dataset.js` fetches the file once the pantry has items (`api.suggestions`), then matches on the device. Shown: recipes with ≥3 non-staple ingredients and haveAll or ≥50% match, top 150. Names on both sides go through `lib/ingredientName.js` ("green onions" → onion, "potato starch" stays). Pantry warnings still use only the bundled catalog.
- **Recipe page**: ingredients + steps from the dataset (`stepsFromText`, short step titles from the text), nutrition/safety by code, credit "Recipe from Wikibooks Cookbook · CC BY-SA 4.0" and the page address as text in Sources.
- **GUARDRAIL, credits not links** (`sources.js` `NO_OUTBOUND_HOSTS`): recipe and photo providers (Wikibooks, Commons, Allrecipes, Food.com, Instructables, Yummly, Pexels, Pixabay, Unsplash, …) are never linked; only safety/nutrition references open. Photo credit pills are plain text.
- **Images** (`lib/safeImage.js`, used by `DishImage` everywhere): tier 1 the recipe's own image → tier 2 keyless Wikimedia Commons search from the browser (licensed bitmaps only, title must share a word with the dish; partial match = blur + "Approximate image") → tier 3 the local cuisine placeholder. URLs: https, approved hosts only (`upload/thumb.wikimedia.org`, Unsplash, Pexels, Pixabay CDN), no credentials/ports/svg/data:/javascript:. Each image is decoded off-screen and size/shape-checked (96×72 to 8000², aspect 1:3–3:1) before rendering; a render error drops to the next tier. Results cached on the device (600 entries). CSP `img-src`/`connect-src` match; `vite preview` serves the same headers.
- Not imported (terms): Recipe1M+, Yummly-28K. Zenodo/Food.com/RecipeQA not imported yet (RecipeQA `recipes.zip` downloaded to `../_data/recipeqa`, unused). YouTube "how to" links in catalog recipes still open YouTube: FOR REVIEW.
- Tests: `tests/images.test.js` (URL sanitizing, dimensions, secondary filtering, no-link credits).

### Update: recipe count, step enrichment, cleanup (supersedes the lines above where they differ)
- **WebLLM** stays in the repo but nothing reachable from `main.jsx` imports it (`tests/runtime.test.js`). Moved UI to `components/ai/*`, the AI search to `lib/aiSearch.js`, `ai-config.json` to `docs/ai/` (see `docs/ai/README.md`). Removed AI receipt cleanup, AI answers, AI recipes from the catalog, the "My kitchen" setting and feedback export from the running app.
- **Recipe total**: `lib/data/datasetMeta.json` (written by the build) gives the true count before any download; home shows "Browse all N recipes" = 16 + dataset count. Browse all loads every recipe (`api.allRecipes()`), ranks them in one list and pages 60 at a time ("Show more · N left"). Ask Chef searches the full list.
- **Matching**: `lib/match.js` marks a recipe `relevant` only when every non-optional core protein is in the pantry; home rows and dataset suggestions require it, MIN_MATCH 60%.
- **Dataset build (format 2)**: `lib/stepParser.js` normalizes abbreviations, splits one action per step, drops stub / fragmented / action-less recipes and recipes whose title protein isn't in the ingredient list, maps ingredients to steps, keeps prep notes; unicode fractions parsed; "each"/plural unit links skipped. Jerky/biltong/dried meat added to the curing guardrail. Result: 3,074 recipes, 664 with their own photo.
- **Steps at runtime** (`stepsFromText`): prep step with amounts + prep notes; per step "You'll need: …" amounts, "Done when …" from the text, and "Safety: Cook X until … °F" (USDA/FDA via `foodSafety.js`) on the step that finishes each protein. Dataset recipes now show the Safe temperatures section.
- **Outbound links**: recipe/photo credits text only; store buttons, Google Calendar and FDA/USDA references labelled "↗ external", new tab, noopener/noreferrer.
- **CSP**: inline theme script hash in `script-src` (`scripts/csp-hash.mjs` checks it); `/ai-config.json` header removed.
- **Images**: event, pantry and routine pictures use `components/SafeImg.jsx` (same checks as tiles; same-origin paths allowed). Cached image results are re-checked on read.
- **Your data**: export covers `souschef_img_cache` (URLs must pass the allow-list), `souschef_guest`, `souschef_browse`, `souschef_broken_links`; Settings → Erase everything (confirm) clears all `souschef_*` keys in IndexedDB/localStorage/sessionStorage plus the OCR and any WebLLM file caches, then reloads.

### Icon cues (ingredients + cook steps), deterministic, bundled MUI icons only
- `lib/cookCues.js`: `ingredientIcon` (food category by name, specific phrases first: "bell pepper" → vegetable, "black pepper" → spice), `stepCues` (actions in text order, max 3; tools max 2; states: heat level, timer, "done when", internal temperature from the Safety line; step ingredients from step data or by name), `nutritionLine`.
- `lib/guardrails/nutrition.js` `ingredientNutrition`: per-ingredient kcal / protein / carbs / fat for the recipe amount from the local USDA FDC table; statuses `none` (salt, water, to taste), `no-data`, `no-weight`.
- UI: `components/CueIcon.jsx` (+ `cueIconMap.js`). Recipe page ingredient rows: food icon with have/missing badge, one-line nutrition (full sentence as aria-label/title); step outline shows the first two action icons. Cook mode: mise-en-place rows get the icon + kcal; each step shows an "at a glance" row of labelled icon tiles, ingredient chips with amounts, and the temperature as a red-tinted note; the "You'll need" / "Safety:" text lines are shown as these cues instead of repeated. Tests: `tests/cues.test.js`.
- New UI elements (reused styles): cue tiles (accent/surface tints, tile radius), ingredient chips (filter-chip style), food icon circles (existing status-circle size).

### Filters across all recipes + Cuisine filter
- Why only 16 matched before: Time/Protein/Category read `recipeMeta.js` fields that only the 16 bundled recipes have. Dataset recipes now get `categories`, `protein`, `highProtein` in `lib/dataset.js` (from name, dish type and ingredients; high protein = known-USDA lower bound ≥ 25 g/serving), so every filter runs over all 3,090.
- Cuisine: `lib/cuisines.js` `pickCuisine` (build: Wikibooks "X recipes" categories + "Cuisine of …" links, regional names folded, broad labels lose to a country). 1,737 dataset recipes have a cuisine (90 cuisines); 1,353 have none on Wikibooks. Bundled recipes use `CATALOG_CUISINE`. The Cuisine chip's options are built from the recipes being browsed, with counts (`cuisineOptions`).
- Ask Chef: a named cuisine the recipes have ("thai" → Thai), else the region (`regionOf`: Thai → Asian). The filter bar above an answer now narrows the answer too.

### SousChef Lite
- `lib/features.js`: `TIER = 'Lite'`, `PRO = { deliveryCheckout: false, emailReceipts: false }`, `LOCKED_NOTE`.
- Branding: the `Logo` (splash + login) shows a "LITE" pill after the wordmark; aria-label "SousChef Lite, cooking made easy". Tab title and other screens unchanged (pending owner decision).
- Cart: "Checkout — Locked" (disabled, lock icon, "Available in SousChef Pro."); store hand-off links aren't reachable. Add groceries: "Email receipt · Locked"; the email stage can't open.
- Images: no-photo recipes use `public/images/fallback-thumbnail.jpg` (480 px, 30 KB, from `Fallback_thumbnail.png`) instead of the cuisine gradient. Custom events and routine dishes without a picture use the same keyless Commons search (`SafeImg` `search` prop), then the illustration.

### About, Settings, Feedback
- `components/AboutPage.jsx` (Privacy page layout), opened from Settings. `lib/appInfo.js`: `APP_NAME`, `APP_VERSION` (SC_2026_11_V1, bump per deploy), `COPYRIGHT`, `FEEDBACK_FORM`.
- Settings → "SousChef" list: Feedback, Privacy, About (one row each), then Version and © line.
- Feedback: `GoBackButton` is now a header row (Go Back left, Feedback right, page actions before it); recipe hero has Feedback next to the cart. One sheet (`components/Feedback.jsx`, routine-sheet style) mounted in App. Native form: required text (max 2000) + optional 1–5 stars, posted with `fetch` (`mode: 'no-cors'`, no cookies/referrer) to the Google Form `formResponse` with `entry.2069944489` / `entry.1203995073` (`lib/feedback.js`, `tests/feedback.test.js`). The reply can't be read (no CORS), so only network errors show as failures. CSP `connect-src` adds `https://docs.google.com`; no frames allowed.
- Not on: home (has Settings, which has Feedback) and cook mode (keeps the screen focused).

### Excel export, Pro early signup
- Export data → `.xlsx` (`lib/xlsx.js`, no dependency: stored ZIP, inline-string cells, never formulas). Sheets: Pantry, Cart, Routines, Events, Settings, About + hidden "SousChef backup" (exact JSON in column A chunks) that Import reads (`lib/backupExcel.js`; works after Excel re-saves, deflate via `DecompressionStream`). Import still accepts old `.json`. Every import goes through `importData` validation.
- Pro early signup: `components/ProSignup.jsx` (native email form → Google Form `entry.950253853`, same no-cors POST as feedback via `postGoogleForm` in `lib/feedback.js`). "Available in SousChef Pro · Early signup" (primary colour) under Checkout — Locked, under Email receipt · Locked, in Settings (row) and About.
- Settings pills: one `pill` style for button + label so all three are 32 px.

### Deploy
- GitHub `main` → Vercel (production, auto) and AWS Amplify Hosting (connect the repo/branch in the Amplify console once; it then builds on every push).
- `amplify.yml`: Node 22, `npm ci`, `npm run build`, serve `dist`. `customHttp.yml`: same headers as `vercel.json`, generated by `npm run sync-headers` (`tests/deploy.test.js` checks they match). `package.json` engines: Node 22.x.
- `api/image-search.js` only runs on Vercel; the app doesn't call it (AI is off).

### Real-GPU measurements (Intel laptop iGPU, Gemma 3 1B)
- Load from cache ≈ 40 s. First request ≈ 20 s warm-up, then a short reply ≈ 4–5 s.
- Prefill ≈ 14 tokens/s, decode ≈ 3 tokens/s → one detailed recipe ≈ 2–4 min. Hence the 240 s background timeout (chat keeps 60 s) and no retry after a timeout.
- A GPU reset ("external Instance reference no longer exists") now unloads the model and shows an error instead of failing every request.
- Phone speed is not measured yet.

---

## 12. New UI elements (closest existing equivalent used) — FOR REVIEW

| Element | Reused style |
|---|---|
| Settings icon (replaces sign-out icon) on the home top line; text "Saved on this device" | same IconButton / caption |
| Settings and Privacy pages | Routine/Events page header, `surface` cards, filter-chip style for choices, `pillSecondary` buttons |
| Download dialog, delete-old-model dialog, export preview dialog | Routine "Set up" sheet (64 px icon circle, `ctaPrimary`, text Cancel) |
| Allergies filter chip (multi-select menu) | existing filter chip + menu |
| Understood-filter chips with ✕ | active filter-chip style |
| "AI" badge on tiles | home "Suggestion" glass badge (top-left) |
| "Illustrative photo" / "Approximate image" label; photo credit on recipe hero | existing "Photo: …" hero credit pill |
| Fallback tile with dish name | custom-event gradient tile, one gradient per cuisine |
| Source markers (small superscript "1↗"), collapsed "Sources (n)" list | caption text + `surface` list (new: superscript marker) |
| Nutrition block, Safe temperatures, warnings, Kitchen safety section | `surface` card + section heading |
| Thumbs up/down + reason chips | `pillSecondary` (active = accent) |
| "Check before using" + "Still good" | low-stock red reason + the pantry "Edit" pill |
| "Writing a new recipe on this device… Cancel" line | caption + link text |
| Receipt confirm flag ("Check this one") | `Tag` |
| Login "coming soon" screen | previous AuthPage layout, fields disabled, `ctaPrimary` Guest access |
| Cart badge + "+N" float | MUI `Badge` on the existing cart icon, accent color |
| "On-device AI" chips (Off / Gemma / Qwen) under the prompt chips | prompt-chip style |
| Feed loader (progress bar + ETA) | caption + the download progress bar |
| "AI answer from your pantry" text | Ask Chef message text + caption |
| Dish-name tile ("Tap for recipe") and the "Writing ingredients and steps" page | existing tiles + recipe hero, download progress bar |

---

## 13. FOR REVIEW: computed vs typed calories (16 catalog recipes, per serving)

The kcal chip still shows the typed value for catalog recipes (source "SousChef catalog"); the Nutrition block shows the computed estimate (source FDC). Large gaps likely mean the typed values or some ingredient amounts are off (oil/butter counted in full).

| Recipe | Typed | Computed | Diff | Missing |
|---|---|---|---|---|
| garlic-butter-salmon | 410 | 920 | +124% | |
| veggie-omelette | 260 | 460 | +77% | |
| banana-pancakes | 330 | 550 | +67% | |
| shrimp-fried-rice | 520 | 850 | +63% | |
| chicken-fries | 450 | 690 | +53% | |
| bundt-cake | 350 | 490 | +40% | |
| bacon-ham-sandwich | 600 | 770 | +28% | |
| greek-yogurt-berry-bowl | 220 | 280 | +27% | |
| tomato-spinach-pasta | 480 | 600 | +25% | |
| caesar-salad | 350 | 290 | −17% | |
| caesar-wrap | 380 | 440 | +16% | |
| aglio-olio-spaghetti | 550 | 630 | +15% | |
| chickpea-curry | 390 | 340 | −13% | |
| chicken-nuggets | 420 | 470 | +12% | |
| chicken-strips | 500 | 510 | +2% | |
| guacamole | 300 | n/a | — | Cilantro (no FDC weight for a bunch) |

Full table: `docs/research/kcal-report.md`.

---

## 14. Tests, lint, build

- **Vitest:** `tests/guardrails.test.js`, 36 tests, all passing: invalid JSON fallback; chicken 165°F; allergen hidden; unknown hidden with allergy on; equipment not owned; quantities ≤ stock; expired excluded; raw-egg/raw-fish/canning/curing blocked; must-cook list; scaling 8–12; unit conversions; injected instructions in receipt and chat; medical note; pet-food/non-food refused; odd combos; made-up receipt item; invented URL/source dropped; broken link hidden; unsafe/non-food photo rejected; weak photo blurred; corrupted import rejected; model hash mismatch refused; kill switch; non-English; every number has a source.
- **Lint:** 0 errors, 18 warnings. The warnings are pre-existing React Compiler / Fast Refresh patterns (`set-state-in-effect`, `immutability`, `refs`, `only-export-components`), downgraded to warnings so CI fails only on errors; tech debt.
- **Build:** passes (`npm run build`, copies OCR assets first).
- **Local e2e (Playwright, iPhone 13, dark):** checks in §11 passed with no console errors.

---

## 15. Open questions for the owner

1. Image API keys (Pexels, Pixabay, Unsplash): create them and add to Vercel env vars and `.env.local`?
2. Edit `lib/guardrails/bannedPairs.json` (starter list only).
3. Catalog calorie gaps (§13): fix the typed values or the ingredient amounts?
4. Party size: add a servings stepper on the recipe page, and link "for N people" to Events?
5. Keep Vercel Web Analytics in a device-only, privacy-first app?
6. Delete the archived `server/` folder and the old Supabase project?
7. Upgrade Vite/Vitest majors to clear the 6 dev-only audit findings?
8. Legal review of the disclaimer, AI label and Privacy wording before launch.
9. Sous vide and yogurt/pickle temperatures: provide tested sources if you want numbers shown.
10. Test the on-device AI on a real WebGPU phone over HTTPS before committing (generation, receipt cleanup, CSP host names).

## 16. Next steps (priority order)

1. Owner review of this preview; then commit to a branch (not `main`).
2. Add image API keys; test AI recipe tiles + photos on a WebGPU device.
3. Deploy a Vercel preview to verify CSP / headers and the image function in production.
4. Resolve §13 calorie gaps and §12 UI review items.
5. Wire party-size scaling into the recipe page / Events.
6. Upgrade dev tooling majors; clear lint warnings.
