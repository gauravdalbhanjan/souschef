// On-device AI (WebLLM 0.2.88, WebGPU, runs in a Web Worker).
//
// • Models: Off (default), Gemma 3 1B, Qwen2.5 1.5B. IDs are verified against
//   WebLLM's prebuilt list at runtime; files are pinned to exact upstream
//   revisions with SRI hashes (lib/modelPins.json, scripts/pin-models.mjs).
// • Shared generation config for every task; one request at a time; 60 s
//   timeout; repetition detection; cancel. Failures fall back to the rules.
// • Kill switch: /ai-config.json on this site can turn AI recipe generation off.
import { useSyncExternalStore } from 'react'
import { localStore, getJSON, setJSON } from './localStore.js'
import pins from './modelPins.json'

const PREF_KEY = 'souschef_llm_model'
const DOWNLOADS_KEY = 'souschef_downloads'
export const OFF = 'off'

// Engine code (WebLLM library + worker chunks), measured in the production build.
export const ENGINE_MB = 12
export const MODELS = [
  { id: 'gemma3-1b-it-q4f16_1-MLC', label: 'Gemma 3 1B', size: 1 },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B', size: 2 },
].map(m => ({ ...m, downloadMB: pins.models[m.id] ? pins.models[m.id].downloadMB + ENGINE_MB : null, vramMB: pins.models[m.id]?.vramMB ?? null, needs: pins.models[m.id]?.requiredFeatures ?? [] }))

export const GEN = { temperature: 0.3, top_p: 0.6 }
export const TIMEOUT_MS = 60_000

// ── State ───────────────────────────────────────────────────────────────────
// status: checking | unsupported | off | needs-download | loading | ready | error
let state = { status: 'checking', modelId: null, pending: null, progress: 0, text: '', error: '', options: [], busy: false, killSwitch: { generation: true, message: '' } }
const listeners = new Set()
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach(l => l()) }
export const getLLMState = () => state
export const useLLM = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, getLLMState, getLLMState)

let engine = null
let webllm = null
const lib = async () => (webllm ||= await import('@mlc-ai/web-llm'))

// Pinned app config: the same prebuilt records, with model/lib URLs pinned to
// exact revisions and SRI hashes for config, WASM library and tokenizer.
async function pinnedConfig() {
  const m = await lib()
  const model_list = MODELS.map(x => {
    const rec = m.prebuiltAppConfig.model_list.find(r => r.model_id === x.id)
    const pin = pins.models[x.id]
    if (!rec || !pin) return null
    return { ...rec, model: pin.model, model_lib: pin.model_lib, integrity: pin.integrity }
  }).filter(Boolean)
  return { model_list, cacheBackend: 'indexeddb' }
}

// ── Capability check ────────────────────────────────────────────────────────
async function capabilities() {
  if (!globalThis.isSecureContext || !navigator.gpu) return null
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return null
    const memMB = navigator.deviceMemory ? navigator.deviceMemory * 1024 : null // Chrome only; capped at 8 GB
    const maxBufMB = adapter.limits?.maxBufferSize ? adapter.limits.maxBufferSize / 1048576 : null
    return { f16: adapter.features.has('shader-f16'), memMB, maxBufMB }
  } catch { return null }
}

const cellular = () => {
  const c = navigator.connection
  return !!c && (c.type === 'cellular' || (c.saveData === true))
}
export const onCellular = cellular

// ── Downloads bookkeeping (what's installed, in MB) ─────────────────────────
export const downloads = () => getJSON(DOWNLOADS_KEY, { models: {}, ocr: null, ocrAsked: null })
const saveDownloads = (d) => setJSON(DOWNLOADS_KEY, d)

// ── Kill switch (remote config on this site; sends nothing about the user) ──
export const parseKillSwitch = (c) => ({ generation: c?.recipeGeneration !== false, message: String(c?.message || '').slice(0, 160) })
export async function checkKillSwitch(fetchImpl = fetch) {
  try {
    const r = await fetchImpl('/ai-config.json', { cache: 'no-store', credentials: 'omit' })
    if (!r.ok) return
    set({ killSwitch: parseKillSwitch(await r.json()) })
  } catch { /* offline: keep the last known setting */ }
}

// Called once at app start.
let started = null
export function initLocalModel() {
  if (started) return started
  started = (async () => {
    checkKillSwitch()
    // No WebLLM import here: the 6 MB library loads only when a model is used.
    // IDs were verified against WebLLM's list when pinned; pinnedConfig()
    // re-verifies them at load time.
    const caps = await capabilities()
    const options = MODELS.map(x => ({
      ...x,
      supported: !!caps && !!pins.models[x.id] && (!x.needs.includes('shader-f16') || caps.f16)
        && (caps.memMB == null || caps.memMB >= x.vramMB * 1.5),
    }))
    if (!options.some(o => o.supported)) { set({ status: 'unsupported', options }); return }
    set({ options })
    const pref = localStore.getItem(PREF_KEY) || OFF
    if (pref === OFF || !options.find(o => o.id === pref && o.supported)) { set({ status: 'off', modelId: null }); return }
    if (await isCached(pref)) await load(pref)
    else set({ status: 'needs-download', pending: pref })
  })()
  return started
}

export async function isCached(id) {
  if (!downloads().models[id]) return false // never downloaded: don't load the library to check
  try { const m = await lib(); return await m.hasModelInCache(id, await pinnedConfig()) } catch { return false }
}

// Setting "On-device AI". Choosing a model that isn't downloaded yet sets
// status 'needs-download'; the UI shows the download dialog, then calls download().
export async function selectModel(id) {
  localStore.setItem(PREF_KEY, id)
  if (id === OFF) { await unload(); set({ status: 'off', modelId: null, pending: null }); return }
  if (await isCached(id)) return load(id)
  set({ status: 'needs-download', pending: id })
}

export async function download(id = state.pending) {
  const ok = await load(id)
  if (ok) {
    const d = downloads()
    d.models[id] = { mb: MODELS.find(m => m.id === id)?.downloadMB, at: new Date().toISOString().slice(0, 10) }
    saveDownloads(d)
  }
  return ok
}

let worker = null
async function load(id) {
  set({ status: 'loading', progress: 0, text: 'Starting on-device AI\u2026', error: '', pending: id })
  try {
    const m = await lib()
    await unload()
    worker = new Worker(new URL('./llm.worker.js', import.meta.url), { type: 'module' })
    engine = await m.CreateWebWorkerMLCEngine(worker, id, {
      appConfig: await pinnedConfig(),
      initProgressCallback: (r) => set({ progress: Math.round((r.progress || 0) * 100), text: 'Loading on-device AI\u2026' }),
    })
    set({ status: 'ready', modelId: id, pending: null, progress: 100, text: '' })
    return true
  } catch (e) {
    await unload()
    const integrity = e?.name === 'IntegrityError' || /integrity/i.test(e?.message || '')
    // Fall back to the smaller model, then Off.
    const smaller = MODELS.filter(x => x.size < (MODELS.find(y => y.id === id)?.size ?? 0) && state.options.find(o => o.id === x.id)?.supported).pop()
    if (!integrity && smaller && await isCached(smaller.id)) { localStore.setItem(PREF_KEY, smaller.id); return load(smaller.id) }
    localStore.setItem(PREF_KEY, OFF)
    set({ status: 'error', modelId: null, error: integrity ? 'The model files didn\u2019t match the expected versions, so they weren\u2019t loaded.' : 'On-device AI couldn\u2019t start on this device.' })
    return false
  }
}

async function unload() {
  try { await engine?.unload() } catch { /* ignore */ }
  try { worker?.terminate() } catch { /* ignore */ }
  engine = null; worker = null
}

export async function deleteModel(id) {
  if (state.modelId === id) { await unload(); localStore.setItem(PREF_KEY, OFF); set({ status: 'off', modelId: null }) }
  try { const m = await lib(); await m.deleteModelAllInfoInCache(id, await pinnedConfig()) } catch { /* ignore */ }
  const d = downloads(); delete d.models[id]; saveDownloads(d)
}

// ── Generation: one at a time, timeout, repetition detection, cancel ────────
let queue = Promise.resolve()
let cancelRequested = false
// Background work (the recipe feed) yields to anything the user asked for:
// a chat request stops the running background request and goes next.
let currentRun = null
export function cancelGeneration() { cancelRequested = true; try { engine?.interruptGenerate() } catch { /* ignore */ } }

// Repeated text (the same 24+ char chunk 3+ times, or a looping tail).
export function isRepeating(s) {
  if (s.length < 80) return false
  const tail = s.slice(-40)
  if (s.slice(0, -40).split(tail).length - 1 >= 2) return true
  const chunk = s.slice(-24)
  return s.split(chunk).length - 1 >= 3
}

// -> string (raw model text). Throws on timeout / repetition / cancel / not ready.
// Some chat templates (Gemma) have no "system" role: fold system text into the
// first user message for every model so all of them behave the same.
function foldSystem(messages) {
  const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
  const rest = messages.filter(m => m.role !== 'system')
  if (!sys) return rest
  const i = rest.findIndex(m => m.role === 'user')
  if (i < 0) return [{ role: 'user', content: sys }, ...rest]
  return rest.map((m, k) => (k === i ? { ...m, content: `${sys}\n\n${m.content}` } : m))
}

// The browser reset the graphics chip (or the engine was torn down). The engine
// can't recover, so stop using it; the user can turn the model on again.
export const isGpuLost = (e) => /external Instance reference|already been disposed|device (was )?lost|GPUDevice.*lost/i.test(String(e?.message || ''))
async function gpuLost() {
  if (!engine) return
  await unload()
  set({ status: 'error', modelId: null, error: 'On-device AI stopped because the graphics chip reset. Turn it on again in Settings.' })
}

// onText(textSoFar) is called as tokens stream in (for live tiles / answers).
export function generate({ messages: rawMessages, maxTokens = 400, json = false, timeoutMs = TIMEOUT_MS, background = false, onText }) {
  const messages = foldSystem(rawMessages)
  if (!background && currentRun?.background) { currentRun.preempted = true; try { engine?.interruptGenerate() } catch { /* ignore */ } }
  const run = async () => {
    if (!engine || state.status !== 'ready') throw new Error('not-ready')
    const me = { background, preempted: false }
    currentRun = me
    cancelRequested = false
    set({ busy: true })
    let out = ''
    let timer
    // Dev builds only: speed numbers (never content).
    const started = performance.now()
    let chunks = 0
    const devLog = (why) => { if (import.meta.env?.DEV) console.debug(`[llm-speed] ${why}: ${chunks} chunks in ${((performance.now() - started) / 1000).toFixed(1)} s`) }
    try {
      const timeout = new Promise((_, rej) => { timer = setTimeout(() => { try { engine.interruptGenerate() } catch { /* ignore */ } devLog('timeout'); rej(new Error('timeout')) }, timeoutMs) })
      const work = (async () => {
        const stream = await engine.chat.completions.create({ messages, ...GEN, max_tokens: maxTokens, stream: true, ...(json ? { response_format: { type: 'json_object' } } : {}) })
        devLog('first-token-ready')
        try {
        for await (const chunk of stream) {
          chunks++
          out += chunk.choices?.[0]?.delta?.content || ''
          if (onText) { try { onText(out) } catch (err) { try { engine.interruptGenerate() } catch { /* ignore */ } throw err } }
          if (cancelRequested) { try { engine.interruptGenerate() } catch { /* ignore */ } throw new Error('cancelled') }
          if (isRepeating(out)) { try { engine.interruptGenerate() } catch { /* ignore */ } throw new Error('repetition') }
          if (me.preempted) throw new Error('preempted')
        }
        if (me.preempted) throw new Error('preempted')
        } catch (e) {
          if (import.meta.env?.DEV) console.debug(`[llm-error] ${e?.name}: ${String(e?.message || e).slice(0, 200)}`)
          throw e
        }
        devLog('done')
        return out
      })()
      try {
        return await Promise.race([work, timeout])
      } catch (e) {
        // A timeout only stops the stream between tokens, so the GPU may still be
        // busy. Wait (up to one more timeout) before the next request can start.
        let workErr = null
        if (e?.message === 'timeout') await Promise.race([work.then(() => {}, err => { workErr = err }), new Promise(r => setTimeout(r, timeoutMs))])
        if (isGpuLost(e) || isGpuLost(workErr)) await gpuLost()
        throw e
      }
    } finally {
      clearTimeout(timer)
      if (currentRun === me) currentRun = null
      try { await engine?.resetChat() } catch { /* ignore */ }
      set({ busy: false })
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => {})
  return p
}

export const aiReady = () => state.status === 'ready' && !!engine
export const generationAllowed = () => aiReady() && state.killSwitch.generation
