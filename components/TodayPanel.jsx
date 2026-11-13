import { useState } from 'react'
import { Box, Typography, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TodoCard from './TodoCard'
import DailyTipsCard from './DailyTipsCard'
import { T, PAD } from '../theme'

const KEY = 'souschef_today_collapsed'

// Collapsible "Today" strip: to-do list and daily tip side by side.
export default function TodayPanel({ pantryEmpty }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(KEY) !== '1' } catch { return true } })
  const toggle = () => setOpen(o => {
    try { localStorage.setItem(KEY, o ? '1' : '0') } catch { /* ignore */ }
    return !o
  })
  return (
    <Box sx={{ px: `${PAD}px`, pb: `${PAD}px` }}>
      <Box component="button" type="button" onClick={toggle} aria-expanded={open} aria-controls="today-panel"
        sx={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: `${PAD * 0.75}px`, px: '2px', '&:focus-visible': { outline: '2px solid var(--accent)', borderRadius: '8px' } }}>
        <Typography sx={{ color: 'var(--fg)', fontSize: `${T.title}px`, fontWeight: 700 }}>To-do &amp; daily tip</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-2)' }}>
          <Typography component="span" sx={{ fontSize: `${T.sub}px`, fontWeight: 600 }}>{open ? 'Hide' : 'Show'}</Typography>
          <ExpandMoreIcon sx={{ fontSize: 20, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </Box>
      </Box>
      <Collapse in={open} id="today-panel">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${PAD}px`, height: 128 }}>
          <TodoCard empty={pantryEmpty} />
          <DailyTipsCard empty={pantryEmpty} />
        </Box>
      </Collapse>
    </Box>
  )
}
