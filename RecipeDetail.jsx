import { Box, Typography, Chip, Button, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import AccessTimeIcon      from '@mui/icons-material/AccessTime'
import BoltIcon            from '@mui/icons-material/Bolt'
import Inventory2Icon      from '@mui/icons-material/Inventory2'
import CheckIcon           from '@mui/icons-material/Check'
import CloseIcon           from '@mui/icons-material/Close'
import ArrowForwardIcon    from '@mui/icons-material/ArrowForward'
import { C } from '../theme'

const ingredients = [
  { name: 'Lettuce',                qty: '1 large head', have: true  },
  { name: 'Caesar Dressing',        qty: '1/4 cup',      have: true  },
  { name: 'Grated Parmesan cheese', qty: '1/4 cup',      have: true  },
  { name: 'Dijon mustard',          qty: '1 tsp',        have: false },
  { name: 'Worcestershire sauce',   qty: '1 tsp',        have: false },
  { name: 'Garlic',                 qty: '1 clove',      have: true  },
  { name: 'Lemon',                  qty: '1/2',          have: true  },
  { name: 'Croutons',               qty: 'Handful',      have: true  },
  { name: 'Black Pepper',           qty: 'Ground',       have: true  },
]

const servingOptions = [
  'Tortilla Chips',
  'Dollop Onto baked potato',
  'Crackers',
  'Fresh Veggies',
  'Spread it on toast',
]

const missingCount = ingredients.filter(i => !i.have).length

const greenBox = {
  background: '#1a3320',
  borderRadius: '20px',
  p: '14px 16px',
}

export default function RecipeDetail({ onBack, onStart }) {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  // On mobile: stack everything vertically
  // On desktop (648px): side-by-side columns, each 300px
  const TILE_W = isMobile ? '100%' : 300

  return (
    <Box sx={{
      width: isMobile ? '100vw' : 648,
      mx: 'auto',
      background: '#111',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Hero ── */}
      <Box sx={{ position: 'relative', height: 240, flexShrink: 0 }}>
        <Box
          component="img"
          src="https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&q=80"
          alt="Caesar Salad"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.1) 60%, transparent 100%)',
        }} />

        <Button
          onClick={onBack}
          startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '13px !important' }} />}
          sx={{
            position: 'absolute', top: 14, left: 12,
            background: 'rgba(55,55,55,0.88)', color: '#fff',
            borderRadius: '20px', textTransform: 'none',
            fontWeight: 600, fontSize: '0.8rem',
            px: 1.8, py: 0.5, backdropFilter: 'blur(4px)',
            '&:hover': { background: 'rgba(80,80,80,.9)' },
          }}
        >
          Go Back
        </Button>

        <Box sx={{ position: 'absolute', bottom: 14, left: 14 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '20px', mb: '6px', textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>
            Caesar Salad
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Chip
              icon={<Inventory2Icon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="72%" size="small"
              sx={{ background: '#2e7d32', color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }}
            />
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="10 mins" size="small"
              sx={{ background: C.amberDark, color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }}
            />
            <Chip
              icon={<BoltIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
              label="350 kcal" size="small"
              sx={{ background: '#37474f', color: '#fff', fontWeight: 700, fontSize: '13px', height: 26, borderRadius: '13px', '& .MuiChip-label': { px: '6px' } }}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Scrollable body ── */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        px: '16px',
        pt: '14px',
        pb: '8px',
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { background: '#333', borderRadius: 2 },
      }}>

        {/* Description */}
        <Typography sx={{ color: '#ccc', fontSize: '13px', lineHeight: 1.65, mb: '16px' }}>
          The makings of a classic: grilled white meat chicken, Parmesan Cheese and seasoned croutons, all atop a blend of romaine and iceberg lettuce.
        </Typography>

        {/* Layout: side-by-side on desktop, stacked on mobile */}
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          alignItems: 'flex-start',
        }}>

          {/* ── Left / Top: Ingredients ── */}
          <Box sx={{ width: TILE_W, flexShrink: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px', mb: '10px' }}>
              The Salad:
            </Typography>
            <Box sx={greenBox}>
              {ingredients.map((ing, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  mb: i < ingredients.length - 1 ? '14px' : 0,
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '5px', flexShrink: 0, mt: '1px',
                    background: ing.have ? 'transparent' : '#c62828',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {ing.have
                      ? <CheckIcon sx={{ color: '#66bb6a', fontSize: 18 }} />
                      : <CloseIcon sx={{ color: '#fff', fontSize: 14 }} />}
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#e8e8e8', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>
                      {ing.name}
                    </Typography>
                    <Typography sx={{ color: '#777', fontSize: '12px', lineHeight: 1.3 }}>
                      {ing.qty}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ── Right / Bottom: Pro-Tip + Serving stacked vertically ── */}
          <Box sx={{
            width: TILE_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Pro-Tip */}
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px', mb: '10px' }}>
                Pro-Tip: (+4 mins)
              </Typography>
              <Box sx={greenBox}>
                <Typography sx={{ color: '#ccc', fontSize: '13px', lineHeight: 1.65, mb: '14px' }}>
                  If you want to add protein and stay under the 10-minute mark, use pre-cooked grilled chicken strips or tinned chickpeas for a quick hit of energy.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                    size="small"
                    sx={{
                      background: C.amber, color: '#1a1000',
                      borderRadius: '20px', textTransform: 'none',
                      fontWeight: 700, fontSize: '13px', px: 2, py: 0.5,
                      '&:hover': { background: C.amberDark, color: '#fff' },
                    }}
                  >
                    Accept
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Serving Options */}
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px', mb: '10px' }}>
                Serving Options:
              </Typography>
              <Box sx={greenBox}>
                {servingOptions.map((opt, i) => (
                  <Typography key={i} sx={{ color: '#ccc', fontSize: '13px', lineHeight: 1.9 }}>
                    • {opt}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* spacer so buttons don't overlap last card */}
        <Box sx={{ height: '16px' }} />
      </Box>

      {/* ── Fixed bottom buttons ── */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex',
        gap: '12px',
        px: '16px',
        py: '12px',
        background: 'linear-gradient(to top, #111 70%, transparent)',
      }}>
        <Button fullWidth
          sx={{
            background: '#2979ff', color: '#fff',
            borderRadius: '30px', textTransform: 'none',
            fontWeight: 700, fontSize: '15px', py: '12px',
            '&:hover': { background: '#1565c0' },
          }}
        >
          Add ({missingCount}) items to Cart
        </Button>
        <Button fullWidth onClick={onStart}
          sx={{
            background: '#2979ff', color: '#fff',
            borderRadius: '30px', textTransform: 'none',
            fontWeight: 700, fontSize: '15px', py: '12px',
            '&:hover': { background: '#1565c0' },
          }}
        >
          Start
        </Button>
      </Box>
    </Box>
  )
}
