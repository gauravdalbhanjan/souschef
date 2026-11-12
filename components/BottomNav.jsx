import { Box, Typography, Paper, Tooltip } from '@mui/material'
import GridViewIcon      from '@mui/icons-material/GridView'
import Inventory2Icon    from '@mui/icons-material/Inventory2'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon         from '@mui/icons-material/Event'
import CameraAltIcon     from '@mui/icons-material/CameraAlt'
import { C, glass, T, PAD } from '../theme'

const items = [
  { label: 'Menu',    Icon: GridViewIcon,      tip: 'Meal ideas' },
  { label: 'Pantry',  Icon: Inventory2Icon,    tip: 'Your inventory' },
  { label: 'Routine', Icon: CalendarMonthIcon, tip: 'Daily routine' },
  { label: 'Events',  Icon: EventIcon,         tip: 'Upcoming events' },
]

function NavItem({ label, Icon, tip, active, onClick }) {
  return (
    <Tooltip title={tip} placement="top" arrow>
      <Box onClick={onClick} sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
        cursor: 'pointer', py: `${PAD * 0.75}px`, borderRadius: '14px',
        background: active ? C.amberGlass : 'transparent',
        border: active ? `1px solid ${C.amberGlassBorder}` : '1px solid transparent',
        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
        transition: 'background .2s, border .2s',
      }}>
        <Icon sx={{ color: active ? C.amber : '#8a8f98', fontSize: 22, transition: 'color .2s' }} />
        <Typography sx={{ color: active ? C.amber : '#8a8f98', fontSize: `${T.chip}px`, mt: '2px', fontWeight: active ? 700 : 500, transition: 'color .2s' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}

// 5 evenly-spaced buttons: Menu · Pantry · [Camera] · Routine · Events.
// The camera is inline (same row/level) as the others, tinted amber.
export default function BottomNav({ active = 0, onChange, onCamera }) {
  return (
    <Box sx={{ flexShrink: 0, px: `${PAD * 1.5}px`, pb: `${PAD * 1.5}px`, pt: `${PAD}px`, background: 'transparent' }}>
      <Paper elevation={0} sx={{ ...glass('dark', { radius: 22, blur: 26, a: 0.5 }), display: 'flex', alignItems: 'center', py: `${PAD}px`, px: `${PAD}px` }}>
        <NavItem {...items[0]} active={active === 0} onClick={() => onChange?.(0)} />
        <NavItem {...items[1]} active={active === 1} onClick={() => onChange?.(1)} />

        {/* Camera — inline center button, aligned with the others */}
        <Tooltip title="Scan a grocery receipt" placement="top" arrow>
          <Box onClick={onCamera} sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
            cursor: 'pointer', py: `${PAD * 0.75}px`,
          }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(150deg, ${C.amber} 0%, #e8960e 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'transform .15s', '&:active': { transform: 'scale(0.92)' },
            }}>
              <CameraAltIcon sx={{ color: '#1a1000', fontSize: 20 }} />
            </Box>
            <Typography sx={{ color: C.amber, fontSize: `${T.chip}px`, mt: '2px', fontWeight: 700 }}>Scan</Typography>
          </Box>
        </Tooltip>

        <NavItem {...items[2]} active={active === 2} onClick={() => onChange?.(2)} />
        <NavItem {...items[3]} active={active === 3} onClick={() => onChange?.(3)} />
      </Paper>
    </Box>
  )
}
