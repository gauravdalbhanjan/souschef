// Light / dark mode. Follows the device setting until the user picks one;
// the choice is remembered on this device. Sets <html data-theme="…"> so the
// CSS colour tokens in index.css switch everywhere at once.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { localStore } from './localStore.js'

const KEY = 'souschef_color_mode' // 'light' | 'dark' (absent = follow device)
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null
const systemMode = () => (media?.matches ? 'light' : 'dark')
const stored = () => { try { return localStore.getItem(KEY) } catch { return null } }

export const ColorModeContext = createContext({ mode: 'dark', toggle: () => {} })
export const useColorMode = () => useContext(ColorModeContext)

export function useColorModeState() {
  const [mode, setMode] = useState(() => stored() || systemMode())

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    // Status bar / browser chrome = the app canvas (--canvas-base in theme.css).
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'light' ? '#F1F4F9' : '#0B0F19')
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
    try { localStore.setItem(KEY, next) } catch { /* ignore */ }
    return next
  }), [])

  return { mode, toggle }
}
