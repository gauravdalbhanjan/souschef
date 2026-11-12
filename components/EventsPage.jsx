import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box, Typography, Button, Chip, IconButton, Dialog, DialogContent, Snackbar,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GoBackButton from './GoBackButton'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'
import { localCatalog } from '../lib/localCatalog.js'
import {
  EVENTS, LEAD_DAYS, nextDate, daysUntil, loadPlans, savePlans, computeNeeds, syncEventStock, isoDay,
} from '../lib/events.js'

const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const fmtShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const whenLabel = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`)

const chipSx = (on) => ({
  background: on ? C.amber : 'rgba(255,255,255,0.12)', color: on ? '#1a1000' : '#fff',
  border: on ? 'none' : '1px solid rgba(255,255,255,0.22)',
  fontWeight: 700, fontSize: `${T.sub}px`, height: 28, borderRadius: '14px', cursor: 'pointer',
  '& .MuiChip-label': { px: '8px' },
  '& .MuiChip-icon': { fontSize: '15px', color: on ? '#1a1000' : '#fff', ml: '6px' },
  '&:hover': { background: on ? C.amberDark : 'rgba(255,255,255,0.2)' },
  '&.Mui-disabled': { opacity: 0.45 },
})

function EventCard({ event, plan, pantry, onPlan, onToggleReminder, onAddNow }) {
  const date = nextDate(event)
  const days = daysUntil(date)
  const planned = !!plan?.planned
  const reminder = planned && !!plan?.reminder
  const needs = planned ? computeNeeds(plan, pantry) : []
  const { recipes } = localCatalog()
  const dishNames = (plan?.dishes || []).map(s => recipes.find(r => r.slug === s)?.name).filter(Boolean)
  const stockDay = new Date(date); stockDay.setDate(stockDay.getDate() - LEAD_DAYS)
  const stocked = plan?.stockedFor === isoDay(date)

  return (
    <Box sx={{ ...glass('neutral', { radius: 20, blur: 18, a: 0.06 }), overflow: 'hidden', mb: `${PAD * 2}px` }}>
      <Box sx={{ position: 'relative', height: 140 }}>
        <Box component="img" src={event.img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.2) 70%, transparent 100%)' }} />
        <Box sx={{ position: 'absolute', left: PAD * 1.5, right: PAD * 1.5, bottom: PAD * 1.25 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, textShadow: '0 2px 6px rgba(0,0,0,.8)' }}>{event.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '2px' }}>
            <CalendarMonthIcon sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: `${T.sub}px`, fontWeight: 600 }}>
              {fmtDate(date)} · {whenLabel(days)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: `${PAD * 1.5}px` }}>
        <Box sx={{ display: 'flex', gap: `${PAD}px`, flexWrap: 'wrap' }}>
          <Chip icon={<EventAvailableIcon />} label={planned ? 'In progress' : 'Plan this'} onClick={() => onPlan(event)} sx={chipSx(planned)} />
          <Chip icon={reminder ? <NotificationsIcon /> : <NotificationsNoneIcon />}
            label={reminder ? 'Reminder set' : 'Remind me'}
            onClick={planned ? () => onToggleReminder(event) : undefined}
            disabled={!planned} sx={chipSx(reminder)} />
        </Box>

        {!planned ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.sub}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
            Tap "Plan this" to pick a menu and guest count. We'll work out what to buy.
          </Typography>
        ) : (
          <Box sx={{ mt: `${PAD * 1.25}px` }}>
            <Typography sx={{ color: '#fff', fontSize: `${T.body}px`, fontWeight: 600, lineHeight: 1.5 }}>
              {dishNames.join(', ')} · {plan.guests} guest{plan.guests === 1 ? '' : 's'}
            </Typography>
            <Typography sx={{ color: needs.length ? C.amber : '#7ee0ae', fontSize: `${T.sub}px`, fontWeight: 700, mt: '2px' }}>
              {needs.length ? `${needs.length} item${needs.length === 1 ? '' : 's'} to buy` : 'Your pantry already covers this menu'}
            </Typography>
            {needs.length > 0 && (
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.sub}px`, mt: '2px', lineHeight: 1.5 }}>
                {needs.map(n => `${n.display} ${n.quantity} ${n.unit}`).join(' · ')}
              </Typography>
            )}
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mt: `${PAD * 0.75}px`, lineHeight: 1.5 }}>
              {!reminder
                ? 'Turn on "Remind me" and your pantry manager will add these to your cart as the day gets closer.'
                : stocked
                  ? 'The missing items are in your cart.'
                  : `Your pantry manager will add the missing items to your cart on ${fmtShort(stockDay)} (${LEAD_DAYS} days before).`}
            </Typography>
            {needs.length > 0 && !stocked && (
              <Button onClick={() => onAddNow(event, needs)} startIcon={<ShoppingCartIcon />}
                sx={{ mt: `${PAD}px`, ...glass('amber', { radius: 22, blur: 12, a: 0.28 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.sub}px`, px: 2, '&:hover': { background: 'rgba(245,166,35,0.45)' } }}>
                Add to cart now
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

function PlanDialog({ event, plan, onClose, onSave, onRemove }) {
  const { recipes } = localCatalog()
  const [dishes, setDishes] = useState(plan?.dishes || [])
  const [guests, setGuests] = useState(plan?.guests || 4)
  if (!event) return null
  const toggle = (slug) => setDishes(d => (d.includes(slug) ? d.filter(x => x !== slug) : [...d, slug]))

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs"
      slotProps={{ paper: { sx: { background: 'rgba(18,22,30,0.92)', backdropFilter: 'blur(30px)', border: `1px solid ${C.glassBorder}`, borderRadius: '20px' } } }}>
      <DialogContent sx={{ p: `${PAD * 2.5}px` }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px` }}>Plan {event.name}</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.sub}px`, mt: '2px', mb: `${PAD * 2}px` }}>
          Pick the dishes you'll cook and how many people you're feeding.
        </Typography>

        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: `${T.sub}px`, fontWeight: 700, mb: `${PAD}px` }}>Menu</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${PAD}px` }}>
          {event.menu.map(slug => {
            const r = recipes.find(x => x.slug === slug)
            if (!r) return null
            const on = dishes.includes(slug)
            return (
              <Box key={slug} component="button" type="button" onClick={() => toggle(slug)} aria-pressed={on}
                sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, p: `${PAD}px`, borderRadius: '14px',
                  border: on ? `1px solid ${C.amberGlassBorder}` : '1px solid rgba(255,255,255,0.12)',
                  background: on ? C.amberGlass : 'rgba(255,255,255,0.04)' }}>
                <Box component="img" src={r.image} alt="" sx={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.body}px` }}>{r.name}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px` }}>{r.time_mins} mins · serves {r.servings}</Typography>
                </Box>
                {on && <CheckCircleIcon sx={{ color: C.amber }} />}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: `${PAD * 2}px` }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: `${T.sub}px`, fontWeight: 700 }}>Guests</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
            <IconButton aria-label="Fewer guests" onClick={() => setGuests(g => Math.max(1, g - 1))} sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}><RemoveIcon fontSize="small" /></IconButton>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, minWidth: 32, textAlign: 'center' }}>{guests}</Typography>
            <IconButton aria-label="More guests" onClick={() => setGuests(g => Math.min(50, g + 1))} sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}><AddIcon fontSize="small" /></IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: `${PAD}px`, mt: `${PAD * 2.5}px` }}>
          {plan?.planned
            ? <Button onClick={onRemove} sx={{ color: '#ff8a8a', textTransform: 'none', fontWeight: 600 }}>Remove plan</Button>
            : <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}>Cancel</Button>}
          <Button fullWidth disabled={!dishes.length} onClick={() => onSave({ dishes, guests })}
            sx={{ ...glass('amber', { radius: 24, blur: 12, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 800, '&:hover': { background: 'rgba(245,166,35,0.5)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' } }}>
            {dishes.length ? 'Save plan' : 'Pick at least one dish'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default function EventsPage({ onBack, planKey }) {
  // Every user starts with nothing selected: no plans until they make them.
  const [plans, setPlans] = useState(() => loadPlans(planKey))
  const [pantry, setPantry] = useState([])
  const [editing, setEditing] = useState(null)
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

  const sorted = useMemo(() => [...EVENTS].sort((a, b) => nextDate(a) - nextDate(b)), [])

  // Turning "Remind me" on inside the stocking window stocks the cart right
  // away instead of waiting for the next app open.
  const toggleReminder = async (event) => {
    const on = !plans[event.id]?.reminder
    const next = { ...plans, [event.id]: { ...(plans[event.id] || {}), reminder: on } }
    savePlans(planKey, next)
    setPlans(next)
    if (!on || daysUntil(nextDate(event)) > LEAD_DAYS) return
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
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 2}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.heading}px`, mt: `${PAD * 1.5}px` }}>Events</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, mt: '2px' }}>
          Plan a menu and we'll stock your pantry as the day gets closer
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {sorted.map(ev => (
          <EventCard key={ev.id} event={ev} plan={plans[ev.id]} pantry={pantry}
            onPlan={(e) => setEditing(e)}
            onToggleReminder={toggleReminder}
            onAddNow={addNow} />
        ))}
        <Box sx={{ height: `${PAD}px` }} />
      </Box>

      {editing && (
        <PlanDialog key={editing.id} event={editing} plan={plans[editing.id]}
          onClose={() => setEditing(null)}
          onRemove={() => { update(editing.id, null); setEditing(null) }}
          onSave={({ dishes, guests }) => {
            // New menu/guest count -> allow the pantry manager to stock again.
            update(editing.id, { planned: true, dishes, guests, stockedFor: null })
            setEditing(null)
          }} />
      )}

      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: 'rgba(46,158,107,0.92)', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
