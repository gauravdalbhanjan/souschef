// Site and app icons.
//   Favicon + home-screen icons: the cloche from the logo (ClocheIcon in
//   components/SplashScreen.jsx, same shapes) in amber on a dark square.
//   Link preview (og-image): the full wordmark, rendered from the app's Logo.
//   node scripts/make-icons.mjs          (needs: npm run dev, npm i --no-save playwright)
// Writes public/favicon.svg and public/icons/*.png.
import fs from 'node:fs'
import { chromium } from 'playwright'

const AMBER = '#F59E0B', AMBER_DARK = '#D97706', BG = '#0B0F19', BG_TOP = '#182031'
// The cloche, exactly as ClocheIcon draws it (64 x 64 box).
const CLOCHE = (fill) => `<circle cx="32" cy="12" r="6" fill="${fill}"/><path d="M8 42 Q8 18 32 18 Q56 18 56 42" fill="${fill}"/><rect x="6" y="42" width="52" height="5" rx="2.5" fill="${fill}"/>`
// The cloche spans x 6..58, y 6..47: centre (32, 26.5), 52 wide.
function iconSvg({ size = 512, radius = 0, scale = 0.62 }) {
  const s = (size * scale) / 52
  const tx = size / 2 - 32 * s, ty = size / 2 - 26.5 * s
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="22%" r="85%"><stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG}"/></radialGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${AMBER}"/><stop offset="1" stop-color="${AMBER_DARK}"/></linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">${CLOCHE('url(#amber)')}</g>
</svg>`
}

fs.mkdirSync('public/icons', { recursive: true })
// Browser tab: rounded square, the cloche large so it reads at 16 px.
fs.writeFileSync('public/favicon.svg', iconSvg({ size: 64, radius: 14, scale: 0.78 }))

const b = await chromium.launch()
const png = async (file, size, opts) => {
  const p = await (await b.newContext({ viewport: { width: size, height: size } })).newPage()
  await p.setContent(`<html><body style="margin:0;background:transparent">${iconSvg({ size, ...opts })}</body></html>`)
  await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await p.close()
}
// Home-screen icons are full squares: iOS and Android round the corners themselves.
await png('public/icons/apple-touch-icon.png', 180, { scale: 0.62 })
await png('public/icons/icon-192.png', 192, { scale: 0.62 })
await png('public/icons/icon-512.png', 512, { scale: 0.62 })
await png('public/icons/icon-maskable-512.png', 512, { scale: 0.5 }) // inside the round-mask safe zone
await png('public/icons/favicon-32.png', 32, { radius: 7, scale: 0.78 })
await png('public/icons/favicon-16.png', 16, { radius: 3, scale: 0.82 })

// Link preview: the full wordmark from the running app.
const URL_ = process.env.APP_URL || 'http://localhost:5180'
const page = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage()
await page.goto(URL_)
await page.waitForSelector('[role="img"][aria-label^="SousChef"]', { timeout: 15000 })
await page.evaluate(async (bg) => {
  await document.fonts.ready
  const logo = document.querySelector('[role="img"][aria-label^="SousChef"]')
  logo.style.filter = 'none'
  const fade = logo.parentElement
  fade.style.transition = 'none'; fade.style.opacity = '1'
  const splash = fade.parentElement
  splash.style.background = bg; splash.style.backdropFilter = 'none'
  document.getElementById('fluid-bg')?.remove()
  fade.style.transform = `scale(${(1200 * 0.42) / logo.getBoundingClientRect().width})`
}, `radial-gradient(120% 90% at 50% 20%, ${BG_TOP} 0%, ${BG} 70%)`)
await page.waitForTimeout(300)
const og = await page.screenshot()
await page.close()
const p2 = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage()
await p2.setContent(`<html><body style="margin:0"><img src="data:image/png;base64,${og.toString('base64')}" style="width:1200px;height:630px;display:block"></body></html>`)
await p2.screenshot({ path: 'public/icons/og-image.png' })
await b.close()
for (const f of fs.readdirSync('public/icons')) console.log(f, Math.round(fs.statSync(`public/icons/${f}`).size / 1024), 'KB')
