import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Button, Chip, Tooltip,
  IconButton, Dialog, DialogContent, DialogTitle,
  LinearProgress, CircularProgress, useMediaQuery, useTheme,
} from '@mui/material'
import ArrowBackIosNewIcon  from '@mui/icons-material/ArrowBackIosNew'
import AccessTimeIcon       from '@mui/icons-material/AccessTime'
import BoltIcon             from '@mui/icons-material/Bolt'
import Inventory2Icon       from '@mui/icons-material/Inventory2'
import VolumeUpIcon         from '@mui/icons-material/VolumeUp'
import StopCircleIcon       from '@mui/icons-material/StopCircle'
import PlayCircleIcon       from '@mui/icons-material/PlayCircle'
import InfoOutlinedIcon     from '@mui/icons-material/InfoOutlined'
import SmartDisplayIcon     from '@mui/icons-material/SmartDisplay'
import CheckCircleIcon      from '@mui/icons-material/CheckCircle'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const fmtMin = (s) => {
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')} min` : `${m}:00 min`
}

function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}
function stopSpeech() { if (window.speechSynthesis) window.speechSynthesis.cancel() }

function youtubeUrl(step) {
  if (step.youtubeUrl) return step.youtubeUrl
  const q = step.youtubeQuery || step.section
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

function StepTile({ step, isActive, elapsed }) {
  const [infoOpen, setInfoOpen]   = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [speaking, setSpeaking]   = useState(false)

  const remaining = Math.max(0, step.duration - (isActive ? elapsed : 0))
  const progress  = isActive ? Math.min(100, (elapsed / step.duration) * 100) : 0
  const done      = !isActive && elapsed >= step.duration

  const handleSpeak = () => {
    if (speaking) { stopSpeech(); setSpeaking(false); return }
    const text = step.instructions.map(i => i.text + (i.highlight || '') + (i.after || '')).join('. ')
    speak(`Step: ${step.section}. ${text}. Tip: ${step.tip || ''}`)
    setSpeaking(true)
  }

  return (
    <Box sx={{ mb: `${PAD * 1.5}px` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: `${PAD}px`, px: '2px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {done && <CheckCircleIcon sx={{ color: '#66d19e', fontSize: 17 }} />}
          <Typography sx={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: isActive ? 700 : 500, fontSize: `${T.title}px` }}>
            {step.section}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
          <Tooltip title="How to do this step" arrow>
            <IconButton size="small" onClick={() => setInfoOpen(true)} sx={{ color: isActive ? '#ccc' : '#555', p: '3px' }}><InfoOutlinedIcon sx={{ fontSize: 17 }} /></IconButton>
          </Tooltip>
          <Tooltip title="Watch tutorial" arrow>
            <IconButton size="small" onClick={() => setVideoOpen(true)} sx={{ color: isActive ? '#ccc' : '#555', p: '3px' }}><SmartDisplayIcon sx={{ fontSize: 17 }} /></IconButton>
          </Tooltip>
          <Tooltip title={speaking ? 'Stop' : 'Read aloud'} arrow>
            <IconButton size="small" onClick={handleSpeak} sx={{ color: isActive ? (speaking ? C.amber : '#ccc') : '#555', p: '3px' }}>
              {speaking ? <StopCircleIcon sx={{ fontSize: 17 }} /> : <VolumeUpIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Tooltip>
          <Chip icon={<AccessTimeIcon sx={{ fontSize: '11px !important', color: '#fff !important', ml: '5px !important' }} />}
            label={fmtMin(remaining)} size="small"
            sx={{ background: isActive ? 'rgba(245,166,35,0.85)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 22, borderRadius: '11px', '& .MuiChip-label': { px: '6px' } }} />
        </Box>
      </Box>

      {isActive && (
        <LinearProgress variant="determinate" value={progress}
          sx={{ height: 3, borderRadius: 2, mb: `${PAD}px`, background: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: C.amber } }} />
      )}

      <Box sx={{ ...(isActive ? glass('green', { radius: 16, blur: 20 }) : glass('neutral', { radius: 16, blur: 14, a: 0.045 })), p: `${PAD * 1.5}px`, transition: 'all .3s' }}>
        {step.instructions.map((ins, ii) => (
          <Box key={ii} sx={{ display: 'flex', gap: `${PAD}px`, mb: ii < step.instructions.length - 1 ? `${PAD * 1.25}px` : 0 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.body}px`, mt: '1px' }}>•</Typography>
            <Typography sx={{ color: isActive ? '#e6e6e6' : 'rgba(255,255,255,0.45)', fontSize: `${T.body}px`, lineHeight: 1.55 }}>
              {ins.text}
              {ins.highlight && <Box component="span" sx={{ color: C.amber, fontWeight: 600 }}>{ins.highlight}</Box>}
              {ins.after}
            </Typography>
          </Box>
        ))}
      </Box>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}
        PaperProps={{ sx: { background: 'rgba(18,22,30,0.85)', backdropFilter: 'blur(30px)', border: `1px solid ${C.glassBorder}`, borderRadius: '20px', p: 1, maxWidth: 400, width: '90vw' } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 2}px` }}>💡 {step.section}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px`, lineHeight: 1.6, mb: 2 }}>{step.tip}</Typography>
          <Button fullWidth onClick={() => setInfoOpen(false)} sx={{ ...glass('amber', { radius: 20, blur: 12, a: 0.32 }), color: '#fff', textTransform: 'none', fontWeight: 700 }}>Got it</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)}
        PaperProps={{ sx: { background: 'rgba(18,22,30,0.85)', backdropFilter: 'blur(30px)', border: `1px solid ${C.glassBorder}`, borderRadius: '20px', p: 1, maxWidth: 400, width: '90vw' } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 2}px` }}>▶ Watch Tutorial</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px`, lineHeight: 1.6, mb: 2 }}>
            Tutorial for <strong style={{ color: '#fff' }}>{step.section}</strong>.
          </Typography>
          <Button fullWidth startIcon={<SmartDisplayIcon />} onClick={() => { window.open(youtubeUrl(step), '_blank'); setVideoOpen(false) }}
            sx={{ background: '#ff0000', color: '#fff', borderRadius: '20px', textTransform: 'none', fontWeight: 700, py: 1, '&:hover': { background: '#cc0000' } }}>
            Open on YouTube
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default function CookingMode({ slug, session, onBack, onFinished }) {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const [recipe, setRecipe]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [finished, setFinished]   = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.recipe(slug).then(r => { if (alive) setRecipe(r) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  const steps = recipe?.steps || []
  const TOTAL_SECS = steps.reduce((s, st) => s + st.duration, 0)
  const stepEnds = steps.reduce((acc, st, i) => { acc.push((acc[i - 1] || 0) + st.duration); return acc }, [])
  const getStepElapsed = (idx) => Math.max(0, totalElapsed - (idx === 0 ? 0 : stepEnds[idx - 1]))
  const activeStep = stepEnds.findIndex(end => totalElapsed < end)
  const allDone = steps.length > 0 && activeStep === -1

  useEffect(() => {
    if (running && !allDone && steps.length) {
      intervalRef.current = setInterval(() => {
        setTotalElapsed(e => (e + 1 >= TOTAL_SECS ? TOTAL_SECS : e + 1))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, allDone, steps.length, TOTAL_SECS])

  const goToStep = (idx) => { if (idx >= 0) setTotalElapsed(idx === 0 ? 0 : stepEnds[idx - 1]) }
  const overallProgress = TOTAL_SECS ? Math.min(100, (totalElapsed / TOTAL_SECS) * 100) : 0

  // Finish -> deplete the pantry via the backend, then notify parent.
  const finishCooking = async () => {
    if (!session?.sessionId) { onFinished?.(); return }
    setFinishing(true)
    try {
      await api.completeCook(session.sessionId)
      setFinished(true)
      onFinished?.()
    } catch (e) {
      console.error('complete failed', e)
    } finally {
      setFinishing(false)
    }
  }

  if (loading || !recipe) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={28} sx={{ color: C.amber }} /></Box>
  }

  return (
    <Box sx={{ width: isMobile ? '100vw' : 648, mx: 'auto', background: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: 200, flexShrink: 0 }}>
        <Box component="img" src={recipe.img} alt={recipe.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.1) 65%, transparent 100%)' }} />
        <Button onClick={onBack} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ position: 'absolute', top: PAD * 1.5, left: PAD * 1.5, ...glass('dark', { radius: 20, blur: 10, a: 0.5 }), color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: `${T.body}px`, px: 1.8, py: 0.5 }}>
          Go Back
        </Button>
        <Tooltip title={running ? 'Pause' : 'Resume'} arrow>
          <IconButton onClick={() => setRunning(r => !r)}
            sx={{ position: 'absolute', top: PAD, right: PAD * 1.5, ...glass('dark', { radius: 40, blur: 10, a: 0.5 }), color: running ? C.amber : '#aaa' }}>
            {running ? <StopCircleIcon sx={{ fontSize: 24 }} /> : <PlayCircleIcon sx={{ fontSize: 24 }} />}
          </IconButton>
        </Tooltip>
        <Box sx={{ position: 'absolute', bottom: PAD * 1.5, left: PAD * 1.5 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, mb: `${PAD * 0.75}px`, textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>{recipe.name}</Typography>
          <Box sx={{ display: 'flex', gap: `${PAD}px`, flexWrap: 'wrap' }}>
            <Chip icon={<Inventory2Icon sx={{ fontSize: '11px !important', color: '#fff !important', ml: '5px !important' }} />} label={`${recipe.match}%`} size="small" sx={{ background: 'rgba(46,158,107,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 22, borderRadius: '11px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<AccessTimeIcon sx={{ fontSize: '11px !important', color: '#fff !important', ml: '5px !important' }} />} label={recipe.time} size="small" sx={{ background: 'rgba(245,166,35,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 22, borderRadius: '11px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<BoltIcon sx={{ fontSize: '11px !important', color: '#fff !important', ml: '5px !important' }} />} label={recipe.kcal} size="small" sx={{ background: 'rgba(55,71,79,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 22, borderRadius: '11px', '& .MuiChip-label': { px: '6px' } }} />
          </Box>
        </Box>
      </Box>

      {/* Timer bar */}
      <Box sx={{ px: `${PAD * 1.5}px`, pt: `${PAD * 1.5}px`, pb: `${PAD / 2}px`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: `${PAD * 0.75}px` }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.sub}px` }}>
            {allDone ? '🎉 All done!' : `Step ${(activeStep === -1 ? steps.length : activeStep + 1)} of ${steps.length}`}
          </Typography>
          <Typography sx={{ color: C.amber, fontWeight: 700, fontSize: `${T.title}px`, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(totalElapsed)} / {fmt(TOTAL_SECS)}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={overallProgress}
          sx={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${C.amber}, #ff5f6d)` } }} />
      </Box>

      {recipe.description && (
        <Box sx={{ px: `${PAD * 1.5}px`, pt: `${PAD * 1.25}px`, pb: `${PAD / 2}px`, flexShrink: 0 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.body}px`, lineHeight: 1.55 }}>{recipe.description}</Typography>
        </Box>
      )}

      {/* Steps */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 1.5}px`, pt: `${PAD}px`, pb: `${PAD}px`, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 2 } }}>
        {steps.map((step, idx) => (
          <StepTile key={idx} step={step} isActive={idx === activeStep} elapsed={getStepElapsed(idx)} />
        ))}

        {allDone && (
          <Box sx={{ textAlign: 'center', py: 4, ...glass('green', { radius: 16, blur: 20 }), mt: 2 }}>
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>🎉</Typography>
            <Typography sx={{ color: '#66d19e', fontWeight: 700, fontSize: `${T.title + 5}px` }}>{recipe.name} is ready!</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, mt: 1 }}>
              {finished ? 'Pantry updated — ingredients deducted.' : 'Tap Done to update your pantry.'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom buttons */}
      <Box sx={{ flexShrink: 0, display: 'flex', gap: `${PAD}px`, px: `${PAD * 1.5}px`, py: `${PAD * 1.5}px`, background: 'linear-gradient(to top, rgba(11,14,20,0.85) 55%, transparent)', backdropFilter: 'blur(6px)' }}>
        <Button fullWidth onClick={() => goToStep(Math.max(0, (activeStep === -1 ? steps.length - 1 : activeStep) - 1))}
          disabled={activeStep === 0 || (activeStep === -1 && totalElapsed === 0)}
          sx={{ ...glass('neutral', { radius: 30, blur: 14, a: 0.08 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(255,255,255,0.16)' }, '&:disabled': { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' } }}>
          Back
        </Button>
        {allDone ? (
          <Button fullWidth onClick={finishCooking} disabled={finishing || finished}
            startIcon={finishing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{ ...glass('green', { radius: 30, blur: 14, a: 0.4 }), color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(46,158,107,0.55)' }, '&:disabled': { color: 'rgba(255,255,255,0.6)' } }}>
            {finished ? 'Pantry updated ✓' : (finishing ? 'Updating…' : 'Done — update pantry')}
          </Button>
        ) : (
          <Button fullWidth onClick={() => { const next = activeStep === -1 ? steps.length : activeStep + 1; if (next < steps.length) goToStep(next) }}
            sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.5)' } }}>
            Next
          </Button>
        )}
      </Box>
    </Box>
  )
}
