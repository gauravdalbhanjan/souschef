import { useLayoutEffect, useRef } from 'react'
import { Box, Typography, Paper, Tooltip, useMediaQuery } from '@mui/material'
import GridViewIcon      from '@mui/icons-material/GridView'
import Inventory2Icon    from '@mui/icons-material/Inventory2'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon         from '@mui/icons-material/Event'
import CameraAltIcon     from '@mui/icons-material/CameraAlt'
import { T, PAD } from '../theme'

// Phones/tablets have no real hover: a tap would otherwise leave a tooltip stuck on screen.
const NO_HOVER = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches

// Layout (index.css: --nav-h, --rail-w):
//   under 900 px  tab island pinned to the bottom (position: fixed; bottom: 0),
//                 8 px from the bottom and side edges
//   900 px and up navigation rail pinned to the left
export const RAIL_QUERY = '(min-width:900px)'

const items = [
  { label: 'Menu',    Icon: GridViewIcon,      tip: 'Meal ideas' },
  { label: 'Pantry',  Icon: Inventory2Icon,    tip: 'Your inventory' },
  { label: 'Routine', Icon: CalendarMonthIcon, tip: 'Daily routine' },
  { label: 'Events',  Icon: EventIcon,         tip: 'Upcoming events' },
]

// Touch: at least 48 px tall; mouse (hover devices): a hover tint.
const itemSx = (active, rail) => ({
  all: 'unset', boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  flex: rail ? '0 0 auto' : 1, width: rail ? '100%' : 'auto', minHeight: rail ? 64 : 48,
  cursor: 'pointer', py: `${PAD * 0.75}px`, borderRadius: '14px',
  background: active ? 'rgba(var(--accent-rgb),0.16)' : 'transparent',
  border: active ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid transparent',
  transition: 'background .2s, border .2s',
  '@media (hover: hover)': { '&:hover': { background: active ? 'rgba(var(--accent-rgb),0.22)' : 'var(--surface-hover)' } },
  '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 },
})

function NavItem({ label, Icon, tip, active, onClick, rail }) {
  return (
    <Tooltip title={tip} placement={rail ? 'right' : 'top'} arrow disableTouchListener disableHoverListener={NO_HOVER}>
      <Box component="button" type="button" onClick={onClick} aria-current={active ? 'page' : undefined} sx={itemSx(active, rail)}>
        <Icon sx={{ color: active ? 'var(--accent-text)' : 'var(--text-2)', fontSize: 22, transition: 'color .2s' }} />
        <Typography sx={{ color: active ? 'var(--accent-text)' : 'var(--text-2)', fontSize: `${T.chip}px`, mt: '2px', fontWeight: active ? 700 : 500, transition: 'color .2s' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}

// 5 buttons: Menu · Pantry · [Camera] · Routine · Events (a row, or a column on the rail).
export default function BottomNav({ active = 0, onChange, onCamera }) {
  const rail = useMediaQuery(RAIL_QUERY)
  const ref = useRef(null)
  // Content reserves exactly the tab bar's height (incl. the home-indicator area).
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (rail || !el) { root.style.setProperty('--nav-h', '0px'); return }
    const set = () => root.style.setProperty('--nav-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    set()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [rail])

  return (
    <Box ref={ref} className={rail ? 'app-rail' : 'app-tabbar'} sx={rail ? {
      position: 'fixed', top: 0, bottom: 0, left: 0, width: 'var(--rail-w)', zIndex: 1100, m: 0, boxSizing: 'border-box',
      pt: `calc(${PAD * 2}px + env(safe-area-inset-top, 0px))`, pb: `calc(${PAD * 2}px + env(safe-area-inset-bottom, 0px))`,
      pl: `calc(${PAD}px + env(safe-area-inset-left, 0px))`, pr: `${PAD}px`, display: 'flex', alignItems: 'center', // rail centred vertically
    } : { boxSizing: 'border-box' /* position + 8 px edge gap: .app-tabbar in index.css */ }}>
      <Paper component="nav" aria-label="Main" elevation={0} sx={{ background: 'var(--bar)', border: '1px solid var(--surface-border)', backdropFilter: 'var(--surface-blur)',
        WebkitBackdropFilter: 'var(--surface-blur)', borderRadius: '22px', boxShadow: 'var(--shadow)', display: 'flex', p: `${PAD}px`,
        ...(rail
          ? { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: `${PAD}px`, width: '100%' }
          : { alignItems: 'center', maxWidth: 640, mx: 'auto' }) }}>
        <NavItem {...items[0]} rail={rail} active={active === 0} onClick={() => onChange?.(0)} />
        <NavItem {...items[1]} rail={rail} active={active === 1} onClick={() => onChange?.(1)} />

        {/* Camera: same row/column as the others, tinted amber */}
        <Tooltip title="Scan a grocery receipt" placement={rail ? 'right' : 'top'} arrow disableTouchListener disableHoverListener={NO_HOVER}>
          <Box component="button" type="button" onClick={onCamera} aria-label="Scan a grocery receipt" sx={itemSx(false, rail)}>
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

        <NavItem {...items[2]} rail={rail} active={active === 2} onClick={() => onChange?.(2)} />
        <NavItem {...items[3]} rail={rail} active={active === 3} onClick={() => onChange?.(3)} />
      </Paper>
    </Box>
  )
}
