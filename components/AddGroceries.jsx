import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Modal, IconButton, Button, TextField,
  CircularProgress, Snackbar,
} from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { C, glassField, T, PAD } from '../theme'
import { api } from '../api'
import WheelPicker from './WheelPicker'
import { QTY_OPTIONS, DEFAULT_UNIT, suggestUnit, unitLabel } from '../units'
import { AMBIENT_BG, ListeningOrb, PromptBar, RECEIPT_STEPS, ctaPrimary, ctaSecondary, YELLOW, YELLOW_FG } from './Ambient'
import { parseSpokenList } from '../lib/spokenList.js'
import { useSpeech } from '../lib/useSpeech.js'
import { suggestItems } from '../lib/suggest.js'

// Same yellow as the pantry "Add to cart" button, used for "added" confirmation.
const ADDED_BG = 'var(--accent)'
const ADDED_FG = 'var(--accent-fg)'

// Hidden from view but still a real, focusable file input (not display:none),
// so the surrounding <label> opens the native camera / photo picker on tap.
const visuallyHidden = {
  position: 'absolute', width: 1, height: 1, p: 0, m: '-1px',
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

// Picker labels -> stored units ("each" is stored as the internal "unit").
const toStoredUnit = (u) => (u === 'each' ? 'unit' : u === 'fl oz' ? 'floz' : u)

const emptyManual = () => ({ display: '', quantity: '1', unit: DEFAULT_UNIT, options: suggestUnit('').options, unitTouched: false })

// Shared button looks
// Shared CTA spec (components/Ambient.jsx), same as every other screen.
const navBtn = { ...ctaSecondary, '& .MuiButton-startIcon': { mr: '4px', ml: 0 } }
const primaryBtn = ctaPrimary

// Chip showing an item; yellow once it's been added/confirmed.
function ItemChip({ label, added, active, idx, onClick, onRemove }) {
  return (
  <Box data-idx={idx} component={onClick ? 'button' : 'div'} type={onClick ? 'button' : undefined} onClick={onClick}
    aria-current={active ? 'step' : undefined}
    sx={{
      all: 'unset', boxSizing: 'border-box', cursor: onClick ? 'pointer' : 'default', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: 220,
      px: `${PAD * 1.25}px`, py: `${PAD * 0.6}px`, borderRadius: '16px', fontSize: `${T.sub}px`, fontWeight: 700,
      ...(added
        ? { background: ADDED_BG, color: ADDED_FG }
        : { background: 'rgba(var(--ink),0.08)', color: 'rgba(var(--ink),0.85)', border: '1px solid rgba(var(--ink),0.18)' }),
      ...(active ? { outline: `2px solid ${C.amber}`, outlineOffset: 2 } : {}),
    }}>
    {added && <CheckIcon sx={{ fontSize: 14 }} />}
    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
    {onRemove && (
      <Box component="button" type="button" onClick={onRemove} aria-label={`Remove ${label}`}
        sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', ml: '2px', opacity: 0.75 }}>
        <CloseIcon sx={{ fontSize: 14 }} />
      </Box>
    )}
  </Box>
  )
}

// Default wheel plus one extra value, in numeric order.
const withQty = (q) => (Number(q) > 0
  ? [...QTY_OPTIONS, String(q)].sort((a, b) => Number(a) - Number(b))
  : QTY_OPTIONS)

// Quantity + unit scroll wheels.
function Pickers({ quantity, unit, options, qtyOptions = QTY_OPTIONS, onQty, onUnit }) {
  return (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${PAD * 2}px`, py: `${PAD}px` }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mb: '2px' }}>Quantity</Typography>
      <WheelPicker options={qtyOptions} value={quantity} onChange={onQty} width={90} />
    </Box>
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mb: '2px' }}>Unit</Typography>
      <WheelPicker options={options} value={unit} onChange={onUnit} width={104} />
    </Box>
  </Box>
  )
}


// Full-screen, assistant-style "add groceries" canvas.
//   input   -> one "Snap or Upload Receipt" action + "tell me what you bought"
//   email   -> paste a receipt email
//   confirm -> one item at a time (how much did you buy?)
//   addmore -> anything else, then commit
// prefill: an "I bought …" list from Ask Chef, parsed straight into confirm.
export default function AddGroceries({ open, onClose, onCommitted, initialMode = 'camera', prefill = '' }) {
  const [stage, setStage] = useState('input')    // input | email | confirm | addmore
  const [said, setSaid] = useState('')           // typed / spoken shopping list
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emailText, setEmailText] = useState('')
  const [items, setItems] = useState([])         // scanned items being confirmed
  const [extras, setExtras] = useState([])       // items added by hand
  const [step, setStep] = useState(0)
  const [confirmed, setConfirmed] = useState(() => new Set()) // indexes the user moved past with Next
  const [receiptId, setReceiptId] = useState(null)
  const [snack, setSnack] = useState('')
  const [manual, setManual] = useState(emptyManual)
  const [progress, setProgress] = useState('')
  const [pantryNames, setPantryNames] = useState([])
  const stripRef = useRef(null)

  // Known pantry items power the manual-entry autocomplete.
  useEffect(() => {
    if (stage !== 'addmore') return
    let alive = true
    api.pantry().then(p => { if (alive) setPantryNames(p.map(x => x.display)) }).catch(() => {})
    return () => { alive = false }
  }, [stage])
  const suggestions = stage === 'addmore' ? suggestItems(manual.display, pantryNames) : []

  // On open: start on email if asked, or jump straight to confirming a list
  // the user already told Ask Chef ("I bought 2 lb chicken and milk").
  useEffect(() => {
    if (!open) return
    const fromChef = prefill ? parseSpokenList(prefill) : []
    if (fromChef.length) { startConfirm({ items: fromChef, receiptId: null }); return }
    setStage(initialMode === 'email' ? 'email' : 'input')
  }, [open, initialMode, prefill]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the current item's chip scrolled into view in the name strip.
  useEffect(() => {
    stripRef.current?.querySelector(`[data-idx="${step}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [step, stage])

  const reset = () => {
    setStage('input'); setItems([]); setExtras([]); setStep(0); setConfirmed(new Set())
    setReceiptId(null); setError(''); setEmailText(''); setManual(emptyManual()); setSaid('')
  }

  // "Tell me what you bought": typed or spoken list -> confirm step.
  const onTellList = (text = said) => {
    const parsed = parseSpokenList(text)
    if (!parsed.length) { setError('I didn\u2019t catch any items. Try something like \u201c2 lb chicken, milk and eggs\u201d.'); return }
    setError('')
    startConfirm({ items: parsed, receiptId: null })
  }
  const speech = useSpeech({
    onInterim: (t) => setSaid(t),
    onFinal: (t) => { setSaid(t); onTellList(t) },
  })
  const handleClose = () => { reset(); onClose() }

  // Pick a relevant unit + starting quantity for each parsed item.
  const prepForConfirm = (parsed) => parsed.map(it => {
    const s = suggestUnit(it.canonical || it.display, it.category)
    const parsedCount = it.quantity != null && (!it.unit || it.unit === 'unit') ? Number(it.quantity) : null
    let unit = s.unit
    let quantity = s.qty
    if (it.quantity != null && it.unit && it.unit !== 'unit') {
      unit = unitLabel(it.unit); quantity = String(it.quantity) // receipt stated a real unit: keep it
    } else if (parsedCount && (s.unit === 'each' || s.unit === 'can' || s.unit === 'bulb' || s.unit === 'head' || s.unit === 'bunch')) {
      quantity = String(parsedCount) // "2 Bananas" -> 2 each
    }
    const options = s.options.includes(unit) ? s.options : [unit, ...s.options]
    // Keep a stated amount (e.g. 40 g) even if it isn't on the default wheel.
    const qtyOptions = QTY_OPTIONS.includes(quantity) ? QTY_OPTIONS : withQty(quantity)
    return { ...it, unit, quantity, options, qtyOptions }
  })

  const startConfirm = (res) => {
    setItems(prepForConfirm(res.items)); setReceiptId(res.receiptId); setStep(0)
    setConfirmed(new Set()); setStage('confirm')
  }

  const onPickImage = async (e) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    try { await processPhoto(file) } finally { input.value = '' } // allow re-picking the same photo
  }

  // Status while a receipt is processed (never looks frozen):
  //   • getting ready / loading the photo: "Reading your receipt…" and
  //     "Stocking your digital kitchen…" alternate every 2 s
  //   • text recognition running (real % climbing): "Matching ingredients
  //     to your pantry…" with the % below
  //   • done: "Matching ingredients…" + "N items found" for 2 s, then confirm
  const STEP_MS = 2000
  const [tick, setTick] = useState(0)
  const [found, setFound] = useState(null)
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setTick(n => n + 1), STEP_MS)
    return () => clearInterval(t)
  }, [busy])
  const ocrPct = progress.match(/(\d+)%/)?.[1]
  const scanPhase = found != null || ocrPct != null ? 1 : tick % 2 === 0 ? 0 : 2
  const scanDetail = found != null ? `${found} item${found === 1 ? '' : 's'} found`
    : ocrPct != null ? `${ocrPct}% read` : progress
  const hold = (ms) => new Promise(r => setTimeout(r, ms))
  const finishSteps = async (res) => {
    setFound(res.items.length)
    await hold(STEP_MS)
    startConfirm(res)
  }

  const processPhoto = async (file) => {
    setBusy(true); setError(''); setTick(0); setFound(null); setProgress('Preparing photo…')
    try {
      const res = await api.scanReceipt(file, setProgress)
      if (!res.items?.length) {
        setError("We couldn't find grocery items in that photo. Try a flat, well-lit, straight-on shot, or add items by hand.")
        return
      }
      await finishSteps(res)
    } catch (err) {
      setError(`Scan failed: ${err.message}`)
    } finally {
      setBusy(false); setProgress('')
    }
  }

  const onParseEmail = async () => {
    if (!emailText.trim()) { setError('Paste your receipt email first.'); return }
    setBusy(true); setError(''); setTick(0); setFound(null)
    try {
      await hold(STEP_MS) // text parses instantly: keep "Reading your receipt…" readable
      const res = await api.parseEmail(emailText)
      if (!res.items?.length) { setError('No grocery items found in that text.'); return }
      await finishSteps(res)
    } catch (err) { setError(`Parse failed: ${err.message}`) }
    finally { setBusy(false) }
  }

  const setField = (patch) => setItems(list => list.map((it, i) => (i === step ? { ...it, ...patch } : it)))

  // ── Confirm-step navigation ───────────────────────────────────────────────
  const goNext = () => {
    setConfirmed(prev => new Set(prev).add(step))
    if (step < items.length - 1) setStep(step + 1)
    else setStage('addmore')
  }
  const goBack = () => { if (step > 0) setStep(step - 1); else reset() }
  const goSkip = () => {
    const next = items.filter((_, i) => i !== step)
    // re-index the confirmed set around the removed item
    setConfirmed(prev => new Set([...prev].filter(i => i !== step).map(i => (i > step ? i - 1 : i))))
    setItems(next)
    if (next.length === 0 || step >= next.length) { setStage('addmore'); setStep(Math.max(0, next.length - 1)) }
  }
  const backFromAddMore = () => {
    if (items.length) { setStep(items.length - 1); setStage('confirm') } else reset()
  }

  // ── Manual add ────────────────────────────────────────────────────────────
  const onManualName = (display) => setManual(m => {
    if (m.unitTouched) return { ...m, display }
    const s = suggestUnit(display)
    return { ...m, display, unit: s.unit, quantity: s.qty, options: s.options }
  })
  const addManualItem = () => {
    const name = manual.display.trim()
    if (!name) return
    setExtras(list => [...list, { display: name, quantity: manual.quantity, unit: manual.unit }])
    setManual(emptyManual())
    setSnack(`Added ${name}`)
  }
  const removeExtra = (i) => setExtras(list => list.filter((_, idx) => idx !== i))

  const allItems = [...items, ...extras]

  const commit = async () => {
    setBusy(true); setError('')
    try {
      const payload = allItems.map(({ options, qtyOptions, ...it }) => ({ // eslint-disable-line no-unused-vars
        ...it, quantity: Number(it.quantity) || 1, unit: toStoredUnit(it.unit),
      }))
      await api.commit(payload, receiptId)
      reset()
      onCommitted?.(payload.length)
    } catch (err) { setError(`Could not save: ${err.message}`) }
    finally { setBusy(false) }
  }

  const current = items[step]

  // Full-screen ambient canvas (replaces the old bottom sheet).
  const canvasSx = {
    width: '100%', maxWidth: 648, height: '100vh', '@supports (height: 100svh)': { height: '100svh' },
    mx: 'auto', background: AMBIENT_BG, outline: 'none',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    pt: 'env(safe-area-inset-top, 0px)', pb: 'env(safe-area-inset-bottom, 0px)',
    animation: 'canvasIn .25s ease-out',
    '@keyframes canvasIn': { from: { opacity: 0, transform: 'scale(0.985)' }, to: { opacity: 1, transform: 'none' } },
  }

  const title = stage === 'confirm' ? 'How much did you buy?'
    : stage === 'addmore' ? 'Anything else?'
    : ''

  const linkSx = {
    all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600,
    '&:hover': { color: 'var(--fg)' }, '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 3 },
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} aria-label="Add groceries">
        <Box sx={canvasSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${PAD * 2}px`, pt: `${PAD}px`, minHeight: 48 }}>
            <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px` }}>{title}</Typography>
            <IconButton onClick={handleClose} aria-label="Close" sx={{ color: 'var(--text-2)' }}><CloseIcon /></IconButton>
          </Box>

          {/* ── INPUT: one action + conversation, secondary options as quiet links ── */}
          {stage === 'input' && (
            <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', px: `${PAD * 2.5}px`, pb: `${PAD * 2}px`, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 0, pt: `${PAD}px` }}>
                <ListeningOrb active={busy || speech.listening} size={104} />
                <Typography component="h2" sx={{
                  color: 'var(--fg)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, mt: `${PAD * 1.5}px`,
                  fontSize: 'clamp(24px, 7vw, 32px)', textShadow: '0 0 28px rgba(var(--glow),0.25)', maxWidth: 420, minHeight: busy ? '2.3em' : undefined,
                }}>
                  {/* While scanning: the orb pulses and the headline steps through what's happening. */}
                  {busy
                    ? <Box component="span" key={scanPhase} role="status" aria-live="polite"
                        sx={{ display: 'inline-block', animation: 'stepIn .35s ease both', '@keyframes stepIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } }}>
                        {RECEIPT_STEPS[scanPhase]}
                      </Box>
                    : 'Tell me what you got.'}
                </Typography>
                <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, mt: `${PAD}px`, lineHeight: 1.5, maxWidth: 360, fontVariantNumeric: 'tabular-nums' }}>
                  {busy ? (scanDetail || '\u00a0') : 'Drop a receipt or type it out\u2014I\u2019ll handle the rest.'}
                </Typography>
                {busy && (
                  // Step dots: 1 · 2 · 3
                  <Box aria-hidden sx={{ display: 'flex', gap: '6px', mt: `${PAD * 1.5}px` }}>
                    {RECEIPT_STEPS.map((_, i) => (
                      <Box key={i} sx={{ width: i === scanPhase ? 22 : 8, height: 8, borderRadius: 4, transition: 'all .3s',
                        background: i === scanPhase ? 'var(--accent)' : 'rgba(var(--ink),0.18)' }} />
                    ))}
                  </Box>
                )}

                {!busy && (
                  <>
                    {/* One button: no capture attribute, so the phone offers camera OR photo library natively. */}
                    <Button component="label" startIcon={<CameraAltIcon />}
                      sx={{ ...ctaPrimary, mt: `${PAD * 3}px`, px: `${PAD * 3.5}px`, '&:focus-within': { outline: '3px solid var(--fg)', outlineOffset: 3 } }}>
                      Snap or Upload Receipt
                      <Box component="input" type="file" accept="image/*" onChange={onPickImage} sx={visuallyHidden} />
                    </Button>

                    <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px`, mt: `${PAD * 3}px`, mb: `${PAD}px`, letterSpacing: '0.08em' }}>OR JUST TELL ME</Typography>
                    <Box sx={{ width: '100%', maxWidth: 520 }}>
                      <PromptBar value={said} onChange={(v) => { setSaid(v); setError('') }} onSubmit={() => onTellList()}
                        placeholder="2 lb chicken, milk and 6 eggs" label="Tell me what you got"
                        listening={speech.listening} micSupported={speech.supported}
                        onMic={() => (speech.listening ? speech.stop() : speech.start())} />
                    </Box>
                  </>
                )}
                {(error || speech.error) && (
                  <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, mt: `${PAD * 1.5}px`, maxWidth: 360 }}>{error || speech.error}</Typography>
                )}
              </Box>

              {!busy && (
                <Box sx={{ textAlign: 'center', pt: `${PAD * 3}px` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: `${PAD * 3}px` }}>
                    <Box component="button" type="button" onClick={() => { setError(''); setStage('email') }} sx={linkSx}>
                      <EmailOutlinedIcon sx={{ fontSize: 16 }} /> Email receipt
                    </Box>
                  </Box>
                  <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.chip}px`, mt: `${PAD * 1.5}px` }}>
                    Photos are read on your device and never uploaded.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* ── EMAIL: paste a receipt email ── */}
          {stage === 'email' && (
            <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2.5}px`, pb: `${PAD * 2}px` }}>
              <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: 'clamp(22px, 6.5vw, 28px)', lineHeight: 1.2, mt: `${PAD}px` }}>
                Paste your receipt email
              </Typography>
              <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, mt: `${PAD}px`, mb: `${PAD * 2}px`, lineHeight: 1.5 }}>
                Copy the order details from Instacart, Amazon Fresh or Walmart and paste them here.
              </Typography>
              <TextField value={emailText} onChange={e => setEmailText(e.target.value)} autoFocus
                placeholder="Paste the receipt text…" multiline minRows={7} fullWidth sx={glassField}
                slotProps={{ htmlInput: { 'aria-label': 'Receipt email text' } }} />
              <Button onClick={onParseEmail} disabled={busy} fullWidth
                startIcon={busy ? <CircularProgress size={16} sx={{ color: YELLOW_FG }} /> : null}
                sx={{ ...ctaPrimary, mt: `${PAD * 2}px` }}>
                {busy ? <Box component="span" role="status" aria-live="polite">{RECEIPT_STEPS[scanPhase]}</Box> : 'Find my groceries'}
              </Button>
              {error && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center', mt: `${PAD}px` }}>{error}</Typography>}
              <Box sx={{ textAlign: 'center', mt: `${PAD * 2.5}px` }}>
                <Box component="button" type="button" onClick={() => { setError(''); setStage('input') }} sx={linkSx}>
                  <ArrowBackIosNewIcon sx={{ fontSize: 12 }} /> Back
                </Box>
              </Box>
            </Box>
          )}

          {/* ── CONFIRM (one item at a time) ── */}
          {stage === 'confirm' && current && (
            <>
              {/* Every item name stays visible; confirmed ones turn yellow. */}
              <Box ref={stripRef} sx={{ display: 'flex', gap: `${PAD * 0.75}px`, overflowX: 'auto', px: `${PAD * 2}px`, py: '4px', mb: `${PAD}px`, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                {items.map((it, i) => (
                  <ItemChip key={i} idx={i} label={it.display} added={confirmed.has(i)} active={i === step} onClick={() => setStep(i)} />
                ))}
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pb: `${PAD}px` }}>
                <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mb: `${PAD * 1.5}px` }}>
                  Item {step + 1} of {items.length}{current.category ? ` · ${current.category}` : ''}
                </Typography>
                <TextField value={current.display} onChange={e => setField({ display: e.target.value })}
                  fullWidth label="Item name" sx={{ ...glassField, '& .MuiOutlinedInput-input': { fontSize: `${T.heading}px`, fontWeight: 800, py: '10px' } }} />
                {current.rawText && (
                  <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '4px' }}>
                    From receipt: “{current.rawText}”{current.confidence != null ? ` · ${Math.round(current.confidence * 100)}% match` : ''}
                  </Typography>
                )}
                <Pickers quantity={current.quantity} unit={current.unit} options={current.options || suggestUnit(current.display).options}
                  qtyOptions={current.qtyOptions}
                  onQty={v => setField({ quantity: v })} onUnit={v => setField({ unit: v })} />
              </Box>

              <Box sx={{ px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: `${PAD}px` }}>
                <Button onClick={goBack} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '14px !important' }} />} sx={navBtn}>Back</Button>
                <Button onClick={goSkip} startIcon={<SkipNextIcon />} sx={navBtn}>Skip</Button>
                <Button onClick={goNext} endIcon={<ArrowForwardIosIcon sx={{ fontSize: '14px !important' }} />} sx={primaryBtn}>Next</Button>
              </Box>
            </>
          )}

          {/* ── ADD MORE (manual, one by one) ── */}
          {stage === 'addmore' && (
            <>
              <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pb: `${PAD}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
                <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mb: `${PAD * 1.5}px`, lineHeight: 1.5 }}>
                  Missed something? Type its name and we'll suggest the right unit.
                </Typography>

                {/* Name + inline add: gray until something is typed, then yellow. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
                  <TextField value={manual.display} onChange={e => onManualName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addManualItem() }}
                    label="Item name" placeholder="e.g. Spinach, Milk, Sugar" fullWidth sx={glassField} />
                  <IconButton onClick={addManualItem} disabled={!manual.display.trim()} aria-label="Add this item"
                    sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: '14px',
                      background: manual.display.trim() ? YELLOW : 'rgba(var(--ink),0.08)',
                      color: manual.display.trim() ? YELLOW_FG : 'rgba(var(--ink),0.45)',
                      transition: 'background .15s, color .15s',
                      '&:hover': { background: manual.display.trim() ? 'var(--accent-strong)' : 'rgba(var(--ink),0.08)' },
                      '&.Mui-disabled': { background: 'rgba(var(--ink),0.08)', color: 'var(--text-2)' } }}>
                    <AddIcon />
                  </IconButton>
                </Box>

                {/* Autocomplete chips from 2 letters: pantry items first, then common ingredients */}
                {suggestions.length > 0 && (
                  <Box role="listbox" aria-label="Suggestions" sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: `${PAD}px` }}>
                    {suggestions.map(s => (
                      <Box key={s.name} role="option" aria-selected={false} component="button" type="button" onClick={() => onManualName(s.name)}
                        sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', height: 34, px: '12px', borderRadius: '17px',
                          background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', color: 'var(--fg)', fontWeight: 600, fontSize: `${T.body}px`,
                          '&:hover': { background: 'var(--surface-hover)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                        {s.name}
                        {s.inPantry && <Typography component="span" sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px`, fontWeight: 700 }}>in pantry</Typography>}
                      </Box>
                    ))}
                  </Box>
                )}

                <Pickers quantity={manual.quantity} unit={manual.unit} options={manual.options}
                  onQty={v => setManual(m => ({ ...m, quantity: v }))}
                  onUnit={v => setManual(m => ({ ...m, unit: v, unitTouched: true }))} />

                <Box sx={{ mt: `${PAD * 2}px` }}>
                  <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600, mb: `${PAD}px` }}>
                    {allItems.length} item{allItems.length === 1 ? '' : 's'} ready to add
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${PAD * 0.75}px` }}>
                    {items.map((it, i) => (
                      <ItemChip key={`s${i}`} label={`${it.display} · ${it.quantity} ${it.unit}`} added />
                    ))}
                    {extras.map((it, i) => (
                      <ItemChip key={`m${i}`} label={`${it.display} · ${it.quantity} ${it.unit}`} added onRemove={() => removeExtra(i)} />
                    ))}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: `${PAD}px` }}>
                <Button onClick={backFromAddMore} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '14px !important' }} />} sx={navBtn}>Back</Button>
                <Button onClick={commit} disabled={busy || !allItems.length}
                  startIcon={busy ? <CircularProgress size={16} sx={{ color: 'var(--accent-fg)' }} /> : <CheckCircleIcon />}
                  sx={primaryBtn}>
                  Done — add {allItems.length} to pantry
                </Button>
              </Box>
              {error && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center', pb: `${PAD}px` }}>{error}</Typography>}
            </>
          )}
        </Box>
      </Modal>

      <Snackbar open={!!snack} autoHideDuration={1600} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </>
  )
}
