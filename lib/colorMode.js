// Light / dark mode. Follows the device setting until the user picks one;
// the choice is remembered on this device. Sets <html data-theme="…"> so the
// CSS colour tokens in index.css switch everywhere at once.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const KEY = 'souschef_color_mode' // 'light' | 'dark' (absent = follow device)
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null
const systemMode = () => (media?.matches ? 'light' : 'dark')
const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }

export const ColorModeContext = createContext({ mode: 'dark', toggle: () => {} })
export const useColorMode = () => useContext(ColorModeContext)

export function useColorModeState() {
  const [mode, setMode] = useState(() => stored() || systemMode())

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'light' ? '#f6f3ee' : '#0b0d13')
  }, [mode])

  // Track the device setting while the user hasn't chosen.
  useEffect(() => {
    if (!media) return
    const onChange = () => { if (!stored()) setMode(systemMode()) }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const toggle = useCallback(() => setMode(m => {
    const next = m === 'light' ? 'dark' : 'light'
    try { localStorage.setItem(KEY, next) } catch { /* ignore */ }
    return next
  }), [])

  return { mode, toggle }
}
