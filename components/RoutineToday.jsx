import { useRef, useState, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { T, PAD } from '../theme'
import { todaysRoutines, fmtTime } from '../lib/routines.js'

const CARD_W = 210

// Small round arrow pinned to the strip's edge, over a soft fade.
function Arrow({ side, onClick }) {
  const left = side === 'left'
  return (
    <Box sx={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 44, display: 'flex', alignItems: 'center',
      justifyContent: left ? 'flex-start' : 'flex-end', pointerEvents: 'none',
      background: `linear-gradient(to ${left ? 'right' : 'left'}, rgba(12,14,20,0.85), rgba(12,14,20,0))` }}>
      <Box component="button" type="button" onClick={onClick} aria-label={left ? 'Previous routines' : 'More routines'}
        sx={{ all: 'unset', pointerEvents: 'auto', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)',
          background: 'rgba(var(--ink),0.16)', border: '1px solid rgba(var(--ink),0.25)', backdropFilter: 'blur(8px)',
          '&:focus-visible': { outline: '2px solid var(--accent)' } }}>
        {left ? <ChevronLeftIcon sx={{ fontSize: 20 }} /> : <ChevronRightIcon sx={{ fontSize: 20 }} />}
      </Box>
    </Box>
  )
}

// Home-screen strip: today's routine dishes with a pantry ready/missing status.
// Arrows: only the right one shows at first (when there's more to see); the
// left one appears once the user has moved the strip. Swiping still works.
export default function RoutineToday({ routines, pantry, onOpen }) {
  const today = todaysRoutines(routines, pantry)
  const ref = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, today.length])

  const scrollBy = (dir) => ref.current?.scrollBy({ left: dir * (CARD_W + PAD), behavior: 'smooth' })

  if (!today.length) return null
  return (
    <Box sx={{ px: `${PAD}px`, pb: `${PAD}px` }}>
      <Typography sx={{ color: 'var(--fg)', fontSize: `${T.title}px`, fontWeight: 700, px: '2px', py: `${PAD * 0.75}px` }}>Today's routine</Typography>
      <Box sx={{ position: 'relative' }}>
        <Box ref={ref} onScroll={measure}
          sx={{ display: 'flex', gap: `${PAD}px`, overflowX: 'auto', scrollbarWidth: 'none', scrollSnapType: 'x proximity', '&::-webkit-scrollbar': { display: 'none' } }}>
          {today.map(r => {
            const status = !r.known
              ? { text: 'Not linked', color: 'var(--text-2)' }
              : r.missing.length
                ? { text: `Missing ${r.missing.map(m => m.display).join(', ')}`, color: 'var(--danger)' }
                : { text: 'Ready from pantry', color: 'var(--success)' }
            return (
              <Box key={r.id} component="button" type="button" onClick={() => onOpen(r)}
                aria-label={`${r.dish} at ${fmtTime(r.time)}: ${status.text}`}
                sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0, width: CARD_W, display: 'flex', alignItems: 'center', gap: `${PAD}px`, p: `${PAD}px`,
                  scrollSnapAlign: 'start', borderRadius: '14px', background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.12)',
                  '&:focus-visible': { outline: '2px solid var(--accent)' } }}>
                {r.image
                  ? <Box component="img" src={r.image} alt="" sx={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <Box sx={{ width: 44, height: 44, borderRadius: '10px', flexShrink: 0, background: 'rgba(var(--ink),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestaurantIcon sx={{ color: 'var(--text-3)' }} /></Box>}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dish}</Typography>
                  <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px` }}>{fmtTime(r.time)}</Typography>
                  <Typography sx={{ color: status.color, fontSize: `${T.chip}px`, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.text}</Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
        {canLeft && <Arrow side="left" onClick={() => scrollBy(-1)} />}
        {canRight && <Arrow side="right" onClick={() => scrollBy(1)} />}
      </Box>
    </Box>
  )
}
