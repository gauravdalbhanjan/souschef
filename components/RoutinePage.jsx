import { useState, useEffect } from 'react'
import { Box, Typography, Button, IconButton, Dialog, DialogContent, InputBase, Snackbar } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import GoBackButton from './GoBackButton'
import { C, T, PAD } from '../theme'
import { pillPrimary, pillSecondary, surface, softBackdrop, Tag, ctaPrimary } from './Ambient'
import {
  DAY_LETTERS, DAY_NAMES, SAMPLE_ROUTINES, loadRoutines, saveRoutines, resolveDish, ingredientsFor, imageFor, fmtTime,
} from '../lib/routines.js'

// Day circles: active = solid yellow, inactive = quiet tint.
function DayDots({ days, onToggle, size = 30 }) {
  return (
    <Box role="group" aria-label="Active days" sx={{ display: 'flex', gap: '5px' }}>
      {DAY_LETTERS.map((d, i) => {
        const on = days.includes(i)
        return (
          <Box key={i} component="button" type="button" onClick={() => onToggle(i)} aria-pressed={on} aria-label={DAY_NAMES[i]}
            sx={{
              all: 'unset', cursor: 'pointer', width: size, height: size, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? 'var(--accent)' : 'rgba(var(--ink),0.07)', color: on ? 'var(--accent-fg)' : 'rgba(var(--ink),0.55)',
              boxShadow: 'none',
              fontSize: '12px', fontWeight: 800, transition: 'background .15s, box-shadow .15s',
              '&:hover': { background: on ? 'var(--accent-strong)' : 'rgba(var(--ink),0.12)' },
              '&:focus-visible': { outline: `2px solid ${C.amber}`, outlineOffset: 2 },
            }}>
            {d}
          </Box>
        )
      })}
    </Box>
  )
}

// Compact row: thumbnail · name, time, active days · action pill.
// Tap the row to expand day toggles + ingredients. Samples are faded (50%)
// and any tap on one opens the editor prefilled.
function RoutineCard({ routine, onEdit, onToggleDay }) {
  const [open, setOpen] = useState(false)
  const img = imageFor(routine)
  const uses = ingredientsFor(routine).map(i => i.display)
  const sample = !!routine.sample
  const days = routine.days || []
  const dayText = !days.length ? 'No days set'
    : days.length === 7 ? 'Every day'
    : DAY_NAMES.filter((_, i) => days.includes(i)).map(d => d.slice(0, 3)).join(' ')
  const onRow = () => (sample ? onEdit(routine) : setOpen(o => !o))

  return (
    <Box sx={{ ...surface, mb: `${PAD}px`, transition: 'border-color .15s, transform .15s, background .15s',
      '&:hover': { borderColor: 'rgba(var(--accent-rgb),0.45)', background: 'var(--surface-hover)', transform: 'translateY(-1px)' },
      '&:focus-within': { borderColor: 'rgba(var(--accent-rgb),0.6)' } }}>
      <Box component="button" type="button" onClick={onRow} aria-expanded={sample ? undefined : open}
        aria-label={sample ? `Suggested routine: ${routine.dish}. Tap to set it up` : `${routine.dish}, ${fmtTime(routine.time)}, ${dayText}`}
        sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: `${PAD * 1.5}px`, p: `${PAD}px`,
          borderRadius: '18px', '&:focus-visible': { outline: 'none' } }}>
        {img
          ? <Box component="img" src={img} alt="" sx={{ width: 56, height: 56, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
          : <Box sx={{ width: 56, height: 56, borderRadius: '12px', flexShrink: 0, background: 'rgba(var(--ink),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestaurantIcon sx={{ color: 'var(--text-3)' }} /></Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.title + 2}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{routine.dish}</Typography>
            {sample && <Tag>Suggestion</Tag>}
          </Box>
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fmtTime(routine.time)} · {dayText}
          </Typography>
        </Box>
        <Box component="span" onClick={e => { e.stopPropagation(); onEdit(routine) }} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEdit(routine) } }}
          aria-label={sample ? `Use ${routine.dish}` : `Edit ${routine.dish}`}
          sx={sample ? pillPrimary : pillSecondary}>
          {sample ? <AddIcon sx={{ fontSize: 14 }} /> : <EditIcon sx={{ fontSize: 13 }} />}
          {sample ? 'Use this' : 'Edit'}
        </Box>
      </Box>

      {open && !sample && (
        <Box sx={{ px: `${PAD * 1.5}px`, pb: `${PAD * 1.5}px` }}>
          <DayDots days={days} onToggle={i => onToggleDay(routine.id, i)} size={30} />
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: `${PAD}px` }}>
            {routine.servings} serving{routine.servings === 1 ? '' : 's'} · {uses.length ? `Uses ${uses.join(', ')}` : 'Not linked to pantry items'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }

// Set up a routine. When it comes from a suggestion (or is being edited) the
// dish is fixed and shown as a header, so the sheet is only about *when*:
// time, days and servings. "+ New routine" asks for the dish name once.
function RoutineDialog({ routine, onClose, onSave, onDelete }) {
  const isNew = !routine.id
  const fixedDish = !!routine.dish
  const [dish, setDish] = useState(routine.dish || '')
  const [time, setTime] = useState(routine.time || '08:00')
  // Suggestions carry no days; start new routines on weekdays so one tap adds it.
  const [days, setDays] = useState(routine.days?.length ? routine.days : [1, 2, 3, 4, 5])
  const [servings, setServings] = useState(routine.servings || 1)
  const linked = resolveDish(dish)
  const uses = ingredientsFor(linked).map(i => i.display)
  const img = imageFor({ ...routine, ...linked, dish })
  const toggle = (i) => setDays(d => (d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort()))
  const valid = dish.trim() && days.length && time
  const label = { color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 700 }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs"
      slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
      <DialogContent sx={{ p: `${PAD * 2.5}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Header: the routine itself */}
        {img
          ? <Box component="img" src={img} alt="" sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          : <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--ink),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestaurantIcon sx={{ color: 'var(--text-2)' }} /></Box>}
        {fixedDish ? (
          <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, mt: `${PAD * 1.25}px`, lineHeight: 1.2 }}>
            {isNew ? `Set up ${routine.dish}` : `Edit ${routine.dish}`}
          </Typography>
        ) : (
          <InputBase value={dish} onChange={e => setDish(e.target.value)} autoFocus placeholder="What do you make?"
            inputProps={{ 'aria-label': 'Dish name', maxLength: 40, style: { textAlign: 'center' } }}
            sx={{ mt: `${PAD * 1.25}px`, width: '100%', color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`,
              borderBottom: '2px solid rgba(var(--ink),0.12)', '&.Mui-focused': { bordercolor: 'var(--accent-text)' },
              '& input::placeholder': { color: 'var(--text-3)', opacity: 1 } }} />
        )}
        <Typography sx={{ color: uses.length ? 'rgba(var(--ink),0.6)' : 'rgba(var(--ink),0.45)', fontSize: `${T.sub}px`, mt: '4px', lineHeight: 1.5 }}>
          {uses.length ? `Uses ${uses.join(', ')} each time` : dish.trim() ? 'Not linked to pantry items' : 'Coffee, oats, a rice bowl…'}
        </Typography>

        {/* When: one large time, compact day dots */}
        <Box component="input" type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time"
          sx={{ all: 'unset', mt: `${PAD * 2.5}px`, px: `${PAD * 1.5}px`, py: '4px', borderRadius: '14px', cursor: 'pointer',
            color: 'var(--fg)', fontWeight: 800, fontSize: '34px', letterSpacing: '-0.01em', fontFamily: 'inherit', textAlign: 'center',
            '&:hover': { background: 'rgba(var(--ink),0.05)' }, '&:focus-visible': { outline: '2px solid var(--accent)' },
            '&::-webkit-calendar-picker-indicator': { opacity: 0.45, cursor: 'pointer' } }} />
        <Box sx={{ mt: `${PAD * 1.5}px` }}>
          <DayDots days={days} onToggle={toggle} size={32} />
        </Box>

        {/* Servings: one quiet inline stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mt: `${PAD * 2.5}px` }}>
          <Typography sx={label}>Servings</Typography>
          <Box role="group" aria-label="Servings" sx={{ display: 'flex', alignItems: 'center', height: 32, borderRadius: '16px', background: 'rgba(var(--ink),0.07)' }}>
            <IconButton size="small" aria-label="Fewer servings" onClick={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1} sx={{ color: 'var(--fg)', width: 32, height: 32 }}><RemoveIcon sx={{ fontSize: 16 }} /></IconButton>
            <Typography aria-live="polite" sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, minWidth: 24, textAlign: 'center' }}>{servings}</Typography>
            <IconButton size="small" aria-label="More servings" onClick={() => setServings(s => Math.min(12, s + 1))} sx={{ color: 'var(--fg)', width: 32, height: 32 }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        </Box>

        {/* One crisp CTA; Cancel / Delete as quiet text */}
        <Button fullWidth disabled={!valid}
          onClick={() => onSave({ ...routine, dish: dish.trim(), time, days, servings, ...linked })}
          sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>
          {isNew ? 'Add routine' : 'Save'}
        </Button>
        <Box sx={{ display: 'flex', gap: `${PAD * 3}px`, mt: `${PAD * 1.25}px` }}>
          <Box component="button" type="button" onClick={onClose}
            sx={{ all: 'unset', cursor: 'pointer', color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600, '&:hover': { color: 'var(--fg)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
            Cancel
          </Box>
          {!isNew && (
            <Box component="button" type="button" onClick={onDelete}
              sx={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', fontSize: `${T.body}px`, fontWeight: 600, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
              Delete
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default function RoutinePage({ onBack, routineKey, onChanged }) {
  const [routines, setRoutines] = useState(() => loadRoutines(routineKey))
  const [editing, setEditing] = useState(null) // routine object, or {} for new
  const [snack, setSnack] = useState('')

  useEffect(() => { setRoutines(loadRoutines(routineKey)) }, [routineKey])

  // Persist and tell the app, so pantry + menu pick up the change.
  const commit = (next, msg) => {
    saveRoutines(routineKey, next)
    setRoutines(next)
    onChanged?.()
    if (msg) setSnack(msg)
  }

  const toggleDay = (id, day) => commit(routines.map(r => (r.id !== id ? r : {
    ...r, days: r.days.includes(day) ? r.days.filter(d => d !== day) : [...r.days, day].sort(),
  })))

  const save = (r) => {
    if (r.id) commit(routines.map(x => (x.id === r.id ? r : x)), `${r.dish} updated`)
    else commit([...routines, { ...r, id: `r-${Date.now()}` }], `${r.dish} added to your routine`)
    setEditing(null)
  }

  const remove = () => {
    commit(routines.filter(x => x.id !== editing.id), `${editing.dish} removed`)
    setEditing(null)
  }

  const sorted = [...routines].sort((a, b) => a.time.localeCompare(b.time))
  const showSamples = sorted.length === 0

  // Samples open as a new routine, prefilled, with no days picked yet.
  const openEditor = (r) => {
    if (r.sample) {
      const { id: _id, sample: _s, ...rest } = r
      setEditing({ ...rest, days: [] })
    } else setEditing(r)
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${PAD}px`, mt: `${PAD}px` }}>
          <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px` }}>Routine</Typography>
          <Button onClick={() => setEditing({})} startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />} sx={pillPrimary}>
            New routine
          </Button>
        </Box>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
          {showSamples ? 'Examples below. Tap one to set it up.' : 'We keep your pantry stocked for these. Tap one to change days.'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD * 0.5}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {(showSamples ? SAMPLE_ROUTINES : sorted).map(r => <RoutineCard key={r.id} routine={r} onEdit={openEditor} onToggleDay={toggleDay} />)}
        <Box sx={{ height: `${PAD}px` }} />
      </Box>

      {editing && (
        <RoutineDialog key={editing.id || 'new'} routine={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      )}

      <Snackbar open={!!snack} autoHideDuration={2200} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
