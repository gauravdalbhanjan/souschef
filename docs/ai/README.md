# On-device AI (WebLLM): disabled in the app

The WebLLM code is kept in the repo for a future tier but is not imported by
the running app (checked by `tests/runtime.test.js`):

- `lib/llm.js`, `lib/llm.worker.js`, `lib/modelPins.json`, `scripts/pin-models.mjs`
- `lib/aiTasks.js`, `lib/aiIdeas.js`, `lib/aiRecipes.js`, `lib/aiSearch.js`
- image search for AI recipes: `lib/images.js`, `lib/imageScore.js`, `api/image-search.js` (Vercel function, no client calls it)
- UI: `components/ai/*` (AI chips, idea recipe page, feedback, Settings page with the AI section)
- `ai-config.json` (kill switch) lives here, so it isn't served

To turn it back on: move `ai-config.json` to `public/`, restore its no-store
header in `vercel.json`, add the Hugging Face / GitHub model hosts back to
`connect-src`, set `ON_DEVICE_AI = true` in `lib/features.js`, and import the
`components/ai/*` pieces again.
