// DISABLED IN THE APP (lib/features.js): kept for a future tier, not imported.
// Tier-2 AI recipe page (write the recipe when a dish-name tile is opened),
// moved out of RecipeDetail.jsx.
import { useState, useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { T, PAD } from '../../theme'
import { ctaPrimary } from '../Ambient'
import { backButtonSx } from '../GoBackButton'
import { DishImage } from '../RecipeCard'
import CartButton from '../CartButton'
import { read } from '../../lib/deviceStore.js'
import { getIdea, writeIdeaRecipe } from '../../lib/aiIdeas.js'
import { aiReady } from '../../lib/llm.js'

// Typical length of a finished recipe as JSON, for the progress estimate.
const EXPECTED_CHARS = 1400

// Tier 2: a dish-name tile was opened. Write the full recipe now (ingredients,
// steps; nutrition and safety come from code), then show it.
export default function IdeaRecipe({ slug, pantryItems, staples, onResolved, onBack, onViewCart }) {
  const [idea] = useState(() => getIdea(slug))
  const [progress, setProgress] = useState({ pct: 0, left: null })
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!idea || !aiReady()) return
    let alive = true
    const t0 = Date.now()
    setFailed(false)
    writeIdeaRecipe(slug, {
      pantry: pantryItems, staples, allergies: read('allergies'),
      onText: (t) => {
        if (!alive) return
        const frac = Math.min(0.97, t.length / EXPECTED_CHARS)
        const el = Date.now() - t0
        setProgress({ pct: Math.round(frac * 100), left: frac > 0.08 ? Math.max(1, Math.round((el / frac - el) / 1000)) : null })
      },
    }).then(res => {
      if (!alive) return
      if (res.ok) onResolved?.(res.slug)
      else setFailed(true)
    })
    return () => { alive = false }
  }, [slug, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const photo = idea?.photo || null
  const left = progress.left == null ? '' : progress.left < 60 ? `about ${progress.left} s left` : `about ${Math.round(progress.left / 60)} min left`
  const msg = !idea ? 'This dish is no longer available.'
    : !aiReady() ? 'Turn on on-device AI to write this recipe.'
    : failed ? 'Chef couldn\u2019t write a recipe for this dish that passed the checks.' : null
  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'relative', height: 230, flexShrink: 0 }}>
        <DishImage dish={{ name: idea?.name, img: photo?.url, photo, cuisine: idea?.cuisine, ai: { cuisine: idea?.cuisine } }} label={false} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,15,25,.92) 0%, rgba(11,15,25,.15) 60%, rgba(11,15,25,.35) 100%)' }} />
        <Button onClick={onBack} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ ...backButtonSx, position: 'absolute', top: PAD * 1.5, left: PAD * 1.5, background: 'rgba(11,15,25,0.5)', borderColor: 'rgba(255,255,255,0.14)', color: '#F8FAFC',
            '&:hover': { background: 'rgba(11,15,25,0.7)' } }}>
          Go Back
        </Button>
        <Box sx={{ position: 'absolute', top: PAD * 1.5, right: PAD * 1.5 }}><CartButton onClick={onViewCart} onPhoto size={40} /></Box>
        <Typography component="h1" sx={{ position: 'absolute', left: PAD * 2, right: PAD * 2, bottom: PAD * 2, color: '#F8FAFC', fontSize: `${T.heading + 2}px`, fontWeight: 800, lineHeight: 1.2 }}>
          {idea?.name || 'Recipe'}
        </Typography>
      </Box>
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 2}px` }}>
        {idea && <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px` }}>{idea.cuisine} · uses {idea.uses.join(', ').toLowerCase()}</Typography>}
        {msg ? (
          <>
            <Typography role="alert" sx={{ color: 'var(--fg)', fontSize: `${T.body + 1}px`, mt: `${PAD * 2}px` }}>{msg}</Typography>
            {failed && <Button onClick={() => setAttempt(n => n + 1)} sx={{ ...ctaPrimary, mt: `${PAD * 2}px` }}>Try again</Button>}
          </>
        ) : (
          <Box role="status" aria-live="polite" sx={{ mt: `${PAD * 2}px` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
              <span>Writing ingredients and steps on this device · {progress.pct}%</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{left}</span>
            </Box>
            <Box sx={{ height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.12)', overflow: 'hidden', mt: '6px' }}>
              <Box sx={{ height: '100%', width: `${Math.max(3, progress.pct)}%`, background: 'var(--accent)', transition: 'width .4s' }} />
            </Box>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: `${PAD}px` }}>Nutrition and food-safety notes are added by the app when it\u2019s done.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
