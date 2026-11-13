import { Box, Typography } from '@mui/material'
import { T, PAD } from '../theme'

// Pantry capacity: 80–100% green, 30–79% amber, under 30% red.
// Dark text on all three keeps the small badge readable (WCAG AA).
function stockStyle(match) {
  const m = Math.max(0, Math.min(100, Math.round(match || 0)))
  if (m >= 80) return { pct: m, bg: '#22c55e', fg: '#06210f', label: 'Well stocked' }
  if (m >= 30) return { pct: m, bg: '#f59e0b', fg: '#2a1700', label: 'Partly stocked' }
  return { pct: m, bg: '#ef4444', fg: '#1f0606', label: 'Most ingredients missing' }
}

// Top-right % pill + a thin fill bar along the image's bottom edge.
export function StockIndicator({ match, size = 'sm' }) {
  const s = stockStyle(match)
  return (
    <>
      <Box title={s.label} sx={{
        position: 'absolute', top: 6, right: 6, background: s.bg, color: s.fg, borderRadius: '8px',
        px: size === 'sm' ? '5px' : '7px', py: '2px', fontSize: size === 'sm' ? '10px' : `${T.chip}px`, fontWeight: 800, lineHeight: 1.3,
      }}>
        {s.pct}%
      </Box>
      <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(0,0,0,0.28)' }}>
        <Box sx={{ width: `${s.pct}%`, height: '100%', background: s.bg, transition: 'width .4s ease' }} />
      </Box>
    </>
  )
}

// Compact grid card (3 per row on phones): square photo with the pantry
// capacity badge + fill bar, then name and time · kcal / protein underneath.
export default function RecipeCard({ dish, onClick }) {
  const kcal = String(dish.kcal).replace(' kcal', '')
  const s = stockStyle(dish.match)
  return (
    <Box component="button" type="button" onClick={onClick}
      aria-label={`${dish.name}, ${dish.time_mins} minutes, ${kcal} kcal, ${s.pct}% of ingredients in your pantry`}
      sx={{
        all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', minWidth: 0, alignSelf: 'start',
        '&:active': { transform: 'scale(0.98)' },
        '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 3, borderRadius: '14px' },
        '@media (hover: hover)': { '&:hover img': { transform: 'scale(1.05)' } },
      }}>
      <Box sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '14px', overflow: 'hidden', background: 'rgba(var(--ink),0.06)' }}>
        <Box component="img" src={dish.img} alt="" loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s ease' }} />
        <StockIndicator match={dish.match} />
      </Box>
      <Typography sx={{
        color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, lineHeight: 1.25, mt: `${PAD * 0.75}px`,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {dish.name}
      </Typography>
      {/* Two short lines so all three facts fit a third-width column. */}
      <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px`, fontWeight: 600, mt: '2px', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {dish.time_mins} min · {kcal} kcal
        {dish.proteinG != null && <><br />{dish.proteinG}g protein</>}
      </Typography>
    </Box>
  )
}
