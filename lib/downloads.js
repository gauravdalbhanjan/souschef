// What this device has downloaded for the app (shown in Settings → Downloads).
// Same key and shape as lib/llm.js uses, so nothing here imports the AI code.
import { getJSON, setJSON } from './localStore.js'

export const DOWNLOADS_KEY = 'souschef_downloads'
export const downloads = () => getJSON(DOWNLOADS_KEY, { models: {}, ocr: null, ocrAsked: null })
export const saveDownloads = (d) => setJSON(DOWNLOADS_KEY, d)
