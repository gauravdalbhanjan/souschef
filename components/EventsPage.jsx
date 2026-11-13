import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box, Typography, Button, IconButton, Dialog, DialogContent, Snackbar, Menu, MenuItem, ListItemIcon, TextField,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import GoBackButton from './GoBackButton'
import { C, glass, glassField, T, PAD } from '../theme'
import { resolveDish, ingredientsFor } from '../lib/routines.js'
import { pillPrimary, pillSecondary, surface, ArrowScroller, softBackdrop, ctaPrimary } from './Ambient'
import { api } from '../api'
import { localCatalog } from '../lib/localCatalog.js'
import { unitLabel } from '../units'
import {
  allEvents, CUSTOM_KEY, SCHEDULE_OPTIONS, scheduleLabel, nextDate, daysUntil, loadPlans, savePlans,
  computeNeeds, syncEventStock, isoDay, planDishNames,
} from '../lib/events.js'
import CelebrationIcon from '@mui/icons-material/Celebration'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { classicsFor } from '../lib/eventDishes.js'
import { metaFor } from '../lib/recipeMeta.js'
import SearchIcon from '@mui/icons-material/Search'
import InputBase from '@mui/material/InputBase'

const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const fmtShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const whenLabel = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`)

// Status shown top-right on the event photo.
function statusOf(planned, stocked, leadDays) {
  if (!planned) return { label: 'Not planned', bg: 'rgba(0,0,0,0.55)', fg: '#fff' }
  if (stocked) return { label: 'Cart ready', bg: '#166534', fg: '#fff' }
  if (leadDays != null) return { label: 'Scheduled', bg: C.amber, fg: 'var(--accent-fg)' }
  return { label: 'Planned', bg: '#3b6fe0', fg: '#fff' }
}

// Light inline trigger that always shows the current setting
// ("Cart: 3 days before" / "Auto-add: Off"); opens a popover list below it.
function ScheduleSelect({ value, disabled, onChange }) {
  const [anchor, setAnchor] = useState(null)
  const on = value != null
  return (
    <>
      <Box component="button" type="button" disabled={disabled} onClick={e => setAnchor(e.currentTarget)}
        aria-haspopup="menu" aria-expanded={!!anchor} aria-label={`Auto-add missing items to cart: ${scheduleLabel(value)}`}
        sx={{
          all: 'unset', boxSizing: 'border-box', ...pillSecondary, px: '12px', gap: '4px',
          color: on ? 'var(--accent)' : 'rgba(var(--ink),0.75)', opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}>
        <ScheduleIcon sx={{ fontSize: 15 }} />
        <Typography component="span" sx={{ fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {on ? `Cart: ${scheduleLabel(value)}` : 'Auto-add: Off'}
        </Typography>
        <ExpandMoreIcon sx={{ fontSize: 16, transform: anchor ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} marginThreshold={12}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: '6px', background: 'var(--paper)', backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: '14px', minWidth: 210 } } }}>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px`, fontWeight: 700, letterSpacing: '0.04em', px: 2, pt: 0.5, pb: 1 }}>
          ADD MISSING ITEMS TO CART
        </Typography>
        {SCHEDULE_OPTIONS.map(o => (
          <MenuItem key={String(o.days)} selected={o.days === value} onClick={() => { onChange(o.days); setAnchor(null) }}
            sx={{ color: 'var(--fg)', fontSize: `${T.body + 1}px`, minHeight: 40, '&.Mui-selected': { background: 'rgba(var(--accent-rgb),0.12)' } }}>
            <ListItemIcon sx={{ minWidth: 26, color: 'var(--accent-text)' }}>{o.days === value ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

function EventCard({ event, plan, pantry, onPlan, onSchedule, onAddNow, onDelete }) {
  const date = nextDate(event)
  const days = daysUntil(date)
  const planned = !!plan?.planned
  const leadDays = planned ? (plan.leadDays ?? null) : null
  const needs = planned ? computeNeeds(plan, pantry, event.id) : []
  const dishNames = planDishNames(event.id, plan)
  const stocked = plan?.stockedFor === isoDay(date)
  const status = statusOf(planned, stocked, leadDays)
  const addDay = leadDays != null ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - leadDays) : null

  let note = 'Plan a menu and we\u2019ll work out what to buy.'
  if (planned) {
    if (!needs.length) note = 'Your pantry already covers this menu.'
    else if (stocked) note = 'The missing items are in your cart.'
    else if (leadDays == null) note = 'Pick when to auto-add these to your cart, or'
    else note = `Goes to your cart on ${fmtShort(addDay)}.`
  }

  return (
    <Box sx={{ ...surface, overflow: 'hidden', mb: `${PAD * 1.5}px` }}>
      <Box sx={{ position: 'relative', height: 108 }}>
        {event.img
          ? <Box component="img" src={event.img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (
            // Your own event: warm amber-to-indigo backdrop + a celebration mark.
            <Box aria-hidden sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: '20px',
              background: 'linear-gradient(135deg, #B45309 0%, #7C2D12 45%, #312E81 100%)' }}>
              <CelebrationIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.28)' }} />
            </Box>
          )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.85) 100%)' }} />
        {event.custom && (
          <IconButton size="small" onClick={() => onDelete(event)} aria-label={`Delete ${event.name}`}
            sx={{ position: 'absolute', top: PAD * 0.75, left: PAD * 0.75, width: 32, height: 32, color: '#fff', background: 'rgba(0,0,0,0.45)', '&:hover': { background: 'rgba(0,0,0,0.65)' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <Box sx={{ position: 'absolute', top: PAD, right: PAD, background: status.bg, color: status.fg, borderRadius: '10px', px: '8px', py: '3px' }}>
          <Typography component="span" sx={{ fontSize: `${T.chip}px`, fontWeight: 800 }}>{status.label}</Typography>
        </Box>
        <Box sx={{ position: 'absolute', left: PAD * 1.5, right: PAD * 1.5, bottom: PAD }}>
          <Typography component="h2" sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, lineHeight: 1.15, textShadow: '0 2px 6px rgba(0,0,0,.8)' }}>{event.name}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: `${T.sub}px`, fontWeight: 600, mt: '2px' }}>
            {fmtDate(date)} · {whenLabel(days)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: `${PAD * 1.5}px`, pt: `${PAD * 1.25}px`, pb: `${PAD * 1.25}px` }}>
        {planned && (
          <Typography sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, fontWeight: 600, lineHeight: 1.45 }}>
            {dishNames.join(', ')} · {plan.guests} guest{plan.guests === 1 ? '' : 's'}
          </Typography>
        )}
        {planned && needs.length > 0 && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '4px', lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <Box component="span" sx={{ color: 'var(--accent-text)', fontWeight: 700 }}>{needs.length} to buy: </Box>
            {needs.map(n => `${n.display} ${n.quantity} ${unitLabel(n.unit)}`).join(' · ')}
          </Typography>
        )}
        <Typography sx={{ color: planned && !needs.length ? 'var(--success)' : 'var(--text-2)', fontSize: `${T.sub}px`, mt: '4px', lineHeight: 1.45 }}>
          {note}
          {planned && needs.length > 0 && !stocked && leadDays == null && (
            <>
              {' '}
              <Box component="button" type="button" onClick={() => onAddNow(event, needs)}
                sx={{ all: 'unset', cursor: 'pointer', color: 'var(--accent-text)', fontWeight: 700, textDecoration: 'underline' }}>
                add them now
              </Box>.
            </>
          )}
        </Typography>

        {/* Primary action left, light schedule trigger right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${PAD}px`, mt: `${PAD * 1.25}px` }}>
          <Button onClick={() => onPlan(event)} startIcon={planned ? <EditCalendarIcon sx={{ fontSize: '16px !important' }} /> : <EventAvailableIcon sx={{ fontSize: '16px !important' }} />}
            sx={pillPrimary}>
            {planned ? 'Edit menu' : 'Plan menu'}
          </Button>
          {planned && <ScheduleSelect value={leadDays} onChange={d => onSchedule(event, d)} />}
        </Box>
      </Box>
    </Box>
  )
}

// Compact, borderless dish row: thumbnail · name · time inline · check.
function DishRow({ name, image, meta, on, onToggle }) {
  return (
    <Box component="button" type="button" onClick={onToggle} aria-pressed={on}
      sx={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`,
        px: `${PAD}px`, py: `${PAD * 0.75}px`, borderRadius: '12px',
        background: on ? 'rgba(var(--accent-rgb),0.14)' : 'transparent',
        '&:hover': { background: on ? 'rgba(var(--accent-rgb),0.18)' : 'rgba(var(--ink),0.05)' },
        '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 1 } }}>
      {image
        ? <Box component="img" src={image} alt="" sx={{ width: 36, height: 36, borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
        : <Box sx={{ width: 36, height: 36, borderRadius: '9px', flexShrink: 0, background: 'rgba(var(--ink),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestaurantIcon sx={{ fontSize: 18, color: 'var(--text-2)' }} /></Box>}
      <Typography sx={{ flex: 1, minWidth: 0, color: 'var(--fg)', fontWeight: 600, fontSize: `${T.body + 1}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</Typography>
      <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, flexShrink: 0 }}>{meta}</Typography>
      <Box sx={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {on ? <CheckCircleIcon sx={{ color: 'var(--accent-text)', fontSize: 20 }} /> : <AddIcon sx={{ color: 'var(--text-3)', fontSize: 18 }} />}
      </Box>
    </Box>
  )
}

const FILTERS = ['Classics', 'Mains', 'Sides', 'Desserts', 'Vegetarian', 'Our recipes']

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }
const tomorrowIso = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDay(d) }

// "+ Add event": a name and a date, same sheet language as "+ New routine".
// Saving goes straight into Plan menu for the new event.
function AddEventDialog({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(tomorrowIso)
  const valid = !!name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date)
  const submit = () => { if (valid) onSave({ name: name.trim().replace(/\s+/g, ' '), date }) }
  const label = { color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 700 }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
      <DialogContent component="form" onSubmit={e => { e.preventDefault(); submit() }}
        sx={{ p: `${PAD * 2.5}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--accent-rgb),0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CelebrationIcon sx={{ color: 'var(--accent-text)' }} />
        </Box>
        <InputBase value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="What are you celebrating?"
          inputProps={{ 'aria-label': 'Event name', maxLength: 40, style: { textAlign: 'center' } }}
          sx={{ mt: `${PAD * 1.25}px`, width: '100%', color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`,
            borderBottom: '2px solid rgba(var(--ink),0.12)', '& input::placeholder': { color: 'var(--text-3)', opacity: 1 } }} />
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '4px' }}>Birthday, dinner party, game night…</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mt: `${PAD * 2.5}px` }}>
          <Typography component="label" htmlFor="event-date" sx={label}>Date</Typography>
          <Box component="input" id="event-date" type="date" value={date} min={isoDay(new Date())} onChange={e => setDate(e.target.value)}
            sx={{ all: 'unset', px: `${PAD * 1.25}px`, height: 40, borderRadius: '20px', cursor: 'pointer', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)',
              color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body + 1}px`, fontFamily: 'inherit', colorScheme: 'inherit',
              '&:focus-visible': { outline: '2px solid var(--accent)' }, '&::-webkit-calendar-picker-indicator': { opacity: 0.6, cursor: 'pointer' } }} />
        </Box>
        <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.chip}px`, mt: '6px', alignSelf: 'flex-start' }}>Repeats every year on this day.</Typography>

        <Button type="button" fullWidth disabled={!valid} onClick={submit} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>Add event</Button>
        <Box component="button" type="button" onClick={onClose}
          sx={{ all: 'unset', cursor: 'pointer', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600, '&:hover': { color: 'var(--fg)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
          Cancel
        </Box>
      </DialogContent>
    </Dialog>
  )
}

// Plan Menu: event-specific classics first, a search box + filter chips
// instead of a "show all" accordion, guests in the header, one Confirm CTA.
function PlanDialog({ event, plan, onClose, onSave, onRemove }) {
  const { recipes } = localCatalog()
  const [dishes, setDishes] = useState(plan?.dishes || [])
  const [classics, setClassics] = useState(plan?.classics || [])
  const [custom, setCustom] = useState(plan?.custom || [])
  const [guests, setGuests] = useState(plan?.guests || 4)
  const [query, setQuery] = useState('')
  const hasClassics = classicsFor(event?.id).length > 0
  const [filter, setFilter] = useState(hasClassics ? 'Classics' : 'Our recipes')
  if (!event) return null
  const filters = hasClassics ? FILTERS : FILTERS.filter(f => f !== 'Classics')

  const toggleIn = (setter) => (id) => setter(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))
  const toggleDish = toggleIn(setDishes)
  const toggleClassic = toggleIn(setClassics)
  const count = dishes.length + classics.length + custom.length
  const q = query.trim().toLowerCase()

  // Event classics + catalog recipes, filtered by chip and search.
  const classicRows = classicsFor(event.id).map(d => ({ kind: 'classic', id: d.key, name: d.name, time: d.time_mins, tags: d.tags, image: null }))
  const recipeRows = recipes.map(r => {
    const meta = metaFor(r.slug)
    const cats = meta.categories || []
    const tags = ['Our recipes', ...(cats.includes('Mains') ? ['Mains'] : []), ...(cats.includes('Dessert') ? ['Desserts'] : []),
      ...(cats.includes('Salad') || cats.includes('Snack') ? ['Sides'] : []), ...(meta.protein === 'Vegetarian' ? ['Vegetarian'] : [])]
    return { kind: 'recipe', id: r.slug, name: r.name, time: r.time_mins, tags, image: meta.image || r.image }
  })
  const all = [...classicRows, ...recipeRows]
  const rows = q
    ? all.filter(r => r.name.toLowerCase().includes(q))
    : all.filter(r => (filter === 'Classics' ? r.kind === 'classic' : r.tags.includes(filter)))
  const isOn = (r) => (r.kind === 'classic' ? classics.includes(r.id) : dishes.includes(r.id))
  const toggle = (r) => (r.kind === 'classic' ? toggleClassic(r.id) : toggleDish(r.id))

  // Search with no match -> offer to add it as the user's own dish.
  const canAddOwn = q && !all.some(r => r.name.toLowerCase() === q) && !custom.some(c => c.name.toLowerCase() === q)
  const addOwn = () => {
    const name = query.trim().replace(/\s+/g, ' ')
    const link = resolveDish(name)
    if (link.recipeSlug) { if (!dishes.includes(link.recipeSlug)) toggleDish(link.recipeSlug) }
    else setCustom(c => [...c, { name, template: link.template, recipeSlug: null }])
    setQuery('')
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs"
      slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: { background: 'var(--paper)', backgroundImage: 'none', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', borderRadius: '22px', maxHeight: '88svh', display: 'flex', flexDirection: 'column' } } }}>
      {/* Header: event + guests stepper */}
      <Box sx={{ px: `${PAD * 2.25}px`, pt: `${PAD * 2}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${PAD}px` }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, lineHeight: 1.15 }}>{event.name}</Typography>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '2px' }}>{count} dish{count === 1 ? '' : 'es'} picked</Typography>
          </Box>
          <Box role="group" aria-label="Guests" sx={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(var(--ink),0.07)', borderRadius: '18px', px: '2px', flexShrink: 0 }}>
            <IconButton size="small" aria-label="Fewer guests" onClick={() => setGuests(g => Math.max(1, g - 1))} sx={{ color: 'var(--fg)' }}><RemoveIcon fontSize="small" /></IconButton>
            <Typography aria-live="polite" sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, minWidth: 62, textAlign: 'center' }}>{guests} guest{guests === 1 ? '' : 's'}</Typography>
            <IconButton size="small" aria-label="More guests" onClick={() => setGuests(g => Math.min(50, g + 1))} sx={{ color: 'var(--fg)' }}><AddIcon fontSize="small" /></IconButton>
          </Box>
        </Box>

        {/* Inline search (also adds your own dish) */}
        <Box component="form" onSubmit={e => { e.preventDefault(); if (canAddOwn) addOwn() }}
          sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: `${PAD * 1.5}px`, px: `${PAD * 1.25}px`, height: 40, borderRadius: '20px', background: 'rgba(var(--ink),0.07)' }}>
          <SearchIcon sx={{ fontSize: 18, color: 'var(--text-2)' }} />
          <InputBase value={query} onChange={e => setQuery(e.target.value)} placeholder="Search or add your own dish" fullWidth
            inputProps={{ 'aria-label': 'Search dishes or add your own', maxLength: 60 }}
            sx={{ color: 'var(--fg)', fontSize: `${T.body + 1}px`, '& input::placeholder': { color: 'var(--text-2)', opacity: 1 } }} />
          {query && <IconButton size="small" aria-label="Clear search" onClick={() => setQuery('')} sx={{ color: 'var(--text-2)' }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>}
        </Box>

        {/* Filter chips */}
        {!q && (
          <Box role="group" aria-label="Dish filters" sx={{ mt: `${PAD}px` }}>
          <ArrowScroller label="filters" arrowSize={28} inset={0} sx={{ gap: '6px', flexWrap: 'nowrap', alignItems: 'center', py: '2px' }}>
            {filters.map(f => (
              <Box key={f} component="button" type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                sx={{ all: 'unset', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', px: '12px', height: 28, display: 'flex', alignItems: 'center', borderRadius: '14px',
                  fontSize: `${T.sub}px`, fontWeight: 700,
                  background: filter === f ? 'var(--accent)' : 'rgba(var(--ink),0.07)', color: filter === f ? 'var(--accent-fg)' : 'rgba(var(--ink),0.8)',
                  '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                {f === 'Classics' ? `${event.name} classics` : f}
              </Box>
            ))}
          </ArrowScroller>
          </Box>
        )}
      </Box>

      {/* Dish list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD}px`, pb: `${PAD}px` }}>
        {custom.map(c => {
          const uses = ingredientsFor(c).map(i => i.display)
          return (
            <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, px: `${PAD}px`, py: `${PAD * 0.75}px`, borderRadius: '12px', background: 'rgba(var(--accent-rgb),0.14)', mb: '2px' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '9px', flexShrink: 0, background: 'rgba(var(--ink),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestaurantIcon sx={{ fontSize: 18, color: 'var(--text-2)' }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: 'var(--fg)', fontWeight: 600, fontSize: `${T.body + 1}px` }}>{c.name}</Typography>
                <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px` }}>{uses.length ? `Your dish · uses ${uses.join(', ')}` : 'Your dish · no shopping list'}</Typography>
              </Box>
              <IconButton size="small" aria-label={`Remove ${c.name}`} onClick={() => setCustom(list => list.filter(x => x !== c))} sx={{ color: 'var(--text-2)' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </Box>
          )
        })}
        {rows.map(r => (
          <DishRow key={`${r.kind}:${r.id}`} name={r.name} image={r.image} on={isOn(r)} onToggle={() => toggle(r)}
            meta={r.time >= 60 ? `${Math.floor(r.time / 60)}h${r.time % 60 ? ` ${r.time % 60}m` : ''}` : `${r.time} min`} />
        ))}
        {canAddOwn && (
          <Box component="button" type="button" onClick={addOwn}
            sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: `${PAD}px`, width: '100%', px: `${PAD}px`, py: `${PAD}px`, borderRadius: '12px',
              color: 'var(--accent-text)', fontWeight: 700, fontSize: `${T.body + 1}px`, '&:hover': { background: 'rgba(var(--ink),0.05)' } }}>
            <AddIcon sx={{ fontSize: 20 }} /> Add “{query.trim()}” as your own dish
          </Box>
        )}
        {!rows.length && !canAddOwn && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, textAlign: 'center', py: 3 }}>Nothing here yet.</Typography>
        )}
      </Box>

      {/* Footer: one prominent CTA */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, flexShrink: 0 }}>
        <Button onClick={plan?.planned ? onRemove : onClose}
          sx={{ color: plan?.planned ? 'var(--danger)' : 'rgba(var(--ink),0.7)', textTransform: 'none', fontWeight: 600, flexShrink: 0 }}>
          {plan?.planned ? 'Remove' : 'Cancel'}
        </Button>
        <Button disabled={!count} onClick={() => onSave({ dishes, classics, custom, guests })}
          sx={{ ...ctaPrimary, flex: 1, minWidth: 0, px: '16px', whiteSpace: 'nowrap' }}>
          {count ? `Confirm menu · ${count} dish${count === 1 ? '' : 'es'}` : 'Pick at least one dish'}
        </Button>
      </Box>
    </Dialog>
  )
}

export default function EventsPage({ onBack, planKey }) {
  // Every user starts with nothing selected: no plans until they make them.
  const [plans, setPlans] = useState(() => loadPlans(planKey))
  const [pantry, setPantry] = useState([])
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [snack, setSnack] = useState('')

  useEffect(() => { setPlans(loadPlans(planKey)) }, [planKey])
  useEffect(() => { api.pantry().then(setPantry).catch(() => setPantry([])) }, [])

  const update = useCallback((id, patch) => {
    setPlans(prev => {
      const next = { ...prev }
      if (patch === null) delete next[id]
      else next[id] = { ...(prev[id] || {}), ...patch }
      savePlans(planKey, next)
      return next
    })
  }, [planKey])

  const sorted = useMemo(() => allEvents(plans).sort((a, b) => nextDate(a) - nextDate(b)), [plans])

  const addEvent = ({ name, date }) => {
    const c = { id: `custom-${Date.now().toString(36)}`, name, date }
    const next = { ...plans, [CUSTOM_KEY]: [...(plans[CUSTOM_KEY] || []), c] }
    savePlans(planKey, next)
    setPlans(next)
    setAdding(false)
    setEditing(allEvents(next).find(e => e.id === c.id)) // straight into Plan menu
  }
  const deleteEvent = (event) => {
    const next = { ...plans, [CUSTOM_KEY]: (plans[CUSTOM_KEY] || []).filter(c => c.id !== event.id) }
    delete next[event.id]
    savePlans(planKey, next)
    setPlans(next)
    setSnack(`${event.name} deleted`)
  }

  // Choosing a schedule that's already "due" stocks the cart right away.
  const setSchedule = async (event, leadDays) => {
    const next = { ...plans, [event.id]: { ...(plans[event.id] || {}), leadDays } }
    savePlans(planKey, next)
    setPlans(next)
    if (leadDays == null || daysUntil(nextDate(event)) > leadDays) {
      if (leadDays != null) setSnack(`${event.name}: we'll add missing items ${scheduleLabel(leadDays).toLowerCase()}`)
      return
    }
    try {
      const done = (await syncEventStock(planKey, api)).find(x => x.name === event.name)
      setPlans(loadPlans(planKey))
      if (done?.count) setSnack(`${event.name} is close: added ${done.count} item${done.count === 1 ? '' : 's'} to your cart`)
    } catch (e) {
      setSnack(`Couldn't add to cart: ${e.message}`)
    }
  }

  const addNow = async (event, needs) => {
    try {
      await api.addToCart(needs.map(n => ({ ...n, source: `event:${event.name}` })))
      update(event.id, { stockedFor: isoDay(nextDate(event)) }) // don't auto-add these again
      setSnack(`Added ${needs.length} item${needs.length === 1 ? '' : 's'} for ${event.name} to your cart`)
    } catch (e) {
      setSnack(`Couldn't add to cart: ${e.message}`)
    }
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${PAD}px`, mt: `${PAD}px` }}>
          <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px` }}>Events</Typography>
          <Button onClick={() => setAdding(true)} startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />} sx={pillPrimary}>
            Add event
          </Button>
        </Box>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
          Plan a menu, then pick when the missing items go into your cart
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD * 0.5}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {sorted.map(ev => (
          <EventCard key={ev.id} event={ev} plan={plans[ev.id]} pantry={pantry}
            onPlan={(e) => setEditing(e)} onSchedule={setSchedule} onAddNow={addNow} onDelete={deleteEvent} />
        ))}
        <Box sx={{ height: `${PAD}px` }} />
      </Box>

      {adding && <AddEventDialog onClose={() => setAdding(false)} onSave={addEvent} />}

      {editing && (
        <PlanDialog key={editing.id} event={editing} plan={plans[editing.id]}
          onClose={() => setEditing(null)}
          onRemove={() => { update(editing.id, null); setEditing(null) }}
          onSave={({ dishes, classics, custom, guests }) => {
            // New menu/guest count -> allow stocking again; keep any chosen schedule.
            update(editing.id, { planned: true, dishes, classics, custom, guests, stockedFor: null })
            setEditing(null)
          }} />
      )}

      <Snackbar open={!!snack} autoHideDuration={2600} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
