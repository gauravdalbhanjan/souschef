// Living home canvas: the hero headline follows the local clock, the orb is a
// sun by day and a cratered moon by night, and its glow follows local weather.
import { useEffect, useState } from 'react'

const WEATHER_CACHE = 'souschef_weather'   // sessionStorage: { at, kind, isDay }
const GEO_DENIED = 'souschef_geo_denied'   // localStorage: don't ask again
const WEATHER_TTL = 30 * 60 * 1000

// Four time blocks on the user's local clock.
export function getTimeContext(date = new Date()) {
  const h = date.getHours()
  if (h >= 5 && h < 10) return { key: 'morning', headline: 'What\u2019s brewing for the morning?' }
  if (h >= 10 && h < 16) return { key: 'afternoon', headline: 'Craving a midday bite?' }
  if (h >= 16 && h < 21) return { key: 'evening', headline: 'What are we cooking tonight?' }
  return { key: 'late', headline: 'Late-night munchies?', sub: 'Let\u2019s see what\u2019s in the pantry.' }
}

// Without weather data, call 6am–7pm "day".
export const isDaytime = (date, weather) => (weather?.isDay != null ? weather.isDay : date.getHours() >= 6 && date.getHours() < 19)

// WMO weather codes (Open-Meteo) -> the three looks we render.
export function weatherKind(code) {
  if (code == null) return 'clear'
  if (code <= 1) return 'clear'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain'
  return 'cloudy' // 2–3 overcast, 45/48 fog, 71–77/85–86 snow
}

function readCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(WEATHER_CACHE) || 'null')
    return c && Date.now() - c.at < WEATHER_TTL ? c : null
  } catch { return null }
}

// One shared request per page load: every orb and the page glow read the
// same result. Coarse location only; coordinates are rounded before they
// leave the device and go to Open-Meteo (free, no key). Denied once = never
// asked again.
let weatherPromise = null
function loadWeather() {
  if (weatherPromise) return weatherPromise
  weatherPromise = new Promise((resolve) => {
    const cached = readCache()
    if (cached) return resolve(cached)
    if (!navigator.geolocation) return resolve(null)
    try { if (localStorage.getItem(GEO_DENIED)) return resolve(null) } catch { /* ignore */ }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const lat = coords.latitude.toFixed(2), lon = coords.longitude.toFixed(2)
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day`)
        if (!res.ok) return resolve(null)
        const { current } = await res.json()
        const w = { at: Date.now(), kind: weatherKind(current?.weather_code), isDay: current?.is_day === 1 }
        try { sessionStorage.setItem(WEATHER_CACHE, JSON.stringify(w)) } catch { /* ignore */ }
        resolve(w)
      } catch { resolve(null) } // offline: stay on time-only ambience
    }, (err) => {
      if (err.code === err.PERMISSION_DENIED) { try { localStorage.setItem(GEO_DENIED, '1') } catch { /* ignore */ } }
      resolve(null)
    }, { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 10000 })
  })
  return weatherPromise
}

function useWeather() {
  const [weather, setWeather] = useState(readCache)
  useEffect(() => {
    let alive = true
    loadWeather().then(w => { if (alive && w) setWeather(w) })
    return () => { alive = false }
  }, [])
  return weather
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// Sun or moon + weather, for any orb. Re-evaluates every minute.
export function useSky() {
  const now = useNow()
  const weather = useWeather()
  return { celestial: isDaytime(now, weather) ? 'sun' : 'moon', weather: weather?.kind || 'clear', now }
}

// Call once at the app root: tags <html data-sky="sun|moon"> so the page
// canvas glow (index.css --glow) turns gold by day and silver by night.
export function useSkyAttribute() {
  const { celestial } = useSky()
  useEffect(() => { document.documentElement.dataset.sky = celestial }, [celestial])
}

// Everything the home hero needs.
export function useAmbience() {
  const { now, ...sky } = useSky()
  return { ...getTimeContext(now), ...sky }
}

// Soft tint behind the hero, per sky.
export function heroTint(celestial, weather) {
  if (weather === 'rain') return 'rgba(110,160,230,0.16)'
  if (weather === 'cloudy') return 'rgba(170,178,192,0.16)'
  return celestial === 'moon' ? 'rgba(190,205,255,0.12)' : 'rgba(255,197,49,0.14)'
}
