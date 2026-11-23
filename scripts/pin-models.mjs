// Pins the on-device models to exact upstream revisions and records SRI hashes
// for the files WebLLM can verify (config, WASM library, tokenizer).
// Weight shards are covered by the pinned Hugging Face commit: files in a commit
// are immutable (Git LFS objects are addressed by their SHA-256).
//
// Usage: node scripts/pin-models.mjs   ->  writes lib/modelPins.json
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { prebuiltAppConfig } from '@mlc-ai/web-llm'

const MODEL_IDS = ['gemma3-1b-it-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC']
const TOKENIZER_FILES = ['tokenizer.json', 'tokenizer_config.json', 'tokenizer.model']

const sri = (buf) => `sha256-${createHash('sha256').update(buf).digest('base64')}`
const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': 'souschef-pin-script' } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}
const json = async (url) => JSON.parse((await get(url)).toString('utf8'))

// The WASM libraries live in github.com/mlc-ai/binary-mlc-llm-libs on "main": pin a commit.
const libCommit = (await json('https://api.github.com/repos/mlc-ai/binary-mlc-llm-libs/commits/main')).sha

const pins = { generated: new Date().toISOString().slice(0, 10), webllm: '0.2.88', libsRepoCommit: libCommit, models: {} }
for (const id of MODEL_IDS) {
  const rec = prebuiltAppConfig.model_list.find(m => m.model_id === id)
  if (!rec) throw new Error(`model id not in prebuiltAppConfig: ${id}`)
  const repo = new URL(rec.model).pathname.replace(/^\/|\/$/g, '') // mlc-ai/<name>
  const info = await json(`https://huggingface.co/api/models/${repo}`)
  const base = `https://huggingface.co/${repo}/resolve/${info.sha}/`
  const config = await get(base + 'mlc-chat-config.json')
  const tokenizer = {}
  for (const f of TOKENIZER_FILES) {
    if (!(info.siblings || []).some(s => s.rfilename === f)) continue
    tokenizer[f] = sri(await get(base + f))
  }
  const libUrl = rec.model_lib.replace('/binary-mlc-llm-libs/main/', `/binary-mlc-llm-libs/${libCommit}/`)
  const wasm = await get(libUrl)
  // Total download size from the repo file list (weights + config + tokenizer) + wasm.
  const tree = await json(`https://huggingface.co/api/models/${repo}/tree/${info.sha}?recursive=1`)
  const repoBytes = tree.filter(f => f.type === 'file').reduce((s, f) => s + (f.lfs?.size ?? f.size ?? 0), 0)
  pins.models[id] = {
    hfRepo: repo, hfCommit: info.sha, model: base, model_lib: libUrl,
    integrity: { config: sri(config), model_lib: sri(wasm), tokenizer, onFailure: 'error' },
    downloadMB: Math.round((repoBytes + wasm.length) / 1e6),
    vramMB: Math.round(rec.vram_required_MB),
    requiredFeatures: rec.required_features || [],
  }
  console.log(id, '->', info.sha.slice(0, 10), `${pins.models[id].downloadMB} MB`, Object.keys(tokenizer).join(','))
}
writeFileSync(new URL('../lib/modelPins.json', import.meta.url), JSON.stringify(pins, null, 2) + '\n')
console.log('wrote lib/modelPins.json, libs commit', libCommit.slice(0, 10))
