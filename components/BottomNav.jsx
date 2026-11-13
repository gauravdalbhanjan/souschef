import { Box, Typography, Paper, Tooltip } from '@mui/material'
import GridViewIcon      from '@mui/icons-material/GridView'
import Inventory2Icon    from '@mui/icons-material/Inventory2'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon         from '@mui/icons-material/Event'
import CameraAltIcon     from '@mui/icons-material/CameraAlt'
import { T, PAD } from '../theme'

// Phones/tablets have no real hover: a tap would otherwise leave a tooltip stuck on screen.
const NO_HOVER = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches

const items = [
  { label: 'Menu',    Icon: GridViewIcon,      tip: 'Meal ideas' },
  { label: 'Pantry',  Icon: Inventory2Icon,    tip: 'Your inventory' },
  { label: 'Routine', Icon: CalendarMonthIcon, tip: 'Daily routine' },
  { label: 'Events',  Icon: EventIcon,         tip: 'Upcoming events' },
]

function NavItem({ label, Icon, tip, active, onClick }) {
  return (
    <Tooltip title={tip} placement="top" arrow disableTouchListener disableHoverListener={NO_HOVER}>
      <Box component="button" type="button" onClick={onClick} aria-current={active ? 'page' : undefined} sx={{
        all: 'unset', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
        cursor: 'pointer', py: `${PAD * 0.75}px`, borderRadius: '14px',
        background: active ? 'rgba(var(--accent-rgb),0.16)' : 'transparent',
        border: active ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid transparent',
        transition: 'background .2s, border .2s',
        '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 },
      }}>
        <Icon sx={{ color: active ? 'var(--accent-text)' : 'var(--text-2)', fontSize: 22, transition: 'color .2s' }} />
        <Typography sx={{ color: active ? 'var(--accent-text)' : 'var(--text-2)', fontSize: `${T.chip}px`, mt: '2px', fontWeight: active ? 700 : 500, transition: 'color .2s' }}>
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
    <Box sx={{
      flexShrink: 0, px: `${PAD * 1.5}px`, pt: `${PAD}px`, background: 'transparent',
      // clear the iPhone home-indicator bar
      pb: `calc(${PAD * 1.5}px + env(safe-area-inset-bottom, 0px))`,
    }}>
      <Paper component="nav" aria-label="Main" elevation={0} sx={{ background: 'var(--bar)', border: '1px solid var(--surface-border)', backdropFilter: 'var(--surface-blur)',
        WebkitBackdropFilter: 'var(--surface-blur)', borderRadius: '22px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', py: `${PAD}px`, px: `${PAD}px` }}>
        <NavItem {...items[0]} active={active === 0} onClick={() => onChange?.(0)} />
        <NavItem {...items[1]} active={active === 1} onClick={() => onChange?.(1)} />

        {/* Camera — inline center button, aligned with the others */}
        <Tooltip title="Scan a grocery receipt" placement="top" arrow disableTouchListener disableHoverListener={NO_HOVER}>
          <Box component="button" type="button" onClick={onCamera} aria-label="Scan a grocery receipt" sx={{
            all: 'unset', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
            cursor: 'pointer', py: `${PAD * 0.75}px`, borderRadius: '14px',
            '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 },
          }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--accent-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(var(--ink),0.4)',
              transition: 'transform .15s', '&:active': { transform: 'scale(0.92)' },
            }}>
              <CameraAltIcon sx={{ color: 'var(--accent-fg)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ color: 'var(--accent-text)', fontSize: `${T.chip}px`, mt: '2px', fontWeight: 700 }}>Scan</Typography>
          </Box>
        </Tooltip>

        <NavItem {...items[2]} active={active === 2} onClick={() => onChange?.(2)} />
        <NavItem {...items[3]} active={active === 3} onClick={() => onChange?.(3)} />
      </Paper>
    </Box>
  )
}
