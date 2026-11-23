import { useState } from 'react'
import { Box, Typography, Menu, MenuItem, ListItemIcon } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import PublicIcon from '@mui/icons-material/Public'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined'
import { ALLERGY_OPTIONS, allergyLabel } from '../lib/guardrails/allergens.js'
import { C, T, PAD } from '../theme'
import { TIME_FILTERS, PROTEIN_FILTERS, CATEGORY_FILTERS } from '../lib/recipeMeta.js'

export const DEFAULT_FILTERS = { time: 'any', protein: 'any', category: 'any', cuisine: 'any' }

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
        slotProps={{ paper: { sx: { background: 'var(--paper)', backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: '14px', minWidth: 210, maxHeight: 380 } } }}>
        {group.options.map(o => (
          <MenuItem key={o.id} selected={o.id === value} onClick={() => { onChange(o.id); setAnchor(null) }}
            sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, '&.Mui-selected': { background: C.amberGlass } }}>
            <ListItemIcon sx={{ minWidth: 26, color: 'var(--accent-text)' }}>{o.id === value ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {o.label}
            {o.count != null && <Box component="span" sx={{ ml: 'auto', pl: `${PAD * 2}px`, color: 'var(--text-2)', fontSize: `${T.sub}px`, fontVariantNumeric: 'tabular-nums' }}>{o.count.toLocaleString()}</Box>}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

// Allergies: multi-select, same chip + menu style. Persisted on the device.
function AllergyChip({ value = [], onChange }) {
  const [anchor, setAnchor] = useState(null)
  const active = value.length > 0
  const label = active ? (value.length === 1 ? `No ${allergyLabel(value[0]).toLowerCase()}` : `${value.length} allergies`) : 'Allergies'
  const toggle = (id) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  return (
    <>
      <Box component="button" type="button" onClick={e => setAnchor(e.currentTarget)}
        aria-haspopup="menu" aria-expanded={!!anchor} aria-label={`Allergies filter: ${active ? value.map(allergyLabel).join(', ') : 'none'}`}
        sx={chipSx(active)}>
        <HealthAndSafetyOutlinedIcon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</Typography>
        <ExpandMoreIcon sx={{ fontSize: 16, opacity: 0.8 }} />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { background: 'var(--paper)', backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: '14px', minWidth: 210 } } }}>
        {ALLERGY_OPTIONS.map(o => (
          <MenuItem key={o.id} selected={value.includes(o.id)} onClick={() => toggle(o.id)} role="menuitemcheckbox" aria-checked={value.includes(o.id)}
            sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, '&.Mui-selected': { background: C.amberGlass } }}>
            <ListItemIcon sx={{ minWidth: 26, color: 'var(--accent-text)' }}>{value.includes(o.id) ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const chipSx = (active) => ({
  all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0,
  display: 'flex', alignItems: 'center', gap: '4px', height: 34, px: '10px', borderRadius: '17px',
  background: active ? 'var(--accent)' : 'var(--surface-strong)',
  border: active ? '1px solid transparent' : '1px solid var(--surface-border)',
  color: active ? 'var(--accent-fg)' : 'var(--fg)',
  '&:hover': { background: active ? 'var(--accent-strong)' : 'var(--surface-hover)' },
  '&:focus-visible': { outline: `2px solid ${C.amber}`, outlineOffset: 2 },
})

// Sticky filter bar: time brackets, protein, category, allergies, plus the
// filters Chef understood from a request (removable). One tap to clear.
// cuisines: [{ id, label, count }] from the recipes being filtered (lib/cuisines.js).
export default function FilterBar({ filters, onChange, resultCount, total, allergies = [], onAllergies, chips = [], onRemoveChip, cuisines = [] }) {
  const f = { ...DEFAULT_FILTERS, ...filters }
  const anyActive = Object.values(f).some(v => v !== 'any') || chips.length > 0
  const groups = cuisines.length
    ? [...GROUPS, { key: 'cuisine', Icon: PublicIcon, name: 'Cuisine', options: [{ id: 'any', label: 'All cuisines' }, ...cuisines] }]
    : GROUPS
  return (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 3, mx: `-${PAD}px`, px: `${PAD * 2}px`, py: `${PAD}px`,
      // Borderless: blends into the ambient canvas, only blurs what scrolls under it.
      background: 'var(--bar)', backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)',
    }}>
      <Box role="toolbar" aria-label="Recipe filters" sx={{
        display: 'flex', gap: `${PAD}px`, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {groups.map(g => (
          <FilterChip key={g.key} group={g} value={f[g.key]} onChange={v => onChange({ ...f, [g.key]: v })} />
        ))}
        {onAllergies && <AllergyChip value={allergies} onChange={onAllergies} />}
        {chips.map(c => (
          <Box key={c.key} component="button" type="button" onClick={() => onRemoveChip?.(c.key)} aria-label={`Remove filter ${c.label}`} sx={chipSx(true)}>
            <Typography component="span" sx={{ fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap' }}>{c.label}</Typography>
            <CloseIcon sx={{ fontSize: 15 }} />
          </Box>
        ))}
        {anyActive && (
          <Box component="button" type="button" onClick={() => { onChange(DEFAULT_FILTERS); chips.forEach(c => onRemoveChip?.(c.key)) }} aria-label="Clear all filters"
            sx={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px', px: '8px', color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600 }}>
            <CloseIcon sx={{ fontSize: 15 }} /> Clear
          </Box>
        )}
      </Box>
      <Typography aria-live="polite" sx={{ color: 'var(--text-2)', fontSize: `${T.chip}px`, mt: '6px' }}>
        {anyActive || allergies.length ? `${resultCount.toLocaleString()} of ${total.toLocaleString()} recipes` : `${total.toLocaleString()} recipes · best pantry match first`}
      </Typography>
    </Box>
  )
}
