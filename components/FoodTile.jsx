import { Box, Typography, Chip, Tooltip } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import BoltIcon from '@mui/icons-material/Bolt'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import { C, T, PAD } from '../theme'

const matchBg = {
  green: 'rgba(46,158,107,0.88)',
  red:   'rgba(255,95,109,0.88)',
  amber: 'rgba(230,81,0,0.88)',
}

const glassChip = {
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.22)',
}

export default function FoodTile({ item, width, height = 160, onClick, compact = false }) {
  const bg = matchBg[item.matchColor] || matchBg.green
  // compact hides the time + kcal chips when the tile is short/narrow
  const isSmall = compact || height < 120

  const chipSx = (background) => ({
    background, ...glassChip, color: '#fff', fontWeight: 700,
    fontSize: `${T.chip}px`, height: 22, borderRadius: '11px', cursor: 'pointer',
    '& .MuiChip-label': { px: '5px' },
    '& .MuiChip-icon': { fontSize: '12px !important', color: '#fff !important', ml: '5px !important' },
  })

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative', borderRadius: '16px', overflow: 'hidden',
        width: width || '100%', height,
        cursor: onClick ? 'pointer' : 'default', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 34px rgba(0,0,0,0.5)' },
        '&:hover img': { transform: 'scale(1.06)' },
      }}
    >
      <Box component="img" src={item.img} alt={item.name}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s ease' }} />

      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,.94) 0%, rgba(0,0,0,.25) 55%, transparent 100%)',
      }} />

      {/* Dish name */}
      <Typography sx={{
        position: 'absolute', bottom: isSmall ? 26 : 32, left: PAD, right: PAD,
        color: '#fff', fontWeight: T.weightTitle, fontSize: `${T.title}px`,
        textShadow: '0 2px 8px rgba(0,0,0,.95)', lineHeight: 1.15,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.name}
      </Typography>

      {/* Chips row */}
      <Box sx={{
        position: 'absolute', bottom: PAD, left: PAD, right: PAD,
        display: 'flex', gap: `${PAD * 0.75}px`, alignItems: 'center',
      }}>
        <Tooltip title={`${item.match}% of ingredients in your pantry`} placement="top" arrow>
          <Chip icon={<Inventory2Icon />} label={`${item.match}%`} sx={chipSx(bg)} />
        </Tooltip>

        {!isSmall && (
          <>
            <Tooltip title={`Cook time: ${item.time}`} placement="top" arrow>
              <Chip icon={<AccessTimeIcon />} label={item.time} sx={chipSx('rgba(245,166,35,0.82)')} />
            </Tooltip>
            <Tooltip title={`Energy: ${item.kcal}`} placement="top" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <BoltIcon sx={{ color: '#fff', fontSize: 13 }} />
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: `${T.chip}px`, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>
                  {item.kcal}
                </Typography>
              </Box>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  )
}
