import { Box, Typography } from '@mui/material'
import { T, PAD } from '../theme'
import { useDishImage, BLUR_PX, FALLBACK_THUMB } from '../lib/safeImage.js'

// Glass badge over a photo (same style as the home "Suggestion" badge).
export function PhotoBadge({ children, sx }) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', height: 22, px: '9px', borderRadius: '11px',
      background: 'rgba(11,15,25,0.45)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      color: '#F8FAFC', fontSize: `${T.chip}px`, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1, ...sx }}>
      {children}
    </Box>
  )
}

// Recipe image, tiered (lib/safeImage.js): the recipe's own image -> an
// approved keyless image search -> the app's fallback illustration (the dish
// name is in the tile caption / page title). URLs are sanitized and images are decoded and
// size-checked before they render; a broken image falls to the next tier.
// Search results that aren't a clear match get a light blur + "approximate image".
export function DishImage({ dish, label = true, sx }) {
  const own = dish.primary?.url || dish.img || dish.photo?.thumb
  const { photo: found, onError } = useDishImage(dish.name ? {
    slug: dish.slug, name: dish.name,
    primary: own ? { url: own, author: dish.primary?.author || dish.photo?.author, license: dish.primary?.license || dish.photo?.license, page: dish.primary?.page } : null,
  } : null)
  const photo = found && { ...found, blurred: found.approximate || (found.tier === 'primary' && dish.photo?.blurred) }
  const src = photo?.url
  if (!src) {
    return (
      <Box component="img" src={FALLBACK_THUMB} alt="" role="img" aria-label={`${dish.name}: no photo yet`} decoding="async"
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'var(--tile)', ...sx }} />
    )
  }
  return (
    <>
      <Box component="img" src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={onError}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s ease', background: 'var(--tile)',
          filter: photo?.blurred ? `blur(${BLUR_PX}px)` : 'none', ...sx }} />
      {label && (photo.tier === 'secondary' || dish.ai) && (
        <Box sx={{ position: 'absolute', left: 6, bottom: 6, maxWidth: 'calc(100% - 12px)', px: '6px', py: '2px', borderRadius: '6px', background: 'rgba(11,15,25,0.6)',
          color: '#F8FAFC', fontSize: '10px', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {photo.blurred ? 'Approximate image' : 'Illustrative photo'}
        </Box>
      )}
    </>
  )
}

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
  const kcal = dish.kcal ? String(dish.kcal).replace(' kcal', '') : null
  const s = stockStyle(dish.match)
  return (
    <Box component="button" type="button" onClick={onClick}
      aria-label={`${dish.ai ? 'AI recipe: ' : ''}${dish.name}, ${dish.idea ? 'tap for recipe' : `${dish.time_mins} minutes`}${kcal ? `, ${kcal} kcal` : ''}, ${s.pct}% of ingredients in your pantry`}
      sx={{
        all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', minWidth: 0, alignSelf: 'start',
        '&:active': { transform: 'scale(0.98)' },
        '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 3, borderRadius: '14px' },
        '@media (hover: hover)': { '&:hover img': { transform: 'scale(1.05)' } },
      }}>
      <Box sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '14px', overflow: 'hidden', background: 'rgba(var(--ink),0.06)' }}>
        <DishImage dish={dish} />
        {dish.ai && <PhotoBadge>AI</PhotoBadge>}
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
        {dish.idea ? 'Tap for recipe' : `${dish.time_mins} min${kcal ? ` · ${kcal} kcal` : ''}`}
        {dish.proteinG != null && <><br />{dish.proteinG}g protein</>}
      </Typography>
    </Box>
  )
}
