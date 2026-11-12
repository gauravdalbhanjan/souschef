// In-browser receipt OCR (Tesseract.js). The worker + language data load lazily
// the first time a receipt is scanned, so they never slow the initial app load.
let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker('eng'))
  }
  return workerPromise
}

// Downscale big phone photos before OCR: faster, and no accuracy loss for text.
async function prepareImage(file, maxSide = 1800) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } catch {
    return file // fall back to the raw file
  }
}

export async function ocrImage(file) {
  const [worker, image] = await Promise.all([getWorker(), prepareImage(file)])
  const { data } = await worker.recognize(image)
  return data.text || ''
}
