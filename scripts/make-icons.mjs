// Renders the site icons from the app's own logo (components/SplashScreen.jsx
// Logo, dark theme) so the icon is exactly the wordmark users see.
// Needs the dev server running (npm run dev) and Playwright (npm i --no-save playwright).
//   node scripts/make-icons.mjs
// Writes public/icons/*.png (16, 32, 180, 192, 512, maskable 512) and og-image.png.
import fs from 'node:fs'
import { chromium } from 'playwright'

const URL_ = process.env.APP_URL || 'http://localhost:5180'
const BG = 'radial-gradient(120% 90% at 50% 20%, #182031 0%, #0b0e14 70%)'
fs.mkdirSync('public/icons', { recursive: true })

const b = await chromium.launch()
// Render the real Logo on the splash screen, fully visible, on the icon background.
async function master(width, height, scaleToWidth) {
  const page = await (await b.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage()
  await page.goto(URL_)
  await page.waitForSelector('[role="img"][aria-label^="SousChef"]', { timeout: 15000 })
  await page.evaluate(async ({ BG, scaleToWidth }) => {
    await document.fonts.ready
    const logo = document.querySelector('[role="img"][aria-label^="SousChef"]')
    logo.style.filter = 'none' // no drop shadow in the icon
    const fade = logo.parentElement // the splash fade wrapper
    fade.style.transition = 'none'; fade.style.opacity = '1'
    const splash = fade.parentElement
    splash.style.background = BG; splash.style.backdropFilter = 'none'
    document.getElementById('fluid-bg')?.remove()
    const w = logo.getBoundingClientRect().width
    fade.style.transform = `scale(${scaleToWidth / w})`
  }, { BG, scaleToWidth })
  await page.waitForTimeout(300)
  const buf = await page.screenshot()
  await page.close()
  return `data:image/png;base64,${buf.toString('base64')}`
}
const square = await master(512, 512, 512 * 0.74)       // wordmark ~74% of the width
const maskable = await master(512, 512, 512 * 0.6)      // inside the round-mask safe zone
const wide = await master(1200, 630, 1200 * 0.42)       // social preview

const out = async (file, src, w, h = w) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage()
  await p.setContent(`<html><body style="margin:0"><img src="${src}" style="width:${w}px;height:${h}px;display:block"></body></html>`)
  await p.waitForTimeout(100)
  await p.screenshot({ path: file })
  await p.close()
}
await out('public/icons/icon-512.png', square, 512)
await out('public/icons/icon-192.png', square, 192)
await out('public/icons/apple-touch-icon.png', square, 180)
await out('public/icons/favicon-32.png', square, 32)
await out('public/icons/favicon-16.png', square, 16)
await out('public/icons/icon-maskable-512.png', maskable, 512)
await out('public/icons/og-image.png', wide, 1200, 630)
await b.close()
for (const f of fs.readdirSync('public/icons')) console.log(f, Math.round(fs.statSync(`public/icons/${f}`).size / 1024), 'KB')
