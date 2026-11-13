import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, Button, IconButton, Tabs, Tab, CircularProgress, Snackbar, InputBase, Switch } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import EditIcon         from '@mui/icons-material/Edit'
import AddIcon          from '@mui/icons-material/Add'
import RemoveIcon       from '@mui/icons-material/Remove'
import { unitLabel, suggestUnit } from '../units'
import { setStapleOut } from '../lib/staples.js'
import CameraAltIcon    from '@mui/icons-material/CameraAlt'
import CheckIcon        from '@mui/icons-material/Check'
import SyncIcon         from '@mui/icons-material/Sync'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import GoBackButton     from './GoBackButton'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'
import { surface } from './Ambient'
import { loadRoutines, applyRoutineNeeds, missingForRoutines } from '../lib/routines.js'

const CATEGORY_ORDER = ['Veggies', 'Fruits', 'Meat', 'Dairy', 'Staples', 'Spices', 'Other']

function daysLabel(d) {
  if (d <= 0) return 'Out'
  if (d === 1) return '1 Day'
  if (d < 7) return `${d} Days`
  if (d < 14) return '1 Week'
  if (d < 30) return `${Math.round(d / 7)} Weeks`
  if (d < 60) return '1 Month'
  return `${Math.round(d / 30)} Months`
}

const RED = 'var(--danger)'
const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }
const YELLOW = 'var(--accent)'

// Step size for the quick quantity stepper, by unit.
function stepFor(unit) {
  const u = String(unit || '').toLowerCase()
  if (['g', 'ml'].includes(u)) return 50
  if (['lb', 'kg', 'l', 'gal', 'qt', 'pt', 'cup'].includes(u)) return 0.25
  return 1 // each, oz, can, pack, dozen, bunch...
}
const roundQty = (n) => Math.round(n * 100) / 100

// One inventory row: thumb · name + (qty, dishes, days left, Edit) · Add to cart.
// Running-low items (see decoratePantry in api.js) get a red indicator + reason
// and a yellow "Add to cart". Edit opens an inline stepper to fix the amount.
function Row({ item, inCart, onAdd, editing, onEdit, onCancel, onSave }) {
  const low = item.lowStock
  const step = stepFor(item.unit)
  const [qty, setQty] = useState(String(roundQty(Number(item.quantity) || 0)))
  const [saving, setSaving] = useState(false)
  const n = Number(qty)
  const valid = qty.trim() !== '' && Number.isFinite(n) && n >= 0
  const bump = (d) => setQty(q => String(roundQty(Math.max(0, (Number(q) || 0) + d))))
  const save = async () => {
    if (!valid) return
    setSaving(true)
    try { await onSave(item, roundQty(n)) } finally { setSaving(false) }
  }
  const metaSx = { fontSize: `${T.sub}px`, whiteSpace: 'nowrap' }
  const unit = unitLabel(item.unit)

  return (
    <Box sx={{ py: `${PAD * 1.25}px`, px: `${PAD * 1.5}px`, borderBottom: '1px solid rgba(var(--ink),.06)', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px` }}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          {item.image
            ? <Box component="img" src={item.image} alt="" sx={{ width: 46, height: 46, borderRadius: '12px', objectFit: 'cover', display: 'block' }} />
            : <Box sx={{ width: 46, height: 46, borderRadius: '12px', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: `${T.title}px`, fontWeight: 700 }}>{item.display?.[0]}</Box>}
          {low && (
            <Box aria-hidden sx={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: RED, border: '2px solid var(--canvas-base)' }} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.title + 3}px`, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.display}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, mt: '3px', color: 'var(--text-2)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography sx={{ ...metaSx, color: 'var(--fg)', fontWeight: 700, flexShrink: 0 }}>{roundQty(Number(item.quantity) || 0)} {unit}</Typography>
            {/* Edit sits next to the quantity it changes, so it never gets clipped */}
            {!editing && (
              <Box component="button" type="button" onClick={() => { setQty(String(roundQty(Number(item.quantity) || 0))); onEdit(item) }}
                aria-label={`Edit ${item.display} quantity`}
                sx={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '3px', height: 24, px: '8px', borderRadius: '12px',
                  background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', color: 'var(--fg)', fontSize: `${T.chip}px`, fontWeight: 700,
                  '&:hover': { background: 'var(--surface-hover)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                <EditIcon sx={{ fontSize: 12 }} /> Edit
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, minWidth: 0, overflow: 'hidden' }}>
            {low ? (
              <Typography sx={{ ...metaSx, color: RED, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Box component="span" sx={visuallyHidden}>Running low: </Box>{item.lowReason}
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <SyncIcon sx={{ fontSize: 13, opacity: 0.8 }} />
                  <Typography sx={metaSx}>{item.dishCount} {item.dishCount === 1 ? 'Dish' : 'Dishes'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <TrendingDownIcon sx={{ fontSize: 13, opacity: 0.8 }} />
                  <Typography sx={metaSx}>{daysLabel(item.daysLeft)}</Typography>
                </Box>
              </>
            )}
            </Box>
          </Box>
        </Box>

        {!editing && (
          <Button
            onClick={() => onAdd(item)}
            disabled={inCart}
            startIcon={inCart ? <CheckIcon sx={{ fontSize: '15px !important' }} /> : <ShoppingCartIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              flexShrink: 0, minWidth: 0, borderRadius: '22px', textTransform: 'none', whiteSpace: 'nowrap',
              fontWeight: 700, fontSize: `${T.sub}px`, px: `${PAD * 1.25}px`, py: `${PAD * 0.75}px`,
              '& .MuiButton-startIcon': { mr: '4px' },
              ...(inCart
                ? { background: 'rgba(46,158,107,0.2)', border: '1px solid rgba(46,158,107,0.5)', color: 'var(--fg)' }
                : low
                  ? { background: YELLOW, color: 'var(--accent-fg)', border: 'none' }
                  : { background: 'var(--surface-strong)', border: '1px solid rgba(var(--ink),0.22)', color: 'var(--fg)' }),
              '&:hover': { background: inCart ? 'rgba(46,158,107,0.2)' : low ? 'var(--accent-strong)' : 'var(--surface-hover)' },
              '&.Mui-disabled': { color: 'var(--fg)', opacity: 0.9 },
            }}
          >
            {inCart ? 'In cart' : 'Add to cart'}
          </Button>
        )}
      </Box>

      {/* Inline quick-quantity editor */}
      {editing && (
        <Box component="form" onSubmit={e => { e.preventDefault(); save() }}
          sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, mt: `${PAD * 1.25}px`, pl: '58px', flexWrap: 'wrap' }}>
          <Box role="group" aria-label={`${item.display} quantity`}
            sx={{ display: 'flex', alignItems: 'center', height: 40, borderRadius: '20px', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)' }}>
            <IconButton size="small" aria-label={`Decrease by ${step} ${unit}`} onClick={() => bump(-step)} disabled={!valid || n <= 0} sx={{ color: 'var(--fg)', width: 40, height: 40 }}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <InputBase value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus
              inputProps={{ inputMode: 'decimal', 'aria-label': `Quantity in ${unit}`, style: { textAlign: 'center', padding: 0 } }}
              sx={{ width: 52, color: 'var(--fg)', fontWeight: 800, fontSize: `${T.body + 2}px`, fontVariantNumeric: 'tabular-nums' }} />
            <Typography aria-hidden sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, pr: '2px' }}>{unit}</Typography>
            <IconButton size="small" aria-label={`Increase by ${step} ${unit}`} onClick={() => bump(step)} sx={{ color: 'var(--fg)', width: 40, height: 40 }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: '6px', ml: 'auto' }}>
            <Button type="button" onClick={onCancel} sx={{ color: 'var(--text-2)', textTransform: 'none', fontWeight: 700, minWidth: 0, px: '10px' }}>Cancel</Button>
            <Button type="submit" disabled={!valid || saving}
              sx={{ height: 40, px: '18px', borderRadius: '20px', textTransform: 'none', fontWeight: 800, fontSize: `${T.body}px`, background: YELLOW, color: 'var(--accent-fg)',
                '&:hover': { background: 'var(--accent-strong)' }, '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.4)', color: 'var(--accent-fg)' } }}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// One assumed staple: [status] [name · used in N recipes · tracked amount]
// [Edit amount] [Have it switch]. Off = "I'm out": recipes count it as missing.
function StapleRow({ staple, editing, onEdit, onCancel, onSaveQty, onToggle }) {
  const have = !staple.out
  const unit = staple.tracked?.unit || toStoredUnit(suggestUnit(staple.display).unit)
  const label = unitLabel(unit)
  const step = stepFor(unit)
  const start = String(roundQty(Number(staple.tracked?.quantity) || 0))
  const [qty, setQty] = useState(start)
  const [busy, setBusy] = useState(false)
  const n = Number(qty)
  const valid = qty.trim() !== '' && Number.isFinite(n) && n >= 0
  const bump = (d) => setQty(q => String(roundQty(Math.max(0, (Number(q) || 0) + d))))
  const save = async () => { if (!valid) return; setBusy(true); try { await onSaveQty(staple, roundQty(n), unit) } finally { setBusy(false) } }
  const amount = staple.tracked ? `${roundQty(Number(staple.tracked.quantity) || 0)} ${unitLabel(staple.tracked.unit)}` : 'Not tracked'
  const uses = staple.recipes.length

  return (
    <Box component="li" sx={{ py: `${PAD * 1.25}px`, px: `${PAD * 1.5}px`, borderBottom: '1px solid rgba(var(--ink),.06)', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px` }}>
        <Box aria-hidden sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: have ? 'rgba(34,197,94,0.18)' : 'transparent', border: have ? 'none' : '2px solid var(--danger)' }}>
          {have && <CheckIcon sx={{ fontSize: 17, color: 'var(--success)' }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.title + 2}px`, lineHeight: 1.2 }}>{staple.display}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, mt: '3px', flexWrap: 'wrap' }}>
            <Typography title={staple.recipes.join(', ')} sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, whiteSpace: 'nowrap' }}>
              {uses} recipe{uses === 1 ? '' : 's'}
            </Typography>
            <Typography sx={{ color: have ? 'var(--fg)' : 'var(--danger)', fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {have ? amount : 'Out \u00b7 counted as missing'}
            </Typography>
            {!editing && (
              <Box component="button" type="button" onClick={() => { setQty(start); onEdit() }} aria-label={`Edit ${staple.display} amount`}
                sx={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '3px', height: 24, px: '8px', borderRadius: '12px',
                  background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', color: 'var(--fg)', fontSize: `${T.chip}px`, fontWeight: 700,
                  '&:hover': { background: 'var(--surface-hover)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                <EditIcon sx={{ fontSize: 12 }} /> {staple.tracked ? 'Edit' : 'Set amount'}
              </Box>
            )}
          </Box>
        </Box>
        <Switch checked={have} onChange={e => onToggle(staple, e.target.checked)}
          slotProps={{ input: { 'aria-label': `${staple.display}: ${have ? 'in your kitchen' : 'out'}` } }}
          sx={{ flexShrink: 0,
            '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent)' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { background: 'var(--accent)', opacity: 0.55 },
            '& .MuiSwitch-track': { background: 'rgba(var(--ink),0.35)' } }} />
      </Box>

      {editing && (
        <Box component="form" onSubmit={e => { e.preventDefault(); save() }}
          sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, mt: `${PAD * 1.25}px`, pl: '40px', flexWrap: 'wrap' }}>
          <Box role="group" aria-label={`${staple.display} amount`}
            sx={{ display: 'flex', alignItems: 'center', height: 40, borderRadius: '20px', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)' }}>
            <IconButton size="small" aria-label={`Decrease by ${step} ${label}`} onClick={() => bump(-step)} disabled={!valid || n <= 0} sx={{ color: 'var(--fg)', width: 40, height: 40 }}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <InputBase value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus
              inputProps={{ inputMode: 'decimal', 'aria-label': `Amount in ${label}`, style: { textAlign: 'center', padding: 0 } }}
              sx={{ width: 52, color: 'var(--fg)', fontWeight: 800, fontSize: `${T.body + 2}px`, fontVariantNumeric: 'tabular-nums' }} />
            <Typography aria-hidden sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, pr: '2px' }}>{label}</Typography>
            <IconButton size="small" aria-label={`Increase by ${step} ${label}`} onClick={() => bump(step)} sx={{ color: 'var(--fg)', width: 40, height: 40 }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: '6px', ml: 'auto' }}>
            <Button type="button" onClick={onCancel} sx={{ color: 'var(--text-2)', textTransform: 'none', fontWeight: 700, minWidth: 0, px: '10px' }}>Cancel</Button>
            <Button type="submit" disabled={!valid || busy}
              sx={{ height: 40, px: '18px', borderRadius: '20px', textTransform: 'none', fontWeight: 800, fontSize: `${T.body}px`, background: YELLOW, color: 'var(--accent-fg)',
                '&:hover': { background: 'var(--accent-strong)' }, '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.4)', color: 'var(--accent-fg)' } }}>
              {busy ? 'Saving\u2026' : 'Save'}
            </Button>
          </Box>
          <Typography sx={{ width: '100%', color: 'var(--text-3)', fontSize: `${T.chip}px` }}>
            Tracked amounts go down as you cook. Set 0 if you've run out.
          </Typography>
        </Box>
      )}
    </Box>
  )
}

const toStoredUnit = (u) => (u === 'each' ? 'unit' : u === 'fl oz' ? 'floz' : u)

export default function InventoryPage({ onBack, onAddGroceries, onViewCart, routineKey, onStaplesChanged }) {
  const [items, setItems] = useState([])
  const [routineMissing, setRoutineMissing] = useState([])
  const [cartKeys, setCartKeys] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [view, setView] = useState('inventory') // inventory | staples
  const [staples, setStaples] = useState([])
  const [editingStaple, setEditingStaple] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pantry, cart, st] = await Promise.all([api.pantry(), api.cart(), api.staples()])
      setStaples(st)
      // Routines draw from the pantry: flag items that won't last the week and
      // list routine ingredients that aren't in the pantry at all.
      const routines = loadRoutines(routineKey)
      setItems(applyRoutineNeeds(pantry, routines))
      setRoutineMissing(missingForRoutines(pantry, routines))
      setCartKeys(new Set(cart.map(c => c.canonical)))
    } finally { setLoading(false) }
  }, [routineKey])

  const addRoutineMissing = async () => {
    const todo = routineMissing.filter(m => !cartKeys.has(m.canonical))
    if (!todo.length) return
    setCartKeys(prev => new Set([...prev, ...todo.map(t => t.canonical)]))
    try {
      await api.addToCart(todo.map(m => ({ display: m.display, canonical: m.canonical, quantity: m.quantity, unit: m.unit, source: 'routine' })))
      setSnack(`Added ${todo.length} routine item${todo.length === 1 ? '' : 's'} to cart`)
    } catch { load() }
  }
  useEffect(() => { load() }, [load])

  const addToCart = async (item) => {
    setCartKeys(prev => new Set(prev).add(item.canonical))
    try {
      await api.addToCart([{ display: item.display, canonical: item.canonical, quantity: item.quantity || 1, unit: item.unit, category: item.category, source: 'pantry' }])
      setSnack(`${item.display} added to cart`)
    } catch { load() }
  }

  // Quick quantity fix from the inline stepper.
  const saveQty = async (item, quantity) => {
    try {
      await api.updatePantry(item.id, quantity)
      setEditingId(null)
      setSnack(`${item.display} updated to ${quantity} ${unitLabel(item.unit)}`)
      await load()
    } catch (e) { setSnack(`Couldn't update ${item.display}: ${e.message}`) }
  }

  // ── Staples ───────────────────────────────────────────────────────────────
  const toggleStaple = async (st, have) => {
    setStapleOut(st.canonical, !have)
    setStaples(list => list.map(s => (s.canonical === st.canonical ? { ...s, out: !have } : s)))
    setSnack(have ? `${st.display} is back in your kitchen` : `Out of ${st.display.toLowerCase()}: recipes now count it as missing`)
    onStaplesChanged?.()
  }
  // A tracked amount is a regular pantry row; 0 also marks the staple as out.
  const saveStapleQty = async (st, quantity, unit) => {
    try {
      if (st.tracked) await api.updatePantry(st.tracked.id, quantity)
      else if (quantity > 0) await api.addPantry({ display: st.display, canonical: st.canonical, quantity, unit })
      setStapleOut(st.canonical, quantity === 0)
      setEditingStaple(null)
      setSnack(quantity === 0 ? `Out of ${st.display.toLowerCase()}: recipes now count it as missing` : `${st.display}: ${quantity} ${unitLabel(unit)} tracked`)
      onStaplesChanged?.()
      await load()
    } catch (e) { setSnack(`Couldn't update ${st.display}: ${e.message}`) }
  }
  const outCount = staples.filter(s => s.out).length

  // Tabs: "All" master tab first, then categories that have items.
  const byCat = {}
  for (const it of items) { (byCat[it.category] ||= []).push(it) }
  const categories = CATEGORY_ORDER.filter(c => byCat[c]?.length)
  const tabs = ['All', ...categories]
  const tabIndex = Math.min(tab, tabs.length - 1)
  const activeTab = tabs[tabIndex]
  // Running-low items float to the top so they're seen first.
  const lowFirst = (a, b) => (b.lowStock - a.lowStock) || a.display.localeCompare(b.display)
  const rows = (activeTab === 'All' ? [...items] : [...(byCat[activeTab] || [])]).sort(lowFirst)
  const lowCount = items.filter(i => i.lowStock).length

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
      {/* Header: same layout as Routine / Events. Go Back on its own line,
          then the title with the page action (cart) on the right. */}
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${PAD}px`, mt: `${PAD}px` }}>
          <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px` }}>Pantry</Typography>
          {/* Cart only: the Scan button in the tab bar handles receipts. */}
          <IconButton onClick={onViewCart} aria-label="View cart" sx={{ ...glass('neutral', { radius: 44, blur: 12, a: 0.08 }), color: 'var(--fg)', width: 34, height: 34, my: '-1px' }}>
            <ShoppingCartIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
          {items.length} items{lowCount ? <Box component="span" sx={{ color: RED, fontWeight: 700 }}> · {lowCount} running low</Box> : ''}
        </Typography>

        {/* Inventory | Staples */}
        <Box role="tablist" aria-label="Pantry view" sx={{ display: 'flex', gap: '4px', p: '4px', mt: `${PAD * 1.25}px`, borderRadius: '22px', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)' }}>
          {[['inventory', `Inventory (${items.length})`], ['staples', `Staples (${staples.length})`]].map(([v, text]) => (
            <Box key={v} component="button" type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, height: 36, borderRadius: '18px', textAlign: 'center', lineHeight: '36px',
                fontWeight: 700, fontSize: `${T.body}px`, transition: 'background .15s',
                background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? 'var(--accent-fg)' : 'var(--fg)',
                '&:hover': { background: view === v ? 'var(--accent)' : 'var(--surface-hover)' },
                '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
              {text}
            </Box>
          ))}
        </Box>
      </Box>

      {view === 'staples' && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD * 0.5}px`, pb: `${PAD * 2}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5, mb: `${PAD * 1.25}px` }}>
            Every recipe and suggestion assumes these are in your kitchen.
            Switch one off when you run out and we'll count it as missing{outCount ? ` (${outCount} off now)` : ''}.
            Set an amount to track it like any pantry item.
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: 'var(--accent-text)' }} /></Box>
          ) : (
            <Box component="ul" aria-label="Assumed staples" sx={{ ...surface, listStyle: 'none', m: 0, p: 0, overflow: 'hidden' }}>
              {staples.map(st => (
                <StapleRow key={st.canonical} staple={st} editing={editingStaple === st.canonical}
                  onEdit={() => setEditingStaple(st.canonical)} onCancel={() => setEditingStaple(null)}
                  onSaveQty={saveStapleQty} onToggle={toggleStaple} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {view === 'inventory' && categories.length > 0 && (
        <Box sx={{ flexShrink: 0, borderBottom: '1px solid rgba(var(--ink),0.1)' }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false} aria-label="Pantry categories"
            sx={{ px: `${PAD}px`, minHeight: 40,
              '& .MuiTab-root': { color: 'var(--text-2)', textTransform: 'none', fontWeight: 600, fontSize: `${T.body}px`, minWidth: 'auto', px: `${PAD * 1.5}px`, minHeight: 40 },
              '& .Mui-selected': { color: 'var(--fg)' },
              '& .MuiTabs-indicator': { background: C.amber, height: 3, borderRadius: 2 } }}>
            {tabs.map(c => <Tab key={c} label={`${c} (${c === 'All' ? items.length : byCat[c].length})`} />)}
          </Tabs>
        </Box>
      )}

      {view === 'inventory' && (
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD}px`, pb: `${PAD * 2}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {!loading && routineMissing.length > 0 && (
          <Box sx={{ ...surface, p: `${PAD * 1.5}px`, mb: `${PAD * 1.5}px`, display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>Your routines need</Typography>
              <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.45 }}>
                {routineMissing.map(m => m.display).join(', ')}
              </Typography>
            </Box>
            {routineMissing.every(m => cartKeys.has(m.canonical))
              ? <Typography sx={{ color: 'var(--success)', fontSize: `${T.sub}px`, fontWeight: 700, flexShrink: 0 }}>In cart</Typography>
              : (
                <Button onClick={addRoutineMissing} startIcon={<ShoppingCartIcon sx={{ fontSize: '15px !important' }} />}
                  sx={{ flexShrink: 0, background: YELLOW, color: 'var(--accent-fg)', borderRadius: '22px', textTransform: 'none', fontWeight: 700, fontSize: `${T.sub}px`, px: `${PAD * 1.25}px`, '&:hover': { background: 'var(--accent-strong)' } }}>
                  Add to cart
                </Button>
              )}
          </Box>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: 'var(--accent-text)' }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, mb: 2 }}>Your pantry is empty.</Typography>
            <Button onClick={onAddGroceries} startIcon={<CameraAltIcon />} sx={{ ...glass('amber', { radius: 24, blur: 12, a: 0.3 }), color: 'var(--fg)', textTransform: 'none', fontWeight: 700, px: 3, py: 1 }}>Scan a receipt</Button>
          </Box>
        ) : (
          <Box sx={{ ...surface, overflow: 'hidden' }}>
            {rows.map(it => (
              <Row key={it.id} item={it} inCart={cartKeys.has(it.canonical)} onAdd={addToCart}
                editing={editingId === it.id} onEdit={() => setEditingId(it.id)} onCancel={() => setEditingId(null)} onSave={saveQty} />
            ))}
          </Box>
        )}
      </Box>
      )}

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
