// In-browser receipt OCR (Tesseract.js 5). The worker, LSTM engine and English
// data are served from this app's own origin (/tesseract/, copied at build by
// scripts/copy-ocr.mjs). They download on the first scan (after the user agrees
// in the download dialog) and are cached by the browser.
let workerPromise = null
let progressListener = null

// Measured download for a first scan (SIMD browsers): worker + core + data.
export const OCR_DOWNLOAD_MB = 7

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/',
        langPath: '/tesseract/',
        gzip: true,
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

// -> { text, confidence (0-100), lines: [string] }
export async function ocrImageDetailed(file, onProgress) {
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
    const text = data.text || ''
    return { text, confidence: Number(data.confidence), lines: text.split(/\r?\n/).map(l => l.trim()).filter(Boolean) }
  } finally {
    progressListener = null
  }
}

export async function ocrImage(file, onProgress) {
  return (await ocrImageDetailed(file, onProgress)).text
}
