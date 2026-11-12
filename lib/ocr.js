// In-browser receipt OCR (Tesseract.js). The engine + English language data
// (~10 MB) download lazily on the first scan, then are cached by the browser.
let workerPromise = null
let progressListener = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('eng', 1, {
        logger: (m) => progressListener?.(m),
      }))
      .catch((err) => { workerPromise = null; throw err })
  }
  return workerPromise
}

// Downscale big phone photos before OCR: faster, no accuracy loss for text.
async function prepareImage(file, maxSide = 1800) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } catch {
    return file // HEIC or unsupported decode: let Tesseract try the raw file
  }
}

// onProgress receives a short human label, e.g. "Reading receipt… 42%".
export async function ocrImage(file, onProgress) {
  progressListener = (m) => {
    if (!onProgress) return
    const pct = typeof m.progress === 'number' ? Math.round(m.progress * 100) : null
    if (m.status === 'recognizing text') onProgress(`Reading receipt… ${pct ?? 0}%`)
    else if (/load|initializ/i.test(m.status)) onProgress('Getting the receipt reader ready (first scan only)…')
  }
  try {
    onProgress?.('Preparing photo…')
    const [worker, image] = await Promise.all([getWorker(), prepareImage(file)])
    const { data } = await worker.recognize(image)
    return data.text || ''
  } finally {
    progressListener = null
  }
}
