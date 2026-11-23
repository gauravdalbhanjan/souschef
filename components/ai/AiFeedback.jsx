// DISABLED IN THE APP (lib/features.js): kept for a future tier, not imported.
// Thumbs up/down for AI recipe pages, moved out of RecipeExtras.jsx.
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import { T, PAD } from '../../theme'
import { pillSecondary } from '../Ambient'
import { FEEDBACK_REASONS, FEEDBACK_NOTE, feedbackFor, setFeedback } from '../../lib/aiRecipes.js'
const sub = { color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5 }

// Thumbs up/down on AI recipe pages only.
export default function AiFeedback({ slug, onHidden, onPhotoReport }) {
  const [fb, setFb] = useState(() => feedbackFor(slug))
  const [asking, setAsking] = useState(false)
  const [reasons, setReasons] = useState([])
  const vote = (v) => {
    if (v === 'down') { setAsking(true); return }
    setFeedback(slug, 'up'); setFb(feedbackFor(slug)); setAsking(false)
  }
  const submitDown = () => {
    setFeedback(slug, 'down', reasons); setFb(feedbackFor(slug)); setAsking(false)
    if (reasons.includes('unsafe')) onHidden?.()
    else if (reasons.includes('photo')) onPhotoReport?.()
  }
  const toggle = (id) => setReasons(r => (r.includes(id) ? r.filter(x => x !== id) : [...r, id]))
  const on = (v) => fb?.vote === v
  const btn = (active) => ({ all: 'unset', ...pillSecondary, cursor: 'pointer', ...(active ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'transparent' } : {}) })
  return (
    <Box sx={{ mt: `${PAD * 3}px` }}>
      <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>How was this recipe?</Typography>
      <Box sx={{ display: 'flex', gap: '8px', mt: `${PAD}px` }}>
        <Box component="button" type="button" aria-pressed={on('up')} onClick={() => vote('up')} sx={btn(on('up'))}><ThumbUpOutlinedIcon sx={{ fontSize: 15 }} /> Good</Box>
        <Box component="button" type="button" aria-pressed={on('down')} onClick={() => vote('down')} sx={btn(on('down'))}><ThumbDownOutlinedIcon sx={{ fontSize: 15 }} /> Not good</Box>
      </Box>
      {asking && (
        <Box sx={{ mt: `${PAD}px` }}>
          <Typography sx={sub}>What went wrong? (optional)</Typography>
          <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', mt: '6px' }}>
            {FEEDBACK_REASONS.map(r => <Box key={r.id} component="button" type="button" aria-pressed={reasons.includes(r.id)} onClick={() => toggle(r.id)} sx={btn(reasons.includes(r.id))}>{r.label}</Box>)}
          </Box>
          <Box component="button" type="button" onClick={submitDown} sx={{ all: 'unset', cursor: 'pointer', display: 'inline-block', mt: `${PAD}px`, color: 'var(--accent-text)', fontWeight: 700, fontSize: `${T.body}px` }}>Send</Box>
        </Box>
      )}
      <Typography sx={{ ...sub, mt: `${PAD}px` }}>{FEEDBACK_NOTE}</Typography>
    </Box>
  )
}
