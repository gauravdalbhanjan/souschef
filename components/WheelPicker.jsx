import { useRef, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { C, T } from '../theme'

// iOS alarm-style scroll wheel. Vertical scroll-snap list with a highlighted
// center row; the option under the center band is the selected value.
const ITEM_H = 40
const PAD_ITEMS = 2 // blank rows above/below so ends can reach the center

export default function WheelPicker({ options, value, onChange, width = 88, suffix }) {
  const ref = useRef(null)
  const scrollTimer = useRef(null)
  const idx = Math.max(0, options.findIndex(o => String(o) === String(value)))

  // center the current value on mount / when value changes externally
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = idx * ITEM_H
    if (Math.abs(el.scrollTop - target) > 2) el.scrollTop = target
  }, [idx])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.min(options.length - 1, Math.max(0, i))
      // snap
      el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      if (String(options[clamped]) !== String(value)) onChange(options[clamped])
    }, 90)
  }, [options, value, onChange])

  return (
    <Box sx={{ position: 'relative', width, height: ITEM_H * (PAD_ITEMS * 2 + 1) }}>
      {/* center highlight band */}
      <Box sx={{
        position: 'absolute', left: 0, right: 0, top: ITEM_H * PAD_ITEMS, height: ITEM_H,
        borderTop: `1px solid ${C.amberGlassBorder}`, borderBottom: `1px solid ${C.amberGlassBorder}`,
        background: C.amberGlass, borderRadius: '10px', pointerEvents: 'none', zIndex: 0,
      }} />
      <Box
        ref={ref}
        onScroll={onScroll}
        sx={{
          position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
          // Fade the ends with a mask so it works on any background.
          maskImage: 'linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent)',
          scrollSnapType: 'y mandatory',
          '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        }}
      >
        {Array.from({ length: PAD_ITEMS }).map((_, i) => <Box key={`t${i}`} sx={{ height: ITEM_H }} />)}
        {options.map((opt, i) => (
          <Box
            key={i}
            onClick={() => { ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' }); onChange(opt) }}
            sx={{
              height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
              scrollSnapAlign: 'center', cursor: 'pointer',
              color: i === idx ? '#fff' : 'rgba(var(--ink),0.4)',
              fontWeight: i === idx ? 800 : 500,
              fontSize: i === idx ? `${T.heading}px` : `${T.title}px`,
              transition: 'color .15s, font-size .15s',
            }}
          >
            {opt}{suffix ? <Typography component="span" sx={{ ml: 0.5, fontSize: `${T.sub}px`, color: 'var(--text-2)' }}>{suffix}</Typography> : null}
          </Box>
        ))}
        {Array.from({ length: PAD_ITEMS }).map((_, i) => <Box key={`b${i}`} sx={{ height: ITEM_H }} />)}
      </Box>
    </Box>
  )
}
