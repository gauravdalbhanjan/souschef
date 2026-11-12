import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AddIcon from '@mui/icons-material/Add'
import BoltIcon from '@mui/icons-material/Bolt'
import GoBackButton from './GoBackButton'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'

const providerColor = {
  instacart: 'rgba(46,158,107,0.32)',
  amazonfresh: 'rgba(77,124,255,0.32)',
  walmart: 'rgba(245,166,35,0.32)',
}

// Why an item is in the cart: an event plan, a pantry reorder, or a recipe.
function sourceLabel(source) {
  if (!source) return ''
  if (source.startsWith('event:')) return ` · for ${source.slice(6)}`
  if (source === 'pantry') return ' · reorder'
  return ` · for ${source.replace(/-/g, ' ')}`
}

export default function CartPage({ onBack }) {
  const [items, setItems] = useState([])
  const [pantry, setPantry] = useState([])
  const [loading, setLoading] = useState(true)
  const [handoff, setHandoff] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cart, pan] = await Promise.all([api.cart(), api.pantry()])
      setItems(cart)
      setPantry(pan)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const remove = async (id) => {
    setItems(list => list.filter(i => i.id !== id))
    try { await api.removeFromCart(id) } catch { load() }
    setHandoff(null)
  }
  const clear = async () => { await api.clearCart(); setItems([]); setHandoff(null) }

  const reorder = async (p) => {
    try {
      const res = await api.addToCart([{ display: p.display, canonical: p.canonical, quantity: p.quantity || 1, unit: p.unit, category: p.category, source: 'pantry' }])
      setItems(res.items)
      setHandoff(null)
    } catch { load() }
  }

  // pantry items not already in the cart → reorderable
  const cartKeys = new Set(items.map(i => i.canonical))
  const reorderable = pantry.filter(p => !cartKeys.has(p.canonical))

  const checkout = async () => {
    setCheckingOut(true)
    try { setHandoff(await api.checkout()) } finally { setCheckingOut(false) }
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${PAD * 1.5}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        {items.length > 0 && (
          <Button onClick={clear} sx={{ color: 'rgba(255,255,255,0.55)', textTransform: 'none', fontSize: `${T.sub}px` }}>Clear all</Button>
        )}
      </Box>

      <Box sx={{ px: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.heading}px` }}>Shopping Cart</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: `${T.sub}px` }}>
          {items.length} item{items.length === 1 ? '' : 's'} to order
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 1.5}px`, pb: `${PAD}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: C.amber }} /></Box>
        ) : items.length === 0 ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, textAlign: 'center', py: 6 }}>
            Your cart is empty. Add missing ingredients from a recipe.
          </Typography>
        ) : (
          <Box sx={{ ...glass('neutral', { radius: 16, blur: 20, a: 0.06 }), overflow: 'hidden' }}>
            {items.map(it => (
              <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, py: `${PAD * 1.25}px`, px: `${PAD * 1.5}px`, borderBottom: '1px solid rgba(255,255,255,.07)', '&:last-child': { borderBottom: 'none' } }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: `${T.title}px` }}>{it.display}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: `${T.sub}px` }}>{it.quantity} {it.unit}{sourceLabel(it.source)}</Typography>
                </Box>
                <IconButton size="small" onClick={() => remove(it.id)} sx={{ color: '#666', '&:hover': { color: '#ff8a8a' } }}>
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Reorder from pantry */}
        {!loading && reorderable.length > 0 && (
          <Box sx={{ mt: `${PAD * 2}px` }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title}px`, mb: `${PAD * 0.5}px` }}>
              From your pantry
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: `${T.sub}px`, mb: `${PAD}px` }}>
              Tap to add anything you already have to the cart for reordering.
            </Typography>
            <Box sx={{ ...glass('neutral', { radius: 16, blur: 20, a: 0.05 }), overflow: 'hidden' }}>
              {reorderable.map(p => (
                <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, py: `${PAD}px`, px: `${PAD * 1.5}px`, borderBottom: '1px solid rgba(255,255,255,.06)', '&:last-child': { borderBottom: 'none' } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: `${T.body}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.display}</Typography>
                    <Typography sx={{ color: p.lowStock ? C.amber : 'rgba(255,255,255,0.4)', fontSize: `${T.sub}px` }}>
                      {p.quantity} {p.unit}{p.lowStock ? ' · running low' : ''}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => reorder(p)} sx={{ ...glass(p.lowStock ? 'amber' : 'neutral', { radius: 40, blur: 10, a: p.lowStock ? 0.28 : 0.08 }), color: '#fff', width: 34, height: 34 }}>
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Handoff providers */}
        {handoff && (
          <Box sx={{ mt: `${PAD * 2}px` }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title}px`, mb: `${PAD}px` }}>
              Order on a delivery service
            </Typography>
            {!handoff.instacartApiConfigured && (
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: `${T.sub}px`, mb: `${PAD}px`, lineHeight: 1.5 }}>
                Opens the store with your items searched. Connect an Instacart API key to push the cart directly.
              </Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${PAD}px` }}>
              {handoff.providers.map(p => (
                <Button
                  key={p.id}
                  onClick={() => window.open(p.url, '_blank')}
                  endIcon={p.prefilled ? <BoltIcon /> : <OpenInNewIcon />}
                  sx={{ ...glass('neutral', { radius: 16, blur: 14, a: 0.06 }), background: providerColor[p.id], color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body}px`, justifyContent: 'space-between', px: `${PAD * 1.5}px`, py: `${PAD * 1.25}px` }}
                >
                  {p.name}{p.prefilled ? ' · cart pre-filled' : ''}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {items.length > 0 && (
        <Box sx={{ flexShrink: 0, px: `${PAD * 1.5}px`, py: `${PAD * 1.5}px`, background: 'linear-gradient(to top, rgba(11,14,20,0.85) 55%, transparent)', backdropFilter: 'blur(6px)' }}>
          <Button fullWidth onClick={checkout} disabled={checkingOut}
            startIcon={checkingOut ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.5)' } }}>
            {checkingOut ? 'Preparing…' : (handoff ? 'Refresh order links' : 'Checkout — choose delivery')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
