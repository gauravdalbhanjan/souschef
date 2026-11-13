// Recipe detail: hero photo, one unified ingredient checklist (missing items
// carry an inline "Add to cart"), a short step outline, and one primary CTA.
import { useState, useEffect } from 'react'
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import BoltIcon from '@mui/icons-material/Bolt'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import CheckIcon from '@mui/icons-material/Check'
import { T, PAD } from '../theme'
import { api } from '../api'
import { unitLabel } from '../units'
import { surface, ctaPrimary } from './Ambient'
import { backButtonSx } from './GoBackButton'

const PREP = 'Get everything ready'

// Facts on the hero: fixed light-on-photo styling (always over an image).
function HeroFact({ icon, children }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: 26, px: '10px', borderRadius: '13px',
      background: 'rgba(11,15,25,0.55)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', color: '#F8FAFC',
      fontSize: `${T.sub}px`, fontWeight: 700 }}>
      {icon}{children}
    </Box>
  )
}

export default function RecipeDetail({ slug, onBack, onStart, onViewCart }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [adding, setAdding] = useState(null)       // canonical being added, or 'all'
  const [inCart, setInCart] = useState(() => new Set())
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api.recipe(slug)
      .then(r => { if (alive) setRecipe(r) })
      .catch(e => { if (alive) setErr(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  const handleStart = async () => {
    setStarting(true)
    try { onStart?.(await api.startCook(slug, recipe?.servings)) }
    catch (e) { setErr(e.message); setStarting(false) }
  }

  // Add one missing item (or all of them) to the cart.
  const addToCart = async (items, key) => {
    setAdding(key); setErr('')
    try {
      await api.addToCart(items.map(m => ({ display: m.display, canonical: m.canonical, quantity: m.needed, unit: m.unit, source: slug })))
      setInCart(s => new Set([...s, ...items.map(m => m.canonical)]))
    } catch (e) { setErr(e.message) }
    finally { setAdding(null) }
  }

  if (loading) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={28} sx={{ color: 'var(--accent-text)' }} /></Box>
  }
  if (!recipe) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography role="alert" sx={{ color: 'var(--danger)' }}>{err || 'Recipe not found'}</Typography>
        <Button onClick={onBack} sx={backButtonSx}>Go Back</Button>
      </Box>
    )
  }

  const missingFor = (ing) => (recipe.missing || []).find(m => m.canonical === ing.canonical)
  const missing = (recipe.missing || []).filter(m => !inCart.has(m.canonical))
  const haveCount = recipe.ingredients.filter(i => i.have || i.staple).length
  const steps = (recipe.steps || []).filter(s => s.section !== PREP)
  const credit = recipe.imageCredit
  const creditWord = credit ? (credit.source || 'Source').split(/[\s/]/)[0] : null

  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: 230, flexShrink: 0 }}>
        <Box component="img" src={recipe.img} alt={recipe.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,15,25,.92) 0%, rgba(11,15,25,.15) 60%, rgba(11,15,25,.35) 100%)' }} />
        <Button onClick={onBack} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ ...backButtonSx, position: 'absolute', top: PAD * 1.5, left: PAD * 1.5, background: 'rgba(11,15,25,0.5)', borderColor: 'rgba(255,255,255,0.14)', color: '#F8FAFC',
            '&:hover': { background: 'rgba(11,15,25,0.7)' } }}>
          Go Back
        </Button>
        <IconButton onClick={onViewCart} aria-label="View cart"
          sx={{ position: 'absolute', top: PAD * 1.5, right: PAD * 1.5, width: 40, height: 40, color: '#F8FAFC', background: 'rgba(11,15,25,0.5)',
            border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', '&:hover': { background: 'rgba(11,15,25,0.7)' } }}>
          <ShoppingCartOutlinedIcon sx={{ fontSize: 19 }} />
        </IconButton>
        {/* Photo credit: one quiet word; full attribution on the linked page + hover */}
        {credit && (
          <Box component="a" href={credit.url} target="_blank" rel="noopener noreferrer"
            title={[credit.author, credit.source, credit.license].filter(Boolean).join(' \u00b7 ')}
            aria-label={`Photo credit: ${[credit.author, credit.source, credit.license].filter(Boolean).join(', ')}`}
            sx={{ position: 'absolute', right: PAD, bottom: PAD, px: '7px', height: 18, display: 'inline-flex', alignItems: 'center', borderRadius: '9px',
              background: 'rgba(11,15,25,0.55)', color: 'rgba(248,250,252,0.85)', fontSize: '10px', fontWeight: 600, textDecoration: 'none' }}>
            Photo: {creditWord}
          </Box>
        )}
        <Box sx={{ position: 'absolute', bottom: PAD * 1.5, left: PAD * 2, right: PAD * 12 }}>
          <Typography component="h1" sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: `${T.heading + 4}px`, lineHeight: 1.15, mb: `${PAD}px`, textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>
            {recipe.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <HeroFact icon={<TimerOutlinedIcon sx={{ fontSize: 14 }} />}>{recipe.time}</HeroFact>
            <HeroFact icon={<BoltIcon sx={{ fontSize: 14 }} />}>{recipe.kcal}</HeroFact>
            {recipe.maxServings > 0 && <HeroFact icon={<RestaurantIcon sx={{ fontSize: 14 }} />}>Enough for {recipe.maxServings}</HeroFact>}
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pt: `${PAD * 2}px`, pb: `${PAD * 2}px`, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {recipe.description && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, lineHeight: 1.6, mb: `${PAD * 2}px` }}>{recipe.description}</Typography>
        )}

        {/* One checklist: what you have, what's missing (with inline restock) */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: `${PAD}px` }}>
          <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 4}px` }}>Ingredients</Typography>
          {missing.length > 1 ? (
            <Box component="button" type="button" onClick={() => addToCart(missing, 'all')} disabled={!!adding}
              sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-text)', fontWeight: 700, fontSize: `${T.sub}px`,
                '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
              <AddShoppingCartIcon sx={{ fontSize: 15 }} /> {adding === 'all' ? 'Adding\u2026' : `Restock all ${missing.length}`}
            </Box>
          ) : (
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600 }}>{haveCount} of {recipe.ingredients.length} in your pantry</Typography>
          )}
        </Box>
        <Box sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD * 0.5}px` }}>
          {/* Every row: [circle] [name, bold] ........ [quantity / status] */}
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {recipe.ingredients.map((ing, i) => {
              const have = ing.have || ing.staple
              const need = !have ? missingFor(ing) : null
              const added = need && inCart.has(need.canonical)
              const status = ing.staple ? 'Staple' : have ? 'In pantry' : added ? 'In cart' : 'Missing'
              return (
                <Box component="li" key={i} sx={{ display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, py: `${PAD * 1.25}px`,
                  borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <Box aria-hidden sx={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: have ? 'rgba(34,197,94,0.18)' : 'transparent', border: have ? 'none' : '2px solid rgba(var(--ink),0.25)' }}>
                    {have && <CheckIcon sx={{ fontSize: 15, color: 'var(--success)' }} />}
                  </Box>
                  <Typography sx={{ flex: 1, minWidth: 0, color: 'var(--fg)', fontSize: `${T.body + 2}px`, fontWeight: 700, lineHeight: 1.25 }}>{ing.display}</Typography>
                  <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {ing.quantity} {unitLabel(ing.unit)}
                  </Typography>
                  {/* Status, or Restock right on the missing row */}
                  <Box sx={{ width: 96, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    {need && !added ? (
                      <Button onClick={() => addToCart([need], need.canonical)} disabled={!!adding}
                        startIcon={adding === need.canonical ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <AddShoppingCartIcon sx={{ fontSize: '15px !important' }} />}
                        aria-label={`Restock ${ing.display}: add ${need.needed} ${unitLabel(need.unit)} to cart`}
                        sx={{ height: 32, minWidth: 0, px: '12px', borderRadius: '16px', textTransform: 'none', fontWeight: 700, fontSize: `${T.sub}px`, whiteSpace: 'nowrap',
                          color: 'var(--accent-fg)', background: 'var(--accent)', '&:hover': { background: 'var(--accent-strong)' },
                          '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.4)', color: 'var(--accent-fg)' }, '& .MuiButton-startIcon': { mr: '4px' } }}>
                        Restock
                      </Button>
                    ) : added ? (
                      <Box component="button" type="button" onClick={onViewCart} aria-label={`${ing.display} is in your cart. View cart`}
                        sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--success)', fontWeight: 700, fontSize: `${T.sub}px`,
                          '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                        <CheckIcon sx={{ fontSize: 14 }} /> In cart
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: `${T.sub}px`, fontWeight: 600, color: 'var(--text-2)' }}>{status}</Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

        </Box>
        {err && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, mt: `${PAD}px` }}>{err}</Typography>}

        {/* Short outline of the cooking steps */}
        <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 4}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }}>
          {steps.length} steps
        </Typography>
        <Box component="ol" sx={{ ...surface, listStyle: 'none', m: 0, px: `${PAD * 1.5}px`, py: `${PAD}px` }}>
          {steps.map((s, i) => (
            <Box component="li" key={i} sx={{ display: 'flex', gap: `${PAD}px`, alignItems: 'center', py: `${PAD * 0.75}px` }}>
              <Box aria-hidden sx={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-strong)', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>{i + 1}</Box>
              <Typography sx={{ color: 'var(--fg)', fontSize: `${T.body + 1}px`, fontWeight: 500 }}>{s.section}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* One primary action */}
      <Box sx={{ flexShrink: 0, px: `${PAD * 2}px`, pt: `${PAD}px`, pb: `${PAD * 1.5}px` }}>
        <Button fullWidth onClick={handleStart} disabled={starting}
          startIcon={starting ? <CircularProgress size={18} sx={{ color: 'var(--accent-fg)' }} /> : null}
          sx={ctaPrimary}>
          {starting ? 'Starting\u2026' : 'Start cooking'}
        </Button>
      </Box>
    </Box>
  )
}
