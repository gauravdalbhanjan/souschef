// Recipe-page additions, built from existing styles (surface, Tag, pills,
// link text). Sources are attached by code. Only approved safety/nutrition
// references link out (↗, "external", new tab); recipe and photo credits are
// text only (sources.js NO_OUTBOUND_HOSTS).
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { T, PAD } from '../theme'
import { surface, pillSecondary } from './Ambient'
import { allergyPageNote } from '../lib/guardrails/allergens.js'
import { isLinkable } from '../lib/guardrails/sources.js'
import { RISKY, KITCHEN_SAFETY } from '../lib/guardrails/safetyText.js'
import { reminder, googleLink, downloadIcs } from '../lib/calendar.js'

const h2 = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 4}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }
const sub = { color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5 }

// Inline numbered marker: "1↗" opens the source; "2" for pantry/receipt/app sources.
export function SourceMark({ n, src, onDark = false }) {
  if (!n || !src) return null
  const color = onDark ? 'rgba(248,250,252,0.85)' : 'var(--text-2)'
  const common = { fontSize: '10px', fontWeight: 700, verticalAlign: 'super', ml: '2px', lineHeight: 0, color, textDecoration: 'none' }
  return src.url && isLinkable(src.url)
    ? <Box component="a" href={src.url} target="_blank" rel="noopener noreferrer" title="External site, opens in a new tab" aria-label={`Source ${n}: ${src.name} (external site, opens in a new tab)`} sx={common}>{n}↗</Box>
    : <Box component="sup" aria-label={`Source ${n}: ${src.name}`} sx={common}>{n}</Box>
}

export function SourcesSection({ list }) {
  const [open, setOpen] = useState(false)
  if (!list.length) return null
  return (
    <Box sx={{ mt: `${PAD * 3}px` }}>
      <Box component="button" type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 2}px`,
          '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
        Sources ({list.length})
        <ExpandMoreIcon sx={{ fontSize: 20, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </Box>
      {open && (
        <Box component="ol" sx={{ ...surface, listStyle: 'none', m: 0, mt: `${PAD}px`, px: `${PAD * 1.5}px`, py: `${PAD}px` }}>
          {list.map((s, i) => (
            <Box component="li" key={s.url || s.id} sx={{ py: `${PAD * 0.75}px`, borderBottom: i < list.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
              <Typography sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, fontWeight: 700 }}>
                {i + 1}. {s.url && isLinkable(s.url) ? <Box component="a" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} (external site, opens in a new tab)`} sx={{ color: 'var(--accent-text)', textDecoration: 'none' }}>{s.name} ↗ <Box component="span" sx={{ color: 'var(--text-2)', fontWeight: 600, fontSize: '11px' }}>external</Box></Box> : s.name}
              </Typography>
              <Typography sx={sub}>{s.supports}{s.license ? ` · ${s.license}` : ''}{s.checked ? ` · checked ${s.checked}` : ''}</Typography>
              {s.address && <Typography sx={{ ...sub, wordBreak: 'break-all' }}>{s.address}</Typography>}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// Per-serving nutrition, computed by code; "estimate"; no silent partial totals.
export function NutritionBlock({ nutrition, mark }) {
  if (!nutrition) return null
  const n = nutrition.perServing
  return (
    <>
      <Typography component="h2" sx={h2}>Nutrition per serving <Box component="span" sx={{ ...sub, fontWeight: 600 }}>(estimate)</Box>{mark}</Typography>
      <Box sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD * 1.25}px` }}>
        {n ? (
          <Box sx={{ display: 'flex', gap: `${PAD * 2}px`, flexWrap: 'wrap' }}>
            {[['Calories', `~${n.kcal} kcal`], ['Protein', `~${n.protein_g} g`], ['Carbs', `~${n.carbs_g} g`], ['Fat', `~${n.fat_g} g`]].map(([k, v]) => (
              <Box key={k}><Typography sx={sub}>{k}</Typography><Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.body + 1}px` }}>{v}</Typography></Box>
            ))}
          </Box>
        ) : (
          <Typography sx={sub}>Not available for: {nutrition.missing.join(', ')}</Typography>
        )}
      </Box>
    </>
  )
}

export function AllergyNote({ active }) {
  if (!active?.length) return null
  return <Typography sx={{ ...sub, mt: `${PAD}px` }}>{allergyPageNote(active)}</Typography>
}

// Code-set temperatures for AI recipes (shown with their source markers).
export function SafeTemps({ temps, markFor }) {
  if (!temps?.length) return null
  return (
    <>
      <Typography component="h2" sx={h2}>Safe temperatures</Typography>
      <Box sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD}px` }}>
        {temps.map(t => (
          <Typography key={t.canonical} sx={{ color: 'var(--fg)', fontSize: `${T.body}px`, py: '4px' }}>
            {t.canonical[0].toUpperCase() + t.canonical.slice(1)}: {t.f}°F ({Math.round(((t.f - 32) * 5) / 9)}°C){t.rest ? `, rest ${t.rest} min` : ''}{markFor(t.source)}
          </Typography>
        ))}
      </Box>
    </>
  )
}

// Warning + "Add reminder to calendar" for risky-but-allowed methods.
export function RiskyWarnings({ risky, dishName, markFor }) {
  if (!risky?.length) return null
  return risky.map(id => {
    const r = RISKY[id]
    if (!r) return null
    const rem = reminder({ title: `${r.title}: ${dishName}`, minutesFromNow: r.reminderMin, line: r.warning })
    return (
      <Box key={id} sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD * 1.25}px`, mt: `${PAD * 1.5}px` }}>
        <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>{r.title}</Typography>
        <Typography sx={{ ...sub, mt: '2px' }}>{r.warning}{markFor(r.source)}</Typography>
        <Box sx={{ display: 'flex', gap: '8px', mt: `${PAD}px`, flexWrap: 'wrap' }}>
          <Box component="a" href={googleLink(rem)} target="_blank" rel="noopener noreferrer" aria-label="Add to Google Calendar (external site, opens in a new tab)" sx={{ ...pillSecondary, textDecoration: 'none' }}>
            <EventOutlinedIcon sx={{ fontSize: 15 }} /> Google Calendar ↗
          </Box>
          <Box component="button" type="button" onClick={() => downloadIcs(rem)} sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}>Apple / Outlook (.ics)</Box>
        </Box>
      </Box>
    )
  })
}

export function KitchenSafety({ markFor }) {
  return (
    <Box sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD}px` }}>
      {KITCHEN_SAFETY.map(s => <Typography key={s.id} sx={{ ...sub, py: '4px' }}>{s.text}{markFor(s.source)}</Typography>)}
    </Box>
  )
}
