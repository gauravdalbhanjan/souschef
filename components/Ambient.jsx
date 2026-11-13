// Shared pieces for the ambient, assistant-style screens (home + add groceries):
// a borderless dark gradient backdrop, a soft glowing "listening" orb, and the
// conversational prompt bar with mic + send.
import { useRef, useState, useEffect, useCallback } from 'react'
import { Box, InputBase, IconButton, CircularProgress } from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import { T, PAD } from '../theme'
import { useColorMode } from '../lib/colorMode.js'
import { useSky } from '../lib/ambience.js'

export const YELLOW = 'var(--accent)'
export const YELLOW_FG = 'var(--accent-fg)'

// Smooth dark gradient with a faint warm glow from the top.
// Defined per mode in index.css (--canvas), so light/dark both stay ambient.
export const AMBIENT_BG = 'var(--canvas)'

// Sun / moon button that flips light and dark mode.
export function ThemeToggle({ sx }) {
  const { mode, toggle } = useColorMode()
  const light = mode === 'light'
  return (
    <IconButton onClick={toggle} aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'} title={light ? 'Dark mode' : 'Light mode'}
      sx={{ color: 'var(--text-2)', width: 36, height: 36, ...sx }}>
      {light ? <DarkModeOutlinedIcon sx={{ fontSize: 19 }} /> : <LightModeOutlinedIcon sx={{ fontSize: 19 }} />}
    </IconButton>
  )
}

// Sky palettes for the orb glow: [inner rgb, outer rgb].
const GLOW = {
  sun:  { clear: ['255,197,49', '255,140,40'], cloudy: ['200,198,190', '160,166,178'], rain: ['140,180,235', '90,130,200'] },
  moon: { clear: ['205,218,255', '150,170,230'], cloudy: ['185,190,200', '140,146,160'], rain: ['130,170,230', '80,120,190'] },
}
const SUN_CORE = 'radial-gradient(circle at 35% 30%, #fef3c7 0%, #F59E0B 40%, #D97706 78%, #92400E 100%)'
// Pearl moon with a few soft craters layered on top.
const MOON_CORE = [
  'radial-gradient(circle at 62% 36%, rgba(96,104,122,0.32) 0 9%, rgba(96,104,122,0) 11%)',
  'radial-gradient(circle at 38% 62%, rgba(96,104,122,0.26) 0 13%, rgba(96,104,122,0) 15%)',
  'radial-gradient(circle at 70% 68%, rgba(96,104,122,0.24) 0 6%, rgba(96,104,122,0) 8%)',
  'radial-gradient(circle at 30% 36%, rgba(96,104,122,0.2) 0 5%, rgba(96,104,122,0) 7%)',
  'radial-gradient(circle at 52% 82%, rgba(96,104,122,0.18) 0 4%, rgba(96,104,122,0) 6%)',
  'radial-gradient(circle at 35% 30%, #ffffff 0%, #eef0f5 35%, #c8cdd8 75%, #9aa1ae 100%)',
].join(', ')
const DROPS = [[18, 0], [34, 0.5], [52, 0.2], [68, 0.8], [82, 0.35], [44, 1.1], [26, 1.3], [74, 1.5]]

// Glowing orb: a sun by day, a cratered moon by night. The halo follows the
// weather (gold / silver-grey / soft blue + falling drops). Calm when idle,
// brighter and pulsing while listening or thinking.
// Reads the shared sky (time of day + weather) unless props override it, so
// every orb in the app is the same sun or moon.
export function ListeningOrb({ active = false, size = 120, celestial: celestialProp, weather: weatherProp }) {
  const sky = useSky()
  const celestial = celestialProp || sky.celestial
  const weather = weatherProp || sky.weather
  const [inner, outer] = (GLOW[celestial] || GLOW.sun)[weather] || GLOW.sun.clear
  const moon = celestial === 'moon'
  return (
    <Box aria-hidden sx={{ position: 'relative', width: size, height: size, mx: 'auto', pointerEvents: 'none' }}>
      <Box sx={{
        position: 'absolute', inset: -size * 0.35, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${inner},${active ? 0.4 : 0.24}) 0%, rgba(${outer},0.1) 45%, rgba(0,0,0,0) 70%)`,
        filter: 'blur(8px)', transition: 'background .6s',
        animation: active ? 'orbPulse 1.4s ease-in-out infinite' : 'orbBreathe 5s ease-in-out infinite',
      }} />
      <Box sx={{
        position: 'absolute', inset: size * 0.28, borderRadius: '50%',
        background: moon ? MOON_CORE : SUN_CORE,
        boxShadow: `0 0 ${active ? 48 : 28}px rgba(${inner},${active ? 0.75 : 0.45})`,
        opacity: weather === 'cloudy' ? 0.8 : active ? 1 : 0.9, transition: 'box-shadow .4s, opacity .4s',
        animation: active ? 'orbPulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {/* Radial wave while thinking / listening: "I'm working on it". */}
      {active && [0, 0.9].map(d => (
        <Box key={d} sx={{ position: 'absolute', inset: size * 0.28, borderRadius: '50%', border: `2px solid rgba(${inner},0.55)`,
          animation: `orbWave 1.8s ease-out ${d}s infinite` }} />
      ))}
      {weather === 'cloudy' && (
        <Box sx={{ position: 'absolute', left: '18%', right: '8%', top: '56%', height: '22%', borderRadius: '50%',
          background: 'rgba(150,158,172,0.62)', filter: 'blur(6px)', animation: 'orbDrift 9s ease-in-out infinite' }} />
      )}
      {weather === 'rain' && (
        <Box className="orb-rain" sx={{ position: 'absolute', inset: -size * 0.2, overflow: 'hidden', borderRadius: '50%' }}>
          {DROPS.map(([x, delay], i) => (
            <Box key={i} sx={{ position: 'absolute', left: `${x}%`, top: 0, width: '1.5px', height: size * 0.12, borderRadius: '1px',
              background: 'rgba(150,190,240,0.7)', animation: `orbRain 1.6s linear ${delay}s infinite` }} />
          ))}
        </Box>
      )}
      <style>{`
        @keyframes orbBreathe { 0%,100% { transform: scale(0.94); opacity: .8 } 50% { transform: scale(1.04); opacity: 1 } }
        @keyframes orbPulse { 0%,100% { transform: scale(0.92) } 50% { transform: scale(1.08) } }
        @keyframes orbWave { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(2.6); opacity: 0 } }
        @keyframes orbDrift { 0%,100% { transform: translateX(-6%) } 50% { transform: translateX(6%) } }
        @keyframes orbRain { 0% { transform: translateY(-20%); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(${size * 1.4}px); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important } .orb-rain { display: none } }
      `}</style>
    </Box>
  )
}

// Horizontal scroller with round prev/next arrows at the edges, for mouse,
// keyboard and anyone who wouldn't guess there's more off-screen. The left
// arrow appears once moved; the right one hides at the end. Swipe still works.
export function ArrowScroller({ children, label = 'items', step, sx, arrowSize = 30, inset = 4, arrowTop = '50%' }) {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    const el = ref.current
    measure()
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    Array.from(el.children).forEach(c => ro.observe(c))
    return () => ro.disconnect()
  }, [measure, children])
  const go = (dir) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * (step || el.clientWidth * 0.75), behavior: 'smooth' })
  }
  const arrow = (side) => (
    <Box component="button" type="button" onClick={() => go(side === 'left' ? -1 : 1)}
      aria-label={side === 'left' ? `Previous ${label}` : `More ${label}`}
      sx={{ all: 'unset', position: 'absolute', top: arrowTop, [side]: inset, transform: 'translateY(-50%)', zIndex: 2, cursor: 'pointer',
        width: arrowSize, height: arrowSize, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)', color: 'var(--fg)', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', transition: 'transform .15s',
        '&:hover': { transform: 'translateY(-50%) scale(1.08)' },
        '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 2 } }}>
      {side === 'left' ? <ChevronLeftIcon sx={{ fontSize: arrowSize * 0.7 }} /> : <ChevronRightIcon sx={{ fontSize: arrowSize * 0.7 }} />}
    </Box>
  )
  return (
    <Box sx={{ position: 'relative' }}>
      {/* Fade the edge that has an arrow, so content tucks under it cleanly. */}
      <Box ref={ref} onScroll={measure}
        sx={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          ...((edges.left || edges.right) && (() => {
            const fade = arrowSize + inset + 10
            const m = `linear-gradient(to right, ${edges.left ? `transparent 0, #000 ${fade}px` : '#000 0'}, ${edges.right ? `#000 calc(100% - ${fade}px), transparent 100%` : '#000 100%'})`
            return { maskImage: m, WebkitMaskImage: m }
          })()),
          ...sx }}>
        {children}
      </Box>
      {edges.left && arrow('left')}
      {edges.right && arrow('right')}
    </Box>
  )
}

// Pill-shaped prompt bar: text, mic (when supported) and send.
export function PromptBar({ value, onChange, onSubmit, placeholder, label, listening, micSupported, onMic, busy, autoFocus }) {
  const canSend = !!value.trim() && !busy
  return (
    <Box component="form" role="search" onSubmit={e => { e.preventDefault(); if (canSend) onSubmit() }}
      sx={{
        display: 'flex', alignItems: 'center', gap: `${PAD * 0.5}px`, width: '100%',
        pl: `${PAD * 2.25}px`, pr: `${PAD * 0.75}px`, py: `${PAD * 0.75}px`, borderRadius: '30px',
        background: 'var(--surface)', backdropFilter: 'var(--surface-blur)', WebkitBackdropFilter: 'var(--surface-blur)',
        boxShadow: listening
          ? `0 0 0 1.5px ${YELLOW}, 0 0 32px rgba(var(--accent-rgb),0.25)`
          : '0 0 0 1px rgba(var(--ink),0.06), 0 12px 40px rgba(0,0,0,0.35)',
        transition: 'box-shadow .25s',
        '&:focus-within': { boxShadow: `0 0 0 1.5px ${YELLOW}, 0 0 28px rgba(var(--accent-rgb),0.18)` },
      }}>
      <InputBase value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus}
        placeholder={listening ? 'Listening\u2026' : placeholder} fullWidth
        inputProps={{ 'aria-label': label || placeholder, enterKeyHint: 'send', autoComplete: 'off' }}
        sx={{ color: 'var(--fg)', fontSize: `${T.title + 3}px`, fontWeight: 500,
          '& input::placeholder': { color: 'var(--text-2)', opacity: 1 } }} />
      {micSupported && (
        <IconButton onClick={onMic} aria-label={listening ? 'Stop listening' : 'Speak'} aria-pressed={listening}
          sx={{ color: listening ? YELLOW : 'rgba(var(--ink),0.75)', width: 42, height: 42,
            background: listening ? 'rgba(var(--accent-rgb),0.16)' : 'transparent' }}>
          {listening ? <StopIcon /> : <MicIcon />}
        </IconButton>
      )}
      <IconButton type="submit" disabled={!canSend} aria-label="Send"
        sx={{ width: 42, height: 42, background: canSend ? YELLOW : 'rgba(var(--ink),0.08)', color: canSend ? YELLOW_FG : 'rgba(var(--ink),0.35)',
          '&:hover': { background: canSend ? 'var(--accent-strong)' : 'rgba(var(--ink),0.08)' },
          '&.Mui-disabled': { color: 'var(--text-3)', background: 'rgba(var(--ink),0.08)' } }}>
        {busy ? <CircularProgress size={18} sx={{ color: YELLOW_FG }} /> : <ArrowUpwardIcon />}
      </IconButton>
    </Box>
  )
}

// Low-key suggestion pill (prompt chips, secondary options).
export function Pill({ children, onClick, ariaLabel }) {
  return (
    <Box component="button" type="button" onClick={onClick} aria-label={ariaLabel}
      sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        px: `${PAD * 1.5}px`, py: `${PAD * 0.75}px`, borderRadius: '18px', fontSize: `${T.body}px`, fontWeight: 600,
        color: 'rgba(var(--ink),0.8)', background: 'rgba(var(--ink),0.06)',
        '&:hover': { background: 'rgba(var(--ink),0.11)' },
        '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 2 } }}>
      {children}
    </Box>
  )
}

// ── Shared pill buttons (same radius, padding and hover on every screen) ────
const pillBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexShrink: 0,
  height: 32, minHeight: 32, px: '14px', borderRadius: '16px', textTransform: 'none', lineHeight: 1,
  fontSize: `${T.sub}px`, fontWeight: 700, cursor: 'pointer', transition: 'background .15s, transform .15s',
  '&:focus-visible': { outline: '2px solid var(--fg)', outlineOffset: 2 },
  '& .MuiButton-startIcon': { ml: 0, mr: 0 }, // the pill's gap handles icon spacing
}
export const pillPrimary = {
  ...pillBase, background: YELLOW, color: YELLOW_FG,
  '&:hover': { background: 'var(--accent-strong)' },
}
export const pillSecondary = {
  ...pillBase, background: 'var(--surface-strong)', color: 'var(--fg)', border: '1px solid var(--surface-border)',
  '&:hover': { background: 'var(--surface-hover)' },
}
// The one glass surface (theme.css): cards, rows, sheets, bars, back buttons.
export const glassSurface = {
  background: 'var(--surface)', border: '1px solid var(--surface-border)',
  backdropFilter: 'var(--surface-blur)', WebkitBackdropFilter: 'var(--surface-blur)',
}
export const surface = { ...glassSurface, borderRadius: '18px' }

// Global ambient wrapper layer: a soft celestial glow (sun gold / moon
// silver) plus weather diffusion behind every route. Purely decorative.
export function AmbientBackground() {
  const { celestial, weather } = useSky()
  const tint = weather === 'rain' ? '110,160,230' : weather === 'cloudy' ? '160,170,186' : null
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', left: '50%', top: '-18%', width: '130%', aspectRatio: '1 / 0.7', transform: 'translateX(-50%)',
        background: 'radial-gradient(closest-side, rgba(var(--glow),calc(var(--glow-a) * 1.4)), rgba(var(--glow),0))',
        animation: 'ambientBreathe 9s ease-in-out infinite',
        '@keyframes ambientBreathe': { '0%,100%': { opacity: 0.85 }, '50%': { opacity: 1 } } }} />
      {tint && (
        <Box sx={{ position: 'absolute', inset: 0, background: `radial-gradient(80% 50% at 50% 10%, rgba(${tint},0.12), rgba(${tint},0) 70%)` }} />
      )}
      {celestial === 'moon' && (
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 40% at 85% 0%, rgba(190,205,255,0.06), rgba(190,205,255,0) 70%)' }} />
      )}
    </Box>
  )
}
// Modal backdrop: soft blur over the ambient canvas with the same warm glow
// as home, instead of a heavy dark overlay.
export const softBackdrop = {
  backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  background: 'radial-gradient(80% 50% at 50% 22%, rgba(var(--accent-rgb),0.12) 0%, rgba(var(--accent-rgb),0) 70%), color-mix(in srgb, var(--canvas-base) 45%, transparent)',
}

// Status line that gently fades through messages (every 1.5 s by default)
// so long work never looks frozen. `max` holds it at a message until the real
// work gets there, so it never claims a step that hasn't happened yet.
export function CyclingStatus({ messages, interval = 1500, max = messages.length - 1, sx }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= Math.min(max, messages.length - 1)) return
    const t = setTimeout(() => setI(n => n + 1), interval)
    return () => clearTimeout(t)
  }, [i, max, messages.length, interval])
  return (
    <Box role="status" aria-live="polite" sx={{ position: 'relative', ...sx }}>
      <Box key={i} component="span" sx={{ display: 'block', animation: 'statusIn .45s ease both',
        '@keyframes statusIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } }}>
        {messages[Math.min(i, messages.length - 1)]}
      </Box>
    </Box>
  )
}

export const RECEIPT_STEPS = ['Reading your receipt\u2026', 'Matching ingredients to your pantry\u2026', 'Stocking your digital kitchen\u2026']

// Small pill tag ("Suggestion"): crisp secondary text on the glass surface.
export function Tag({ children, sx }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', px: '7px', height: 18, borderRadius: '9px', flexShrink: 0,
      background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', color: 'var(--text-2)',
      fontSize: `${T.chip}px`, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', ...sx }}>
      {children}
    </Box>
  )
}

// ── The one CTA spec: same height, radius, type and colour on every screen
// (home, recipe, cooking, add groceries, routine, events). ─────────────────
export const ctaPrimary = {
  height: 56, minHeight: 56, borderRadius: '28px', px: '24px', gap: '8px',
  textTransform: 'none', fontWeight: 800, fontSize: '16px', lineHeight: 1, letterSpacing: 0,
  // Solid amber, no glow: #1a1100 on #F59E0B is 9:1, on the #D97706 hover 5.9:1 (WCAG AA).
  background: 'var(--accent)', color: 'var(--accent-fg)', boxShadow: 'none',
  '&:hover': { background: 'var(--accent-strong)' },
  '&:focus-visible': { outline: '3px solid var(--fg)', outlineOffset: 2 },
  '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.4)', color: 'var(--accent-fg)', boxShadow: 'none' },
  '& .MuiButton-startIcon, & .MuiButton-endIcon': { m: 0 },
}
export const ctaSecondary = {
  ...ctaPrimary, background: 'var(--surface-strong)', color: 'var(--fg)', border: '1px solid var(--surface-border)', boxShadow: 'none',
  '&:hover': { background: 'var(--surface-hover)' },
  '&:focus-visible': { outline: '3px solid var(--accent)', outlineOffset: 2 },
  '&.Mui-disabled': { background: 'var(--surface)', color: 'var(--text-3)' },
}
