import { useState, useEffect } from 'react'
import { Box, Typography, Chip, Button, IconButton, CircularProgress, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ShoppingCartIcon    from '@mui/icons-material/ShoppingCart'
import AccessTimeIcon      from '@mui/icons-material/AccessTime'
import BoltIcon            from '@mui/icons-material/Bolt'
import Inventory2Icon      from '@mui/icons-material/Inventory2'
import RestaurantIcon      from '@mui/icons-material/Restaurant'
import CheckIcon           from '@mui/icons-material/Check'
import CloseIcon           from '@mui/icons-material/Close'
import { C, glass, T, PAD } from '../theme'
import { api } from '../api'

const greenBox = { ...glass('green', { radius: 16, blur: 20 }), p: `${PAD * 1.5}px` }

const matchBg = { green: '#2e9e6b', amber: '#e65100', red: '#c62828' }

export default function RecipeDetail({ slug, onBack, onStart, onViewCart }) {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const TILE_W = isMobile ? '100%' : 300

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [addingCart, setAddingCart] = useState(false)
  const [addedCart, setAddedCart] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.recipe(slug)
      .then(r => { if (alive) setRecipe(r) })
      .catch(e => { if (alive) setErr(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  const handleStart = async () => {
    setStarting(true)
    try {
      const session = await api.startCook(slug, recipe?.servings)
      onStart?.(session)
    } catch (e) {
      setErr(e.message); setStarting(false)
    }
  }

  const handleAddToCart = async () => {
    if (!recipe.missing?.length) return
    setAddingCart(true)
    try {
      await api.addToCart(recipe.missing.map(m => ({
        display: m.display, canonical: m.canonical, quantity: m.needed, unit: m.unit, source: slug,
      })))
      setAddedCart(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setAddingCart(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: C.amber }} />
      </Box>
    )
  }
  if (!recipe) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography sx={{ color: '#ff8a8a' }}>{err || 'Recipe not found'}</Typography>
        <Button onClick={onBack} sx={{ color: '#fff' }}>Go Back</Button>
      </Box>
    )
  }

  const missing = recipe.ingredients.filter(i => !i.have && !i.staple)

  return (
    <Box sx={{ width: isMobile ? '100vw' : 648, mx: 'auto', background: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: 220, flexShrink: 0 }}>
        <Box component="img" src={recipe.img} alt={recipe.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.1) 60%, transparent 100%)' }} />

        <Button onClick={onBack} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ position: 'absolute', top: PAD * 1.5, left: PAD * 1.5, ...glass('dark', { radius: 20, blur: 10, a: 0.5 }), color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: `${T.body}px`, px: 1.8, py: 0.5, '&:hover': { background: 'rgba(40,44,52,.7)' } }}>
          Go Back
        </Button>
        <IconButton onClick={onViewCart}
          sx={{ position: 'absolute', top: PAD, right: PAD * 1.5, ...glass('dark', { radius: 40, blur: 10, a: 0.5 }), color: '#fff', width: 40, height: 40 }}>
          <ShoppingCartIcon sx={{ fontSize: 19 }} />
        </IconButton>

        <Box sx={{ position: 'absolute', bottom: PAD * 1.5, left: PAD * 1.5, right: PAD * 1.5 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, mb: `${PAD * 0.75}px`, textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>
            {recipe.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: `${PAD}px`, flexWrap: 'wrap' }}>
            <Chip icon={<Inventory2Icon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />} label={`${recipe.match}%`} size="small"
              sx={{ background: matchBg[recipe.matchColor], color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 24, borderRadius: '12px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<AccessTimeIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />} label={recipe.time} size="small"
              sx={{ background: 'rgba(245,166,35,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 24, borderRadius: '12px', '& .MuiChip-label': { px: '6px' } }} />
            <Chip icon={<BoltIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />} label={recipe.kcal} size="small"
              sx={{ background: 'rgba(55,71,79,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 24, borderRadius: '12px', '& .MuiChip-label': { px: '6px' } }} />
            {recipe.maxServings != null && recipe.maxServings > 0 && (
              <Chip icon={<RestaurantIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
                label={`Enough for ${recipe.maxServings}`} size="small"
                sx={{ background: 'rgba(77,124,255,0.85)', color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, height: 24, borderRadius: '12px', '& .MuiChip-label': { px: '6px' } }} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 1.5}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 2 } }}>
        {recipe.description && (
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px`, lineHeight: 1.6, mb: `${PAD * 1.5}px` }}>
            {recipe.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: `${PAD * 1.5}px`, alignItems: 'flex-start' }}>
          {/* Ingredients */}
          <Box sx={{ width: TILE_W, flexShrink: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 3}px`, mb: `${PAD}px` }}>Ingredients</Typography>
            <Box sx={greenBox}>
              {recipe.ingredients.map((ing, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: `${PAD}px`, mb: i < recipe.ingredients.length - 1 ? `${PAD * 1.25}px` : 0 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '5px', flexShrink: 0, mt: '1px', background: ing.have ? 'transparent' : '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ing.have ? <CheckIcon sx={{ color: '#66d19e', fontSize: 17 }} /> : <CloseIcon sx={{ color: '#fff', fontSize: 13 }} />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#eee', fontSize: `${T.body}px`, fontWeight: 600, lineHeight: 1.2 }}>{ing.display}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: `${T.sub}px`, lineHeight: 1.3 }}>
                      {ing.quantity} {ing.unit}{ing.staple ? ' · pantry staple' : ''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Status / steps preview */}
          <Box sx={{ width: TILE_W, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: `${PAD * 1.5}px` }}>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 3}px`, mb: `${PAD}px` }}>
                {missing.length ? `Missing ${missing.length}` : 'Ready to cook'}
              </Typography>
              <Box sx={greenBox}>
                {missing.length === 0 ? (
                  <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: `${T.body}px`, lineHeight: 1.6 }}>
                    You have everything you need. This recipe supports about {recipe.maxServings ?? recipe.servings} serving{(recipe.maxServings ?? recipe.servings) === 1 ? '' : 's'} from your current pantry.
                  </Typography>
                ) : (
                  missing.map((m, i) => (
                    <Typography key={i} sx={{ color: 'rgba(255,255,255,0.85)', fontSize: `${T.body}px`, lineHeight: 1.8 }}>
                      • {m.display} — need {m.needed} {m.unit}
                    </Typography>
                  ))
                )}
              </Box>
            </Box>

            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.title + 3}px`, mb: `${PAD}px` }}>Steps</Typography>
              <Box sx={greenBox}>
                {recipe.steps.map((s, i) => (
                  <Typography key={i} sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px`, lineHeight: 1.7 }}>
                    {i + 1}. {s.section}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ height: `${PAD * 2}px` }} />
      </Box>

      {/* Bottom buttons */}
      <Box sx={{ flexShrink: 0, display: 'flex', gap: `${PAD}px`, px: `${PAD * 1.5}px`, py: `${PAD * 1.5}px`, background: 'linear-gradient(to top, rgba(11,14,20,0.85) 55%, transparent)', backdropFilter: 'blur(6px)' }}>
        {missing.length > 0 && (
          <Button fullWidth onClick={addedCart ? onViewCart : handleAddToCart} disabled={addingCart}
            startIcon={addingCart ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{ ...glass('blue', { radius: 30, blur: 14, a: 0.28 }), color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(77,124,255,0.42)' } }}>
            {addingCart ? 'Adding…' : addedCart ? 'View cart →' : `Add ${missing.length} to Cart`}
          </Button>
        )}
        <Button fullWidth onClick={handleStart} disabled={starting}
          startIcon={starting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{ ...glass('amber', { radius: 30, blur: 14, a: 0.34 }), color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: `${T.body + 1}px`, py: `${PAD * 1.25}px`, '&:hover': { background: 'rgba(245,166,35,0.5)' } }}>
          {starting ? 'Starting…' : 'Start cooking'}
        </Button>
      </Box>
    </Box>
  )
}
