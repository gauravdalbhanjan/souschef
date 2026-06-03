import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box, Typography, Button, Chip, Tooltip,
  IconButton, Dialog, DialogContent, DialogTitle,
  LinearProgress, useMediaQuery, useTheme,
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
import { C } from '../theme'
import { caesarSteps } from '../cookingData'

const TOTAL_SECS = caesarSteps.reduce((s, st) => s + st.duration, 0)

// ── helpers ────────────────────────────────────────────────────────────────
function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtMin(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')} min` : `${m}:00 min`
}

// Speak text via Web Speech API
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  utt.pitch = 1
  window.speechSynthesis.speak(utt)
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

// ── Step tile ──────────────────────────────────────────────────────────────
function StepTile({ step, isActive, elapsed }) {
  const [infoOpen, setInfoOpen]       = useState(false)
  const [videoOpen, setVideoOpen]     = useState(false)
  const [speaking, setSpeaking]       = useState(false)

  const remaining = Math.max(0, step.duration - (isActive ? elapsed : 0))
  const progress  = isActive ? Math.min(100, (elapsed / step.duration) * 100) : (isActive === false && elapsed >= step.duration ? 100 : 0)
  const done      = !isActive && elapsed >= step.duration

  const handleSpeak = () => {
    const text = step.instructions.map(i => i.text + (i.highlight ? i.highlight + (i.after || '') : '')).join('. ')
    if (speaking) { stopSpeech(); setSpeaking(false); return }
    speak(`Step: ${step.section}. ${text}. Pro tip: ${step.tip}`)
    setSpeaking(true)
    // reset icon when speech ends
    const utt = new SpeechSynthesisUtterance('')
    utt.onend = () => setSpeaking(false)
  }

  return (
    <Box sx={{ mb: '16px' }}>
      {/* Header row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: '8px',
        px: '2px',
      }}>
        {/* Section name + done check */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {done && <CheckCircleIcon sx={{ color: '#66bb6a', fontSize: 18 }} />}
          <Typography sx={{
            color: isActive ? '#fff' : '#aaa',
            fontWeight: isActive ? 700 : 500,
            fontSize: '15px',
          }}>
            {step.section}
          </Typography>
        </Box>

        {/* Action icons + time chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Info */}
          <Tooltip title="How to do this step" arrow>
            <IconButton size="small" onClick={() => setInfoOpen(true)}
              sx={{ color: isActive ? '#ccc' : '#555', p: '4px' }}>
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* YouTube */}
          <Tooltip title="Watch tutorial on YouTube" arrow>
            <IconButton size="small" onClick={() => setVideoOpen(true)}
              sx={{ color: isActive ? '#ccc' : '#555', p: '4px' }}>
              <SmartDisplayIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Speaker */}
          <Tooltip title={speaking ? 'Stop reading' : 'Read instructions aloud'} arrow>
            <IconButton size="small" onClick={handleSpeak}
              sx={{ color: isActive ? (speaking ? C.amber : '#ccc') : '#555', p: '4px' }}>
              {speaking
                ? <StopCircleIcon sx={{ fontSize: 18 }} />
                : <VolumeUpIcon   sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Time chip */}
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
            label={fmtMin(remaining)}
            size="small"
            sx={{
              background: isActive ? C.amberDark : '#333',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              height: 26,
              borderRadius: '13px',
              '& .MuiChip-label': { px: '6px' },
            }}
          />
        </Box>
      </Box>

      {/* Progress bar (active step only) */}
      {isActive && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3, borderRadius: 2, mb: '8px',
            background: '#333',
            '& .MuiLinearProgress-bar': { background: C.amber },
          }}
        />
      )}

      {/* Instruction card */}
      <Box sx={{
        background: isActive ? '#1a3320' : '#1a1a1a',
        borderRadius: '20px',
        p: '14px 16px',
        border: isActive ? '1px solid #2d5a3a' : '1px solid transparent',
        transition: 'all .3s',
      }}>
        {step.instructions.map((ins, ii) => (
          <Box key={ii} sx={{ display: 'flex', gap: '8px', mb: ii < step.instructions.length - 1 ? '10px' : 0 }}>
            <Typography sx={{ color: '#888', fontSize: '14px', mt: '1px', flexShrink: 0 }}>•</Typography>
            <Typography sx={{ color: isActive ? '#e0e0e0' : '#666', fontSize: '14px', lineHeight: 1.6 }}>
              {ins.text}
              {ins.highlight && (
                <Box component="span" sx={{ color: C.amber, fontWeight: 600 }}>{ins.highlight}</Box>
              )}
              {ins.after}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Info Dialog ── */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}
        PaperProps={{ sx: { background: '#1e1e1e', borderRadius: '20px', p: 1, maxWidth: 400, width: '90vw' } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: '16px', pb: 0.5 }}>
          💡 How to: {step.section}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#ccc', fontSize: '14px', lineHeight: 1.65, mb: 2 }}>
            {step.tip}
          </Typography>
          {step.instructions.map((ins, ii) => (
            <Box key={ii} sx={{ display: 'flex', gap: '8px', mb: '8px' }}>
              <Typography sx={{ color: C.amber, fontSize: '14px', flexShrink: 0, fontWeight: 700 }}>{ii + 1}.</Typography>
              <Typography sx={{ color: '#ddd', fontSize: '14px', lineHeight: 1.55 }}>
                {ins.text}{ins.highlight}<Box component="span" sx={{ color: '#aaa' }}>{ins.after}</Box>
              </Typography>
            </Box>
          ))}
          <Button fullWidth onClick={() => setInfoOpen(false)}
            sx={{ mt: 1, background: C.amber, color: '#1a1000', borderRadius: '20px', textTransform: 'none', fontWeight: 700 }}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── YouTube Dialog ── */}
      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)}
        PaperProps={{ sx: { background: '#1e1e1e', borderRadius: '20px', p: 1, maxWidth: 400, width: '90vw' } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: '16px', pb: 0.5 }}>
          ▶ Watch Tutorial
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6, mb: 2 }}>
            Watch a YouTube tutorial for <strong style={{ color: '#fff' }}>{step.section}</strong>.
          </Typography>
          <Button
            fullWidth
            startIcon={<SmartDisplayIcon />}
            onClick={() => { window.open(step.youtubeUrl, '_blank'); setVideoOpen(false) }}
            sx={{
              background: '#ff0000', color: '#fff',
              borderRadius: '20px', textTransform: 'none',
              fontWeight: 700, fontSize: '14px', py: 1,
              '&:hover': { background: '#cc0000' },
            }}
          >
            Open on YouTube
          </Button>
          <Button fullWidth onClick={() => setVideoOpen(false)}
            sx={{ mt: 1, color: '#888', textTransform: 'none', fontSize: '13px' }}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

// ── Main CookingMode component ─────────────────────────────────────────────
export default function CookingMode({ onBack }) {
  const muiTheme  = useTheme()
  const isMobile  = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const [totalElapsed, setTotalElapsed] = useState(0)
  const [running, setRunning]           = useState(true)
  const [currentStep, setCurrentStep]   = useState(0)
  const intervalRef = useRef(null)

  // Build cumulative step end times
  const stepEnds = caesarSteps.reduce((acc, st, i) => {
    acc.push((acc[i - 1] || 0) + st.duration)
    return acc
  }, [])

  // Derived: elapsed time within each step
  const getStepElapsed = (stepIdx) => {
    const start = stepIdx === 0 ? 0 : stepEnds[stepIdx - 1]
    return Math.max(0, totalElapsed - start)
  }

  const activeStep = stepEnds.findIndex(end => totalElapsed < end)
  // -1 means all done
  const allDone = activeStep === -1

  useEffect(() => {
    if (running && !allDone) {
      intervalRef.current = setInterval(() => {
        setTotalElapsed(e => {
          const next = e + 1
          if (next >= TOTAL_SECS) { clearInterval(intervalRef.current); return TOTAL_SECS }
          return next
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, allDone])

  // Jump to next / prev step
  const goToStep = (idx) => {
    if (idx < 0) return
    const target = idx === 0 ? 0 : stepEnds[idx - 1]
    setTotalElapsed(target)
    setCurrentStep(idx)
  }

  const overallProgress = Math.min(100, (totalElapsed / TOTAL_SECS) * 100)

  return (
    <Box sx={{
      width: isMobile ? '100vw' : 648,
      maxWidth: isMobile ? '100vw' : 648,
      mx: 'auto',
      background: '#111',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Hero image ── */}
      <Box sx={{ position: 'relative', height: 220, flexShrink: 0 }}>
        <Box
          component="img"
          src="https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&q=80"
          alt="Caesar Salad"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.1) 65%, transparent 100%)',
        }} />

        {/* Go Back */}
        <Button
          onClick={onBack}
          startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '13px !important' }} />}
          sx={{
            position: 'absolute', top: 14, left: 12,
            background: 'rgba(55,55,55,0.88)',
            color: '#fff', borderRadius: '20px',
            textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
            px: 1.8, py: 0.5, backdropFilter: 'blur(4px)',
            '&:hover': { background: 'rgba(80,80,80,.9)' },
          }}
        >
          Go Back
        </Button>

        {/* Pause/Resume */}
        <Tooltip title={running ? 'Pause timer' : 'Resume timer'} arrow>
          <IconButton
            onClick={() => setRunning(r => !r)}
            sx={{
              position: 'absolute', top: 10, right: 12,
              background: 'rgba(55,55,55,0.88)',
              backdropFilter: 'blur(4px)',
              color: running ? C.amber : '#aaa',
              '&:hover': { background: 'rgba(80,80,80,.9)' },
            }}
          >
            {running
              ? <StopCircleIcon  sx={{ fontSize: 26 }} />
              : <PlayCircleIcon  sx={{ fontSize: 26 }} />}
          </IconButton>
        </Tooltip>

        {/* Name + chips */}
        <Box sx={{ position: 'absolute', bottom: 14, left: 14 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '20px', mb: '6px', textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>
            Caesar Salad
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Chip icon={<Inventory2Icon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="72%" size="small"
              sx={{ background: '#2e7d32', color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<AccessTimeIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="10 mins" size="small"
              sx={{ background: C.amberDark, color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<BoltIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="350 kcal" size="small"
              sx={{ background: '#37474f', color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }} />
          </Box>
        </Box>
      </Box>

      {/* ── Live timer bar ── */}
      <Box sx={{
        px: '16px', pt: '14px', pb: '4px', flexShrink: 0,
        background: '#111',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
          <Typography sx={{ color: '#aaa', fontSize: '12px' }}>
            {allDone ? '🎉 All done!' : `Step ${(activeStep === -1 ? caesarSteps.length : activeStep) + (activeStep === -1 ? 0 : 1)} of ${caesarSteps.length}`}
          </Typography>
          <Typography sx={{ color: C.amber, fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(totalElapsed)} / {fmt(TOTAL_SECS)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 5, borderRadius: 3,
            background: '#2a2a2a',
            '& .MuiLinearProgress-bar': { background: C.amber },
          }}
        />
      </Box>

      {/* ── Description ── */}
      <Box sx={{ px: '16px', pt: '10px', pb: '4px', flexShrink: 0 }}>
        <Typography sx={{ color: '#888', fontSize: '13px', lineHeight: 1.6 }}>
          The makings of a classic: grilled white meat chicken, Parmesan Cheese and seasoned croutons, all atop a blend of romaine and iceberg lettuce.
        </Typography>
      </Box>

      {/* ── Step tiles (scrollable) ── */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        px: '16px',
        pt: '8px',
        pb: '8px',
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { background: '#333', borderRadius: 2 },
      }}>
        {caesarSteps.map((step, idx) => (
          <StepTile
            key={step.id}
            step={step}
            isActive={idx === activeStep}
            elapsed={getStepElapsed(idx)}
          />
        ))}

        {/* All done message */}
        {allDone && (
          <Box sx={{
            textAlign: 'center', py: 4,
            background: '#1a3320', borderRadius: '20px', mt: 2,
          }}>
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>🎉</Typography>
            <Typography sx={{ color: '#66bb6a', fontWeight: 700, fontSize: '18px' }}>
              Caesar Salad is ready!
            </Typography>
            <Typography sx={{ color: '#aaa', fontSize: '13px', mt: 1 }}>
              Bon appétit!
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Bottom: Back / Next step buttons ── */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex',
        gap: '12px',
        px: '16px',
        py: '12px',
        background: 'linear-gradient(to top, #111 70%, transparent)',
      }}>
        <Button
          fullWidth
          onClick={() => goToStep(Math.max(0, (activeStep === -1 ? caesarSteps.length - 1 : activeStep) - 1))}
          disabled={activeStep === 0 || (activeStep === -1 && totalElapsed === 0)}
          sx={{
            background: '#2979ff', color: '#fff',
            borderRadius: '30px', textTransform: 'none',
            fontWeight: 700, fontSize: '15px', py: '12px',
            '&:hover': { background: '#1565c0' },
            '&:disabled': { background: '#333', color: '#555' },
          }}
        >
          Back
        </Button>
        <Button
          fullWidth
          onClick={() => {
            const next = activeStep === -1 ? caesarSteps.length : activeStep + 1
            if (next < caesarSteps.length) goToStep(next)
          }}
          disabled={allDone}
          sx={{
            background: '#2979ff', color: '#fff',
            borderRadius: '30px', textTransform: 'none',
            fontWeight: 700, fontSize: '15px', py: '12px',
            '&:hover': { background: '#1565c0' },
            '&:disabled': { background: '#333', color: '#555' },
          }}
        >
          {allDone ? 'Done ✓' : 'Next'}
        </Button>
      </Box>
    </Box>
  )
}
