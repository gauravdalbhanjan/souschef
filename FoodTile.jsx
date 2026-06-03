import { Box, Typography, Chip, Tooltip } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import BoltIcon from '@mui/icons-material/Bolt'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import { C } from '../theme'

const matchBg = {
  green: '#2e7d32',
  red:   '#c62828',
  amber: '#e65100',
}

export default function FoodTile({ item, width, height = 185, onClick }) {
  const bg = matchBg[item.matchColor] || matchBg.green

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        width: width ? width : '100%',
        height,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        '&:hover img': { transform: 'scale(1.05)' },
      }}
    >
      {/* Image */}
      <Box
        component="img"
        src={item.img}
        alt={item.name}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform .3s ease',
        }}
      />

      {/* Gradient overlay */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.25) 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Dish name — 20px */}
      <Typography sx={{
        position: 'absolute',
        bottom: 44,
        left: 10,
        right: 8,
        color: '#fff',
        fontWeight: 800,
        fontSize: '20px',
        textShadow: '0 2px 8px rgba(0,0,0,.95)',
        lineHeight: 1.2,
      }}>
        {item.name}
      </Typography>

      {/* Chips row — styled like reference image */}
      <Box sx={{
        position: 'absolute',
        bottom: 10,
        left: 8,
        right: 8,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        {/* Inventory / match chip */}
        <Tooltip title={`${item.match}% ingredients available in your inventory`} placement="top" arrow>
          <Chip
            icon={
              <Inventory2Icon sx={{
                fontSize: '14px !important',
                color: '#fff !important',
                ml: '6px !important',
              }} />
            }
            label={`${item.match}%`}
            sx={{
              background: bg,
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              height: 28,
              borderRadius: '14px',
              cursor: 'pointer',
              '& .MuiChip-label': { px: '6px' },
            }}
          />
        </Tooltip>

        {/* Time chip */}
        <Tooltip title={`Cook time: ${item.time}`} placement="top" arrow>
          <Chip
            icon={
              <AccessTimeIcon sx={{
                fontSize: '14px !important',
                color: '#fff !important',
                ml: '6px !important',
              }} />
            }
            label={item.time}
            sx={{
              background: C.amberDark,
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              height: 28,
              borderRadius: '14px',
              cursor: 'pointer',
              '& .MuiChip-label': { px: '6px' },
            }}
          />
        </Tooltip>

        {/* kcal — no bg, just icon + text like reference */}
        <Tooltip title={`Energy: ${item.kcal}`} placement="top" arrow>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}>
            <BoltIcon sx={{ color: '#fff', fontSize: 16 }} />
            <Typography sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              textShadow: '0 1px 4px rgba(0,0,0,.8)',
            }}>
              {item.kcal}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}
