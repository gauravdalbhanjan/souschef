import { useState } from 'react'
import { Box, Typography, Menu, MenuItem, ListItemIcon } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { C, T, PAD } from '../theme'
import { TIME_FILTERS, PROTEIN_FILTERS, CATEGORY_FILTERS } from '../lib/recipeMeta.js'

export const DEFAULT_FILTERS = { time: 'any', protein: 'any', category: 'any' }

const GROUPS = [
  { key: 'time', Icon: AccessTimeIcon, options: TIME_FILTERS, name: 'Time' },
  { key: 'protein', Icon: FitnessCenterIcon, options: PROTEIN_FILTERS, name: 'Protein' },
  { key: 'category', Icon: RestaurantMenuIcon, options: CATEGORY_FILTERS, name: 'Category' },
]

function FilterChip({ group, value, onChange }) {
  const [anchor, setAnchor] = useState(null)
  const active = value !== 'any'
  const current = group.options.find(o => o.id === value) || group.options[0]
  const { Icon } = group
  return (
    <>
      <Box component="button" type="button" onClick={e => setAnchor(e.currentTarget)}
        aria-haspopup="menu" aria-expanded={!!anchor} aria-label={`${group.name} filter: ${current.label}`}
        sx={{
          all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '4px', height: 34, px: '10px', borderRadius: '17px',
          background: active ? 'var(--accent)' : 'var(--surface-strong)',
          border: active ? '1px solid transparent' : '1px solid var(--surface-border)',
          color: active ? 'var(--accent-fg)' : 'var(--fg)', // was #fff: invisible in light mode
          '&:hover': { background: active ? 'var(--accent-strong)' : 'var(--surface-hover)' },
          '&:focus-visible': { outline: `2px solid ${C.amber}`, outlineOffset: 2 },
        }}>
        <Icon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {active ? current.label : group.name}
        </Typography>
        <ExpandMoreIcon sx={{ fontSize: 16, opacity: 0.8 }} />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { background: 'var(--paper)', backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: '14px', minWidth: 210 } } }}>
        {group.options.map(o => (
          <MenuItem key={o.id} selected={o.id === value} onClick={() => { onChange(o.id); setAnchor(null) }}
            sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, '&.Mui-selected': { background: C.amberGlass } }}>
            <ListItemIcon sx={{ minWidth: 26, color: 'var(--accent-text)' }}>{o.id === value ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

// Sticky filter bar: time brackets, protein, category. One tap to clear.
export default function FilterBar({ filters, onChange, resultCount, total }) {
  const anyActive = Object.values(filters).some(v => v !== 'any')
  return (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 3, mx: `-${PAD}px`, px: `${PAD * 2}px`, py: `${PAD}px`,
      // Borderless: blends into the ambient canvas, only blurs what scrolls under it.
      background: 'var(--bar)', backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)',
    }}>
      <Box role="toolbar" aria-label="Recipe filters" sx={{
        display: 'flex', gap: `${PAD}px`, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {GROUPS.map(g => (
          <FilterChip key={g.key} group={g} value={filters[g.key]} onChange={v => onChange({ ...filters, [g.key]: v })} />
        ))}
        {anyActive && (
          <Box component="button" type="button" onClick={() => onChange(DEFAULT_FILTERS)} aria-label="Clear all filters"
            sx={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px', px: '8px', color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600 }}>
            <CloseIcon sx={{ fontSize: 15 }} /> Clear
          </Box>
        )}
      </Box>
      <Typography aria-live="polite" sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px`, mt: '6px' }}>
        {anyActive ? `${resultCount} of ${total} recipes` : `${total} recipes · best pantry match first`}
      </Typography>
    </Box>
  )
}
