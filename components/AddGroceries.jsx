import { useState, useRef, useEffect } from 'react'
import {
  Box, Typography, Modal, IconButton, Button, TextField,
  CircularProgress, ToggleButtonGroup, ToggleButton, Snackbar,
} from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import EmailIcon from '@mui/icons-material/Email'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { C, glass, glassField, T, PAD } from '../theme'
import { api } from '../api'
import WheelPicker from './WheelPicker'
import { QTY_OPTIONS, UNIT_OPTIONS, DEFAULT_UNIT } from '../units'

export default function AddGroceries({ open, onClose, onCommitted, initialMode = 'camera' }) {
  const [mode, setMode] = useState(initialMode)  // camera | email
  const [stage, setStage] = useState('input')    // input | confirm | addmore
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emailText, setEmailText] = useState('')
  const [items, setItems] = useState([])
  const [step, setStep] = useState(0)
  const [receiptId, setReceiptId] = useState(null)
  const [snack, setSnack] = useState('')
  const [manual, setManual] = useState({ display: '', quantity: '1', unit: DEFAULT_UNIT })
  const fileRef = useRef(null)

  // When the sheet (re)opens, start on the requested tab (camera/email).
  useEffect(() => { if (open) setMode(initialMode) }, [open, initialMode])

  const reset = () => {
    setStage('input'); setItems([]); setStep(0); setReceiptId(null); setError('')
    setEmailText(''); setManual({ display: '', quantity: '1', unit: DEFAULT_UNIT })
  }
  const handleClose = () => { reset(); onClose() }

  const prepForConfirm = (parsed) => parsed.map(it => ({
    ...it,
    quantity: it.quantity != null ? String(it.quantity) : '1',
    unit: it.unit && it.unit !== 'unit' ? it.unit : DEFAULT_UNIT,
  }))

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError('')
    try {
      const res = await api.scanReceipt(file)
      if (!res.items?.length) { setError('No grocery items detected. Try a clearer, straight-on photo.'); return }
      setItems(prepForConfirm(res.items)); setReceiptId(res.receiptId); setStep(0); setStage('confirm')
    } catch (err) { setError(`Scan failed: ${err.message}`) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const onParseEmail = async () => {
    if (!emailText.trim()) { setError('Paste your receipt email first.'); return }
    setBusy(true); setError('')
    try {
      const res = await api.parseEmail(emailText)
      if (!res.items?.length) { setError('No grocery items found in that text.'); return }
      setItems(prepForConfirm(res.items)); setReceiptId(res.receiptId); setStep(0); setStage('confirm')
    } catch (err) { setError(`Parse failed: ${err.message}`) }
    finally { setBusy(false) }
  }

  const setField = (patch) => setItems(list => list.map((it, i) => i === step ? { ...it, ...patch } : it))
  const skipItem = () => {
    const nextList = items.filter((_, i) => i !== step)
    setItems(nextList)
    if (nextList.length === 0) { setStage('addmore'); return }
    if (step >= nextList.length) setStep(nextList.length - 1)
  }

  const nextConfirm = () => {
    if (step < items.length - 1) setStep(step + 1)
    else setStage('addmore') // after last scanned item, offer manual additions
  }
  const backConfirm = () => { if (step > 0) setStep(step - 1); else reset() }

  const addManualItem = () => {
    if (!manual.display.trim()) return
    setItems(list => [...list, { display: manual.display.trim(), quantity: manual.quantity, unit: manual.unit, category: 'Other' }])
    setManual({ display: '', quantity: '1', unit: DEFAULT_UNIT })
    setSnack(`Added ${manual.display.trim()}`)
  }

  const commit = async () => {
    setBusy(true); setError('')
    try {
      const payload = items.map(it => ({ ...it, quantity: Number(it.quantity) || 1 }))
      await api.commit(payload, receiptId)
      reset()
      onCommitted?.(payload.length)
    } catch (err) { setError(`Could not save: ${err.message}`) }
    finally { setBusy(false) }
  }

  const current = items[step]

  const sheetSx = {
    width: '100%', maxWidth: 648, maxHeight: '92dvh',
    background: 'rgba(18,22,30,0.82)',
    backdropFilter: 'blur(34px) saturate(160%)', WebkitBackdropFilter: 'blur(34px) saturate(160%)',
    borderTop: `1px solid ${C.glassBorderStrong}`, borderRadius: '24px 24px 0 0',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none',
    boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', animation: 'slideUp .25s ease-out',
    '@keyframes slideUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
  }

  const title = stage === 'confirm' ? 'How much did you buy?'
    : stage === 'addmore' ? 'Any additional items?'
    : 'Add groceries'

  return (
    <>
      <Modal open={open} onClose={handleClose} sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <Box sx={sheetSx}>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: `${PAD}px`, pb: '2px' }}>
            <Box sx={{ width: 40, height: 4, background: 'rgba(255,255,255,0.28)', borderRadius: 2 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${PAD * 2}px`, py: `${PAD}px` }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px` }}>{title}</Typography>
            <IconButton onClick={handleClose} sx={{ color: '#aaa' }}><CloseIcon /></IconButton>
          </Box>

          {/* ── INPUT ── */}
          {stage === 'input' && (
            <>
              <Box sx={{ px: `${PAD * 2}px`, pb: `${PAD}px` }}>
                <ToggleButtonGroup value={mode} exclusive fullWidth size="small" onChange={(_, v) => { if (v) { setMode(v); setError('') } }}
                  sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.6)', border: `1px solid ${C.glassBorder}`, textTransform: 'none', fontSize: `${T.body}px`, fontWeight: 600, py: `${PAD}px` },
                    '& .Mui-selected': { color: '#fff !important', background: `${C.amberGlass} !important`, borderColor: `${C.amberGlassBorder} !important` } }}>
                  <ToggleButton value="camera"><CameraAltIcon sx={{ fontSize: 18, mr: 1 }} /> Scan receipt</ToggleButton>
                  <ToggleButton value="email"><EmailIcon sx={{ fontSize: 18, mr: 1 }} /> Email receipt</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pb: `${PAD * 2}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
                {mode === 'camera' ? (
                  <Box sx={{ textAlign: 'center', py: `${PAD * 3}px` }}>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPickImage} />
                    <Button onClick={() => fileRef.current?.click()} disabled={busy}
                      startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CameraAltIcon />}
                      sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.32 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body}px`, px: 3, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.48)' } }}>
                      {busy ? 'Reading receipt…' : 'Open camera / choose photo'}
                    </Button>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mt: `${PAD * 1.5}px`, lineHeight: 1.5 }}>
                      Snap a grocery receipt. We match each line to a pantry ingredient — then you set how much you bought.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ py: `${PAD}px` }}>
                    <TextField value={emailText} onChange={e => setEmailText(e.target.value)}
                      placeholder="Paste your Instacart / Amazon Fresh receipt email here…"
                      multiline minRows={6} fullWidth sx={glassField} />
                    <Button onClick={onParseEmail} disabled={busy} fullWidth
                      startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                      sx={{ mt: `${PAD * 1.5}px`, ...glass('amber', { radius: 30, blur: 14, a: 0.32 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.48)' } }}>
                      {busy ? 'Parsing…' : 'Parse receipt'}
                    </Button>
                  </Box>
                )}
                {error && <Typography sx={{ color: '#ff8a8a', fontSize: `${T.sub}px`, textAlign: 'center', mt: `${PAD}px` }}>{error}</Typography>}
              </Box>
            </>
          )}

          {/* ── CONFIRM (per item wheels) ── */}
          {stage === 'confirm' && current && (
            <>
              <Box sx={{ px: `${PAD * 2}px`, pb: `${PAD}px` }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: '5px', mb: `${PAD * 1.5}px` }}>
                  {items.map((_, i) => (
                    <Box key={i} sx={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? C.amber : (i < step ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.2)'), transition: 'all .2s' }} />
                  ))}
                </Box>
                <Box sx={{ textAlign: 'center', mb: `${PAD}px` }}>
                  <TextField value={current.display} onChange={e => setField({ display: e.target.value })} variant="standard"
                    sx={{ '& .MuiInput-input': { color: '#fff', fontSize: `${T.heading}px`, fontWeight: 800, textAlign: 'center' }, '& .MuiInput-root:before': { borderColor: 'transparent' }, '& .MuiInput-root:hover:before': { borderColor: 'rgba(255,255,255,0.2) !important' } }} />
                  {current.rawText && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: `${T.sub}px`, mt: '2px' }}>
                      from receipt: “{current.rawText}”{current.confidence != null ? ` · ${Math.round(current.confidence * 100)}% match` : ''}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${PAD * 2}px`, py: `${PAD}px` }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mb: '2px' }}>Quantity</Typography>
                    <WheelPicker options={QTY_OPTIONS} value={current.quantity} onChange={v => setField({ quantity: v })} width={90} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mb: '2px' }}>Unit</Typography>
                    <WheelPicker options={UNIT_OPTIONS} value={current.unit} onChange={v => setField({ unit: v })} width={100} />
                  </Box>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.sub}px`, textAlign: 'center' }}>
                  Item {step + 1} of {items.length}{current.category ? ` · ${current.category}` : ''}
                </Typography>
              </Box>
              <Box sx={{ px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, borderTop: `1px solid ${C.glassBorder}`, display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
                <IconButton onClick={backConfirm} sx={{ ...glass('neutral', { radius: 40, blur: 12, a: 0.08 }), color: '#fff', width: 42, height: 42 }}>
                  <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Button onClick={skipItem} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none', fontSize: `${T.body}px` }}>Skip</Button>
                <Button onClick={nextConfirm} fullWidth
                  sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: `${T.body}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.5)' } }}>
                  {step === items.length - 1 ? 'Next: add more' : 'Next'}
                </Button>
              </Box>
            </>
          )}

          {/* ── ADD MORE (manual, one by one) ── */}
          {stage === 'addmore' && (
            <>
              <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pb: `${PAD}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.sub}px`, textAlign: 'center', mb: `${PAD * 1.5}px`, lineHeight: 1.5 }}>
                  Missed something the scan didn't catch? Add it here — one at a time.
                </Typography>

                <TextField value={manual.display} onChange={e => setManual(m => ({ ...m, display: e.target.value }))}
                  placeholder="Item name (e.g. Olive Oil)" fullWidth sx={glassField} />

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${PAD * 2}px`, py: `${PAD * 1.5}px` }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mb: '2px' }}>Quantity</Typography>
                    <WheelPicker options={QTY_OPTIONS} value={manual.quantity} onChange={v => setManual(m => ({ ...m, quantity: v }))} width={90} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mb: '2px' }}>Unit</Typography>
                    <WheelPicker options={UNIT_OPTIONS} value={manual.unit} onChange={v => setManual(m => ({ ...m, unit: v }))} width={100} />
                  </Box>
                </Box>

                <Button onClick={addManualItem} disabled={!manual.display.trim()} fullWidth startIcon={<AddIcon />}
                  sx={{ ...glass('neutral', { radius: 24, blur: 12, a: 0.08 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body}px`, py: `${PAD}px`, '&:hover': { background: 'rgba(255,255,255,0.14)' } }}>
                  Add this item
                </Button>

                {/* running list of everything to be committed */}
                <Box sx={{ mt: `${PAD * 1.5}px` }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.sub}px`, fontWeight: 600, mb: `${PAD}px` }}>
                    {items.length} item{items.length === 1 ? '' : 's'} ready
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${PAD * 0.75}px` }}>
                    {items.map((it, i) => (
                      <Box key={i} sx={{ ...glass('neutral', { radius: 14, blur: 10, a: 0.06 }), px: `${PAD}px`, py: `${PAD * 0.5}px`, fontSize: `${T.sub}px`, color: 'rgba(255,255,255,0.85)' }}>
                        {it.display} · {it.quantity} {it.unit}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, borderTop: `1px solid ${C.glassBorder}` }}>
                <Button onClick={commit} disabled={busy || !items.length} fullWidth
                  startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
                  sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: `${T.body}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.5)' } }}>
                  Done — add {items.length} to pantry
                </Button>
                {error && <Typography sx={{ color: '#ff8a8a', fontSize: `${T.sub}px`, textAlign: 'center', mt: `${PAD}px` }}>{error}</Typography>}
              </Box>
            </>
          )}
        </Box>
      </Modal>

      <Snackbar open={!!snack} autoHideDuration={1600} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: 'rgba(46,158,107,0.9)', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </>
  )
}
