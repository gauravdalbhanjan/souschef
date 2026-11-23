// Icons for the cue keys from lib/cookCues.js. All icons are bundled MUI
// icons (no network, no images to validate). Every icon carries a text label:
// visible under step cues, and as aria-label / title everywhere.
import { Box, Typography } from '@mui/material'
import Restaurant from '@mui/icons-material/Restaurant'
import { T } from '../theme'
import { CUE_ICONS } from './cueIconMap'


// Tints by meaning, from the existing tokens.
const TONE = {
  action: { bg: 'rgba(var(--accent-rgb),0.16)', fg: 'var(--accent-text)' },
  tool: { bg: 'var(--surface-strong)', fg: 'var(--fg)' },
  state: { bg: 'rgba(var(--ink),0.08)', fg: 'var(--fg)' },
  safety: { bg: 'rgba(239,68,68,0.14)', fg: 'var(--danger)' },
  ingredient: { bg: 'var(--surface-strong)', fg: 'var(--text-2)' },
}

// Round icon only (ingredient rows). label -> aria-label + tooltip.
export function CueIcon({ cue, size = 32, tone = 'ingredient', badge = null }) {
  const Icon = CUE_ICONS[cue?.key] || Restaurant
  const c = TONE[tone] || TONE.ingredient
  return (
    <Box role="img" aria-label={cue?.label || 'Ingredient'} title={cue?.label || 'Ingredient'}
      sx={{ position: 'relative', width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.fg }}>
      <Icon aria-hidden sx={{ fontSize: Math.round(size * 0.56) }} />
      {badge}
    </Box>
  )
}

// Icon + short label underneath (cook steps): the icon is the signal, the
// label keeps it unambiguous. detail -> longer text for screen readers/tooltip.
export function CueTile({ cue, tone = 'action', size = 44 }) {
  const Icon = CUE_ICONS[cue.key] || Restaurant
  const c = TONE[tone] || TONE.action
  return (
    <Box role="img" aria-label={cue.detail || cue.label} title={cue.detail || cue.label}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 72, flexShrink: 0 }}>
      <Box aria-hidden sx={{ width: size, height: size, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.fg }}>
        <Icon sx={{ fontSize: Math.round(size * 0.58) }} />
      </Box>
      <Typography aria-hidden sx={{ color: 'var(--fg)', fontSize: `${T.sub}px`, fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{cue.label}</Typography>
    </Box>
  )
}
