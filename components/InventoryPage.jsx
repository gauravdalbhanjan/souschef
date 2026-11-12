import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, Button, IconButton, Tabs, Tab, CircularProgress, Snackbar } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import CameraAltIcon    from '@mui/icons-material/CameraAlt'
import CheckIcon        from '@mui/icons-material/Check'
import SyncIcon         from '@mui/icons-material/Sync'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import GoBackButton     from './GoBackButton'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'

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

// One inventory row: thumb · name + (dishes, days-left) · Add-to-cart on right.
// Low/expiring items get an amber highlighted button (priority to reorder).
function Row({ item, inCart, onAdd }) {
  const low = item.lowStock
  const shortDays = item.daysLeft <= 3
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, py: `${PAD * 1.25}px`, px: `${PAD * 1.5}px`, borderBottom: '1px solid rgba(255,255,255,.06)', '&:last-child': { borderBottom: 'none' } }}>
      {item.image
        ? <Box component="img" src={item.image} alt={item.display} sx={{ width: 46, height: 46, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
        : <Box sx={{ width: 46, height: 46, borderRadius: '12px', flexShrink: 0, ...glass('neutral', { radius: 12, blur: 10, a: 0.08 }), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: `${T.title}px` }}>{item.display?.[0]}</Box>}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 3}px`, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.display}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, mt: '3px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <SyncIcon sx={{ color: low ? C.amber : 'rgba(255,255,255,0.4)', fontSize: 13 }} />
            <Typography sx={{ color: low ? C.amber : 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, whiteSpace: 'nowrap' }}>
              {item.dishCount} {item.dishCount === 1 ? 'Dish' : 'Dishes'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TrendingDownIcon sx={{ color: shortDays ? '#ff8a8a' : 'rgba(255,255,255,0.4)', fontSize: 13 }} />
            <Typography sx={{ color: shortDays ? '#ff8a8a' : 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px`, whiteSpace: 'nowrap' }}>
              {daysLabel(item.daysLeft)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Button
        onClick={() => onAdd(item)}
        disabled={inCart}
        startIcon={inCart ? <CheckIcon sx={{ fontSize: '15px !important' }} /> : <ShoppingCartIcon sx={{ fontSize: '15px !important' }} />}
        sx={{
          flexShrink: 0, minWidth: 118, borderRadius: '22px', textTransform: 'none',
          fontWeight: 700, fontSize: `${T.sub}px`, px: `${PAD * 1.25}px`, py: `${PAD * 0.75}px`,
          ...(inCart
            ? { background: 'rgba(46,158,107,0.28)', border: '1px solid rgba(46,158,107,0.5)', color: '#fff' }
            : low
              ? { ...glass('amber', { radius: 22, blur: 12, a: 0.9 }), background: C.amber, color: '#1a1000', border: 'none' }
              : { background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }),
          '&:hover': { background: inCart ? 'rgba(46,158,107,0.28)' : low ? C.amberDark : 'rgba(255,255,255,0.1)' },
          '&.Mui-disabled': { color: '#fff', opacity: 0.9 },
        }}
      >
        {inCart ? 'In cart' : 'Add to cart'}
      </Button>
    </Box>
  )
}

export default function InventoryPage({ onBack, onAddGroceries, onViewCart }) {
  const [items, setItems] = useState([])
  const [cartKeys, setCartKeys] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pantry, cart] = await Promise.all([api.pantry(), api.cart()])
      setItems(pantry)
      setCartKeys(new Set(cart.map(c => c.canonical)))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const addToCart = async (item) => {
    setCartKeys(prev => new Set(prev).add(item.canonical))
    try {
      await api.addToCart([{ display: item.display, canonical: item.canonical, quantity: item.quantity || 1, unit: item.unit, category: item.category, source: 'pantry' }])
      setSnack(`${item.display} added to cart`)
    } catch { load() }
  }

  // group + order categories with items
  const byCat = {}
  for (const it of items) { (byCat[it.category] ||= []).push(it) }
  const categories = CATEGORY_ORDER.filter(c => byCat[c]?.length)
  const activeCat = categories[Math.min(tab, categories.length - 1)] || categories[0]
  const lowCount = items.filter(i => i.lowStock).length

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${PAD * 1.5}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ display: 'flex', gap: `${PAD}px` }}>
          <IconButton onClick={onAddGroceries} sx={{ ...glass('amber', { radius: 44, blur: 12, a: 0.28 }), color: '#fff', width: 42, height: 42, '&:hover': { background: 'rgba(245,166,35,0.42)' } }}>
            <CameraAltIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton onClick={onViewCart} sx={{ ...glass('neutral', { radius: 44, blur: 12, a: 0.08 }), color: '#fff', width: 42, height: 42 }}>
            <ShoppingCartIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ px: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.heading}px` }}>Pantry</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px` }}>
          {items.length} items{lowCount ? ` · ${lowCount} running low` : ''}
        </Typography>
      </Box>

      {categories.length > 0 && (
        <Box sx={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Tabs value={Math.min(tab, categories.length - 1)} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false}
            sx={{ px: `${PAD}px`, minHeight: 40,
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600, fontSize: `${T.body}px`, minWidth: 'auto', px: `${PAD * 1.5}px`, minHeight: 40 },
              '& .Mui-selected': { color: '#fff' },
              '& .MuiTabs-indicator': { background: C.amber, height: 3, borderRadius: 2 } }}>
            {categories.map(c => <Tab key={c} label={`${c} (${byCat[c].length})`} />)}
          </Tabs>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 1.5}px`, pt: `${PAD}px`, pb: `${PAD * 2}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: C.amber }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, mb: 2 }}>Your pantry is empty.</Typography>
            <Button onClick={onAddGroceries} startIcon={<CameraAltIcon />} sx={{ ...glass('amber', { radius: 24, blur: 12, a: 0.3 }), color: '#fff', textTransform: 'none', fontWeight: 700, px: 3, py: 1 }}>Scan a receipt</Button>
          </Box>
        ) : (
          <Box sx={{ ...glass('green', { radius: 16, blur: 20 }), overflow: 'hidden' }}>
            {(byCat[activeCat] || []).map(it => (
              <Row key={it.id} item={it} inCart={cartKeys.has(it.canonical)} onAdd={addToCart} />
            ))}
          </Box>
        )}
      </Box>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')} message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: 'rgba(46,158,107,0.9)', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
