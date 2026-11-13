// Cooking mode: one calm, continuous feed you can scroll at any time.
//   1. Mise en place: every station task in one checklist (tick as you go,
//      no per-task Done). Ingredients each task uses sit inline under it as
//      [check] [name] [qty] [status / Restock] rows.
//   2. Cooking: all steps in order; the current one is highlighted with its
//      timers and a "Meanwhile" cue. Past steps dim, later ones stay readable.
//   3. Pantry sync at the end.
// The only controls are the bottom tray: Back + one primary action.
// Same script for every recipe (lib/cookChat.js + lib/steps.js).
import { useState, useEffect, useRef, useMemo } from 'react'
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import GridViewIcon from '@mui/icons-material/GridView'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import CloseIcon from '@mui/icons-material/Close'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import { T, PAD } from '../theme'
import { api } from '../api'
import { unitLabel } from '../units'
import { ListeningOrb, ArrowScroller, glassSurface, ctaPrimary, ctaSecondary, YELLOW } from './Ambient'
import { backButtonSx } from './GoBackButton'
import { timersInStep, meanwhileFor, fmtDuration, clock } from '../lib/cookFlow.js'
import { buildScript, itemsIn } from '../lib/cookChat.js'

const READ_KEY = 'souschef_read_aloud'
const plainText = (ins) => (ins.parts ? ins.text : `${ins.text || ''}${ins.highlight || ''}${ins.after || ''}`)

function speak(text) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.97
  window.speechSynthesis.speak(u)
}
const stopSpeech = () => window.speechSynthesis?.cancel()

// Short two-tone chime + buzz when a timer finishes (no audio files needed).
function chime() {
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* ignore */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.22 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.3)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.22); o.stop(ctx.currentTime + i * 0.22 + 0.32)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch { /* ignore */ }
}

// Keep the screen on while cooking (where supported).
function useWakeLock(on) {
  useEffect(() => {
    if (!on || !navigator.wakeLock) return
    let lock = null, alive = true
    const get = () => navigator.wakeLock.request('screen').then(l => { if (alive) lock = l; else l.release() }).catch(() => {})
    get()
    const onVis = () => { if (document.visibilityState === 'visible') get() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); lock?.release?.() }
  }, [on])
}

function StepText({ ins }) {
  return ins.parts
    ? ins.parts.map((p, i) => (p.hl ? <Box key={i} component="span" sx={{ color: 'var(--accent-text)', fontWeight: 700 }}>{p.t}</Box> : <span key={i}>{p.t}</span>))
    : <>{plainText(ins)}</>
}

// Running timer chip (stays visible in the header across steps).
function TimerChip({ t, now, onDismiss }) {
  const left = Math.max(0, (t.endsAt - now) / 1000)
  const done = left <= 0
  const pct = Math.min(100, (1 - left / t.total) * 100)
  return (
    <Box role="timer" aria-label={`Step ${t.stepNo} ${t.label} timer, ${done ? 'done' : `${clock(left)} left`}`}
      sx={{ position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', height: 36, pl: '8px', pr: '4px', borderRadius: '18px',
        background: done ? '#15803D' : 'var(--surface-strong)', border: done ? 'none' : '1px solid var(--surface-border)', color: done ? '#fff' : 'var(--fg)' }}>
      {!done && <Box aria-hidden sx={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${pct}%`, background: YELLOW, transition: 'width .5s linear' }} />}
      <Box aria-hidden sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, background: done ? 'rgba(255,255,255,0.2)' : 'rgba(var(--ink),0.12)' }}>{t.stepNo}</Box>
      <Typography sx={{ fontWeight: 700, fontSize: `${T.body}px`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {t.label} {done ? '\u00b7 done' : clock(left)}
      </Typography>
      <IconButton size="small" onClick={() => onDismiss(t.id)} aria-label={`${done ? 'Dismiss' : 'Cancel'} ${t.label} timer`}
        sx={{ color: 'inherit', width: 28, height: 28 }}><CloseIcon sx={{ fontSize: 15 }} /></IconButton>
    </Box>
  )
}

// [check] -> [name (bold)] -> [qty unit] -> [status]. Restocking lives on the
// recipe page; here it's just what's on the counter.
function IngredientRow({ ing }) {
  const have = ing.have || ing.staple
  const status = ing.staple ? 'Staple' : have ? 'In pantry' : 'Missing'
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, minHeight: 36, py: '2px' }}>
      <Box aria-hidden sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: have ? 'rgba(34,197,94,0.18)' : 'transparent', border: have ? 'none' : '2px solid var(--danger)' }}>
        {have && <CheckIcon sx={{ fontSize: 13, color: 'var(--success)' }} />}
      </Box>
      <Typography sx={{ flex: 1, minWidth: 0, color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body + 1}px`, lineHeight: 1.25 }}>{ing.display}</Typography>
      <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {ing.quantity} {unitLabel(ing.unit)}
      </Typography>
      <Box sx={{ width: 84, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <Typography sx={{ color: have ? 'var(--text-2)' : 'var(--danger)', fontSize: `${T.sub}px`, fontWeight: have ? 600 : 700 }}>{status}</Typography>
      </Box>
    </Box>
  )
}

const sectionTitle = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, lineHeight: 1.2 }
const sectionMeta = { color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600 }
const bodyText = { color: 'var(--fg)', fontSize: `${T.title + 3}px`, lineHeight: 1.5 }

const HOME_DELAY = 3 // seconds on the success state before going home

export default function CookingMode({ slug, session, onBack, onHome, onFinished }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pos, setPos] = useState(null)        // { phase: prep | cook | finish | synced, i }
  const [ticked, setTicked] = useState(() => new Set()) // mise en place tasks checked off
  const [elapsed, setElapsed] = useState(0)   // seconds into the current cooking step
  const [running, setRunning] = useState(false)
  const [timers, setTimers] = useState([])    // { id, label, stepNo, total, endsAt }
  const [now, setNow] = useState(() => Date.now())
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(null)  // { used: [...] } after Update pantry
  const [error, setError] = useState('')
  const [readAloud, setReadAloud] = useState(() => { try { return localStorage.getItem(READ_KEY) === '1' } catch { return false } })
  const stepAlerted = useRef(false)
  const alerted = useRef(new Set())
  const blockRefs = useRef({})

  const script = useMemo(() => buildScript(recipe), [recipe])
  const { prep, steps, ingredients } = script
  const phase = pos?.phase
  const step = phase === 'cook' ? steps[pos.i] : null
  const duration = step?.duration || 0
  const left = Math.max(0, duration - elapsed)
  useWakeLock(!!recipe && phase !== 'synced')

  useEffect(() => {
    let alive = true
    api.recipe(slug).then(r => { if (alive) setRecipe(r) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; stopSpeech() }
  }, [slug])

  // Start on the mise en place (or straight into step 1 if a recipe has none).
  useEffect(() => {
    if (!recipe || pos) return
    queueMicrotask(() => {
      if (prep.length) setPos({ phase: 'prep', i: 0 })
      else { setPos({ phase: 'cook', i: 0 }); setRunning(true) }
    })
  }, [recipe, pos, prep.length])

  // Bring the active block into view and (optionally) read it out.
  const activeKey = !pos ? null : phase === 'prep' ? 'prep' : phase === 'cook' ? `step-${pos.i}` : 'finish'
  useEffect(() => {
    if (!activeKey) return
    blockRefs.current[activeKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!readAloud) return
    if (activeKey === 'prep') speak(`Mise en place. ${prep.map(t => t.text).join(' ')}`)
    else if (activeKey.startsWith('step-')) {
      const i = Number(activeKey.slice(5)), s = steps[i], cue = meanwhileFor(steps, i)
      speak(`Step ${i + 1}. ${s.section}. ${s.instructions.map(x => plainText(x).replace(/[.\s]+$/, '')).join('. ')}.${cue ? ` Meanwhile: ${cue.title}` : ''}`)
    }
  }, [activeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── One clock: the step countdown + every running timer ─────────────────
  useEffect(() => {
    if (phase !== 'cook' && !timers.length) return
    const t = setInterval(() => {
      setNow(Date.now())
      if (running && phase === 'cook') setElapsed(e => Math.min(e + 1, duration))
    }, 1000)
    return () => clearInterval(t)
  }, [running, duration, phase, timers.length])
  useEffect(() => {
    if (duration && left === 0 && !stepAlerted.current) { stepAlerted.current = true; chime() }
  }, [left, duration])
  useEffect(() => {
    const due = timers.filter(t => !alerted.current.has(t.id) && t.endsAt <= now)
    if (!due.length) return
    due.forEach(t => alerted.current.add(t.id))
    chime()
    if (readAloud) speak(`${due.map(t => t.label).join(' and ')} timer is done.`)
  }, [now, timers, readAloud])

  // After "Update pantry & go home": brief success state, then home in 3 s.
  const [homeIn, setHomeIn] = useState(HOME_DELAY)
  useEffect(() => {
    if (phase !== 'synced') return
    const tick = setInterval(() => setHomeIn(s => Math.max(0, s - 1)), 1000)
    const go = setTimeout(() => (onHome || onBack)(), HOME_DELAY * 1000)
    return () => { clearInterval(tick); clearTimeout(go) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const enterStep = (i) => { setPos({ phase: 'cook', i }); setElapsed(0); setRunning(true); stepAlerted.current = false }
  const startTimer = (t, stepNo) => setTimers(ts => (ts.some(x => x.id === t.id) ? ts : [...ts, { id: t.id, label: t.label, stepNo, total: t.secs, endsAt: Date.now() + t.secs * 1000 }]))
  const dismissTimer = (id) => { alerted.current.delete(id); setTimers(ts => ts.filter(t => t.id !== id)) }
  const toggleTask = (i) => setTicked(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })

  const updatePantry = async () => {
    setSyncing(true); setError('')
    try {
      const res = session?.sessionId ? await api.completeCook(session.sessionId) : { depletion: [] }
      setSynced({ used: (res?.depletion || []).filter(d => d.took > 0) })
      setPos({ phase: 'synced', i: 0 })
      setTimers([]); setRunning(false)   // meal is done: clear any leftover timers
      onFinished?.()
    } catch (e) { setError(`Couldn\u2019t update the pantry: ${e.message}. Try again in a moment.`) }
    finally { setSyncing(false) }
  }

  // ── The two tray buttons ──────────────────────────────────────────────────
  const next = () => {
    if (phase === 'prep') { setTicked(new Set(prep.map((_, i) => i))); enterStep(0) }
    else if (phase === 'cook') {
      if (pos.i < steps.length - 1) enterStep(pos.i + 1)
      else { setPos({ phase: 'finish', i: 0 }); setRunning(false) }
    } else if (phase === 'finish') updatePantry()
    else onBack()
  }
  const back = () => {
    if (phase === 'cook' && pos.i > 0) enterStep(pos.i - 1)
    else if (phase === 'cook' && prep.length) { setRunning(false); setPos({ phase: 'prep', i: 0 }) }
    else if (phase === 'finish') enterStep(steps.length - 1)
    else onBack()
  }

  const toggleRead = () => {
    const v = !readAloud
    setReadAloud(v)
    try { localStorage.setItem(READ_KEY, v ? '1' : '0') } catch { /* ignore */ }
    if (!v) stopSpeech()
  }

  if (loading || !recipe || !pos) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={28} sx={{ color: 'var(--accent-text)' }} /></Box>
  }

  const label = phase === 'prep' ? `Mise en place \u00b7 ${ticked.size} of ${prep.length} ready`
    : phase === 'cook' ? `Step ${pos.i + 1} of ${steps.length}`
    : phase === 'finish' ? 'Ready to serve' : 'Pantry updated'
  const timeUp = duration > 0 && left === 0
  const prepFill = phase === 'prep' ? ticked.size / Math.max(1, prep.length) : 1
  const cookTotal = steps.reduce((s, st) => s + (st.duration || 0), 0)

  const nextText = phase === 'prep' ? 'Start cooking'
    : phase === 'cook' ? (pos.i < steps.length - 1 ? 'Next step' : 'Finish')
    : syncing ? 'Updating pantry\u2026' : 'Update pantry & go home'
  const showBack = phase !== 'synced'

  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header: back to recipe · progress · read aloud, then step clock + timers */}
      <Box sx={{ flexShrink: 0, px: `${PAD * 2}px`, pt: `${PAD}px` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
          <Button onClick={onHome || onBack} aria-label="Menu: go to the home page" startIcon={<GridViewIcon sx={{ fontSize: '17px !important' }} />} sx={{ ...backButtonSx, flexShrink: 0 }}>Menu</Button>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.name}</Typography>
            <Typography aria-live="polite" sx={{ color: 'var(--fg)', fontSize: `${T.body + 1}px`, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
          </Box>
          <IconButton onClick={toggleRead} aria-pressed={readAloud} aria-label={readAloud ? 'Stop reading steps aloud' : 'Read steps aloud'}
            sx={{ width: 40, height: 40, flexShrink: 0, color: readAloud ? 'var(--accent-text)' : 'var(--fg)', ...glassSurface }}>
            {readAloud ? <VolumeUpIcon sx={{ fontSize: 20 }} /> : <VolumeOffIcon sx={{ fontSize: 20 }} />}
          </IconButton>
        </Box>

        {/* Progress: one segment for setup, one per cooking step */}
        <Box aria-hidden sx={{ display: 'flex', gap: '4px', mt: `${PAD * 1.25}px` }}>
          {prep.length > 0 && (
            <Box sx={{ flex: 1.2, height: 5, borderRadius: 3, overflow: 'hidden', background: 'rgba(var(--ink),0.12)' }}>
              <Box sx={{ height: '100%', width: `${prepFill * 100}%`, background: 'var(--accent)', transition: 'width .4s' }} />
            </Box>
          )}
          {steps.map((s, i) => {
            const fill = phase === 'prep' ? 0 : phase !== 'cook' || i < pos.i ? 1 : i > pos.i ? 0 : duration ? elapsed / duration : 0
            return (
              <Box key={i} sx={{ flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', background: 'rgba(var(--ink),0.12)' }}>
                <Box sx={{ height: '100%', width: `${fill * 100}%`, background: 'var(--accent)', transition: 'width 1s linear' }} />
              </Box>
            )
          })}
        </Box>

        {(phase === 'cook' || timers.length > 0) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, mt: `${PAD}px`, minWidth: 0 }}>
            {phase === 'cook' && (
              <Box component="button" type="button" onClick={() => setRunning(r => !r)} disabled={timeUp}
                aria-label={timeUp ? 'Step time is up' : running ? `Pause step clock, ${clock(left)} left` : `Resume step clock, ${clock(left)} left`}
                sx={{ all: 'unset', boxSizing: 'border-box', flexShrink: 0, cursor: timeUp ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: 40, pl: '4px', pr: '12px', borderRadius: '20px',
                  background: timeUp ? 'rgba(34,197,94,0.18)' : 'rgba(var(--accent-rgb),0.16)', border: `1.5px solid ${timeUp ? 'rgba(34,197,94,0.6)' : 'rgba(var(--accent-rgb),0.55)'}`,
                  '&:focus-visible': { outline: '2px solid var(--fg)', outlineOffset: 2 } }}>
                <ListeningOrb size={30} active={running && !timeUp} />
                <Typography sx={{ color: timeUp ? 'var(--success)' : 'var(--fg)', fontWeight: 800, fontSize: '18px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {timeUp ? 'Time\u2019s up' : clock(left)}
                </Typography>
                {!timeUp && (running ? <PauseIcon sx={{ fontSize: 18, color: 'var(--fg)' }} /> : <PlayArrowIcon sx={{ fontSize: 18, color: 'var(--fg)' }} />)}
              </Box>
            )}
            {timers.length > 0 && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ArrowScroller label="timers" arrowSize={26} inset={0} sx={{ gap: '6px', py: '2px' }}>
                  {timers.map(t => <TimerChip key={t.id} t={t} now={now} onDismiss={dismissTimer} />)}
                </ArrowScroller>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* The feed: mise en place, then every step, then the finish */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD * 2}px`, pb: `${PAD * 2}px`, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {prep.length > 0 && (
          <Box component="section" ref={el => { blockRefs.current.prep = el }} aria-labelledby="mise-title" sx={{ scrollMarginTop: '8px', mb: `${PAD * 3}px` }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: `${PAD}px`, mb: `${PAD}px` }}>
              <Typography id="mise-title" component="h2" sx={sectionTitle}>Mise en place</Typography>
              <Typography sx={sectionMeta}>{ticked.size} of {prep.length} ready</Typography>
            </Box>
            <Box sx={{ ...glassSurface, borderRadius: '18px', px: `${PAD * 1.5}px`, py: `${PAD * 0.5}px`,
              ...(phase === 'prep' ? { border: '2px solid rgba(var(--accent-rgb),0.7)' } : {}) }}>
              <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {prep.map((t, i) => {
                  const done = ticked.has(i)
                  const items = itemsIn(t.text, ingredients).map(x => ingredients.find(y => y.canonical === x.canonical) || x)
                  return (
                    <Box component="li" key={i} sx={{ py: `${PAD * 1.25}px`, borderBottom: i < prep.length - 1 ? '1px solid rgba(var(--ink),0.08)' : 'none' }}>
                      <Box component="button" type="button" onClick={() => toggleTask(i)} aria-pressed={done}
                        sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'flex-start', gap: `${PAD * 1.25}px`,
                          '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 4, borderRadius: '8px' } }}>
                        <Box aria-hidden sx={{ width: 28, height: 28, mt: '1px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? 'var(--accent)' : 'transparent', border: done ? 'none' : '2px solid rgba(var(--ink),0.3)', transition: 'background .15s' }}>
                          {done && <CheckIcon sx={{ fontSize: 18, color: 'var(--accent-fg)' }} />}
                        </Box>
                        <Typography sx={{ ...bodyText, fontWeight: 600, opacity: done ? 0.6 : 1 }}><StepText ins={t.ins} /></Typography>
                      </Box>
                      {items.length > 0 && (
                        <Box component="ul" aria-label="Ingredients for this task" sx={{ listStyle: 'none', p: 0, m: 0, mt: `${PAD * 0.75}px`, pl: '40px' }}>
                          {items.map(ing => <IngredientRow key={ing.canonical} ing={ing} />)}
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </Box>
        )}

        <Box component="section" aria-labelledby="cook-title">
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: `${PAD}px`, mb: `${PAD}px` }}>
            <Typography id="cook-title" component="h2" sx={sectionTitle}>Cooking</Typography>
            <Typography sx={sectionMeta}>{steps.length} step{steps.length === 1 ? '' : 's'}{cookTotal ? ` \u00b7 about ${fmtDuration(cookTotal)}` : ''}</Typography>
          </Box>
          {steps.map((s, i) => {
            const active = phase === 'cook' && pos.i === i
            const done = phase === 'finish' || phase === 'synced' || (phase === 'cook' && i < pos.i)
            const stepTimers = active ? timersInStep(s, i) : []
            const cue = active ? meanwhileFor(steps, i) : null
            return (
              <Box key={i} ref={el => { blockRefs.current[`step-${i}`] = el }} aria-current={active ? 'step' : undefined}
                sx={{ scrollMarginTop: '8px', mb: `${PAD * 1.25}px`, borderRadius: '18px', px: `${PAD * 1.5}px`, py: `${PAD * 1.5}px`, transition: 'opacity .2s',
                  ...(active ? { background: 'rgba(var(--accent-rgb),0.08)', border: '2px solid rgba(var(--accent-rgb),0.7)' } : { ...glassSurface }),
                  opacity: done ? 0.6 : 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
                  <Box aria-hidden sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800,
                    background: active ? 'var(--accent)' : done ? 'rgba(34,197,94,0.18)' : 'var(--surface-strong)', color: active ? 'var(--accent-fg)' : done ? 'var(--success)' : 'var(--text-2)' }}>
                    {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
                  </Box>
                  <Typography component="h3" sx={{ flex: 1, minWidth: 0, color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 4}px`, lineHeight: 1.25 }}>{s.section}</Typography>
                  {s.duration > 0 && <Typography sx={{ ...sectionMeta, flexShrink: 0 }}>{fmtDuration(s.duration)}</Typography>}
                </Box>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: `${PAD}px`, pl: '38px' }}>
                  {s.instructions.map((ins, k) => (
                    <Box component="li" key={k} sx={{ ...bodyText, fontSize: active ? `${T.title + 3}px` : `${T.body + 2}px`, color: active ? 'var(--fg)' : 'var(--text-2)', mb: `${PAD * 0.75}px`, '&:last-child': { mb: 0 } }}>
                      <StepText ins={ins} />
                    </Box>
                  ))}
                </Box>
                {stepTimers.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: `${PAD * 1.25}px`, pl: '38px' }}>
                    {stepTimers.map(t => {
                      const on = timers.some(x => x.id === t.id)
                      return (
                        <Button key={t.id} onClick={() => startTimer(t, i + 1)} disabled={on} startIcon={on ? <CheckIcon /> : <TimerOutlinedIcon />}
                          sx={{ height: 40, px: '14px', borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: `${T.body + 1}px`, color: 'var(--fg)',
                            background: on ? 'var(--surface)' : 'var(--surface-strong)', border: `1.5px solid ${on ? 'var(--surface-border)' : 'rgba(var(--accent-rgb),0.6)'}`,
                            '&:hover': { background: 'var(--surface-hover)' }, '&.Mui-disabled': { color: 'var(--text-2)' } }}>
                          {on ? `${t.label} timer running` : `Start ${fmtDuration(t.secs)} ${t.label.toLowerCase()} timer`}
                        </Button>
                      )
                    })}
                  </Box>
                )}
                {cue && (
                  <Box sx={{ display: 'flex', gap: `${PAD}px`, mt: `${PAD * 1.5}px`, ml: '38px', p: `${PAD * 1.25}px`, borderRadius: '14px', background: 'var(--surface-strong)' }}>
                    <SyncAltIcon aria-hidden sx={{ fontSize: 18, mt: '3px', color: 'var(--accent-text)', flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ color: 'var(--fg)', fontSize: `${T.body + 2}px`, lineHeight: 1.45, fontWeight: 600 }}>
                        <Box component="span" sx={{ color: 'var(--accent-text)', fontWeight: 800 }}>Meanwhile: </Box>{cue.title}
                      </Typography>
                      {cue.detail && <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, lineHeight: 1.45, mt: '2px' }}>Next up: {cue.detail}</Typography>}
                    </Box>
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>

        {(phase === 'finish' || phase === 'synced') && (
          <Box component="section" ref={el => { blockRefs.current.finish = el }} aria-live="polite"
            sx={{ scrollMarginTop: '8px', mt: `${PAD * 2}px`, borderRadius: '18px', px: `${PAD * 1.5}px`, py: `${PAD * 1.5}px`,
              ...(phase === 'synced' ? { background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.5)' } : { background: 'rgba(var(--accent-rgb),0.08)', border: '2px solid rgba(var(--accent-rgb),0.7)' }) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {phase === 'synced' && <CheckCircleIcon sx={{ color: 'var(--success)', fontSize: 22 }} />}
              <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 4}px`, lineHeight: 1.3 }}>
                {phase === 'finish' ? `Your ${recipe.name} is ready` : synced?.used.length ? 'Pantry capacity refreshed' : 'Pantry checked'}
              </Typography>
            </Box>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 2}px`, lineHeight: 1.5, mt: '6px' }}>
              {phase === 'finish'
                ? 'We\u2019ll take what you used off your inventory, then head home.'
                : synced?.used.length
                  ? `Used items deducted: ${synced.used.map(d => `${+d.took.toFixed(2)} ${unitLabel(d.unit)} ${d.canonical.replace(/_/g, ' ')}`).join(', ')}.`
                  : 'None of these ingredients were in your pantry, so your stock is unchanged.'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom tray: Back + one primary action. Nothing else. */}
      <Box sx={{ flexShrink: 0, px: `${PAD * 2}px`, pt: `${PAD}px`, pb: `calc(${PAD * 1.5}px + env(safe-area-inset-bottom, 0px))`, borderTop: '1px solid var(--surface-border)', background: 'var(--bar)', backdropFilter: 'var(--surface-blur)' }}>
        {error && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, mb: `${PAD}px`, textAlign: 'center' }}>{error}</Typography>}
        {phase === 'synced' ? (
          // Success state: no button, just a short countdown home.
          <Box role="status" aria-live="polite" sx={{ height: 56, borderRadius: '28px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'rgba(34,197,94,0.14)', border: '1.5px solid rgba(34,197,94,0.5)' }}>
            <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(34,197,94,0.18)',
              animation: `homeFill ${HOME_DELAY}s linear forwards`, '@keyframes homeFill': { from: { width: '0%' }, to: { width: '100%' } } }} />
            <CheckCircleIcon sx={{ position: 'relative', color: 'var(--success)', fontSize: 20 }} />
            <Typography sx={{ position: 'relative', color: 'var(--fg)', fontWeight: 800, fontSize: '16px' }}>
              Taking you home in {homeIn}s
            </Typography>
          </Box>
        ) : (
        <Box sx={{ display: 'flex', gap: `${PAD}px` }}>
          {showBack && (
            phase === 'finish' ? (
              // Longer finish label: Back shrinks to an icon so it fits on a phone.
              <IconButton onClick={back} aria-label="Back to the last step" sx={{ ...ctaSecondary, width: 56, minWidth: 56, px: 0, flexShrink: 0 }}>
                <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ) : (
              <Button onClick={back} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '14px !important' }} />} sx={{ ...ctaSecondary, flex: '0 0 auto', minWidth: 112 }}>
                Back
              </Button>
            )
          )}
          <Button onClick={next} disabled={syncing}
            startIcon={syncing ? <CircularProgress size={18} sx={{ color: 'var(--accent-fg)' }} /> : null}
            endIcon={phase === 'prep' || phase === 'cook' ? <ArrowForwardIcon /> : null}
            sx={{ ...ctaPrimary, flex: 1, minWidth: 0, px: '16px', whiteSpace: 'nowrap' }}>
            {nextText}
          </Button>
        </Box>
        )}
      </Box>
    </Box>
  )
}
