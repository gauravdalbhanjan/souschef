// DISABLED IN THE APP (lib/features.js): kept for a future tier, not imported.
// On-device AI model chips + loader, moved out of ChefHome.jsx.
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { T, PAD } from '../../theme'
import { MODELS, OFF, selectModel, download, onCellular, getLLMState } from '../../lib/llm.js'
import { stopIdeaFeed } from '../../lib/aiIdeas.js'
import DownloadDialog from '../DownloadDialog'
const SIDE = PAD * 2

export default function AiChips({ llm, feed }) {
  const [ask, setAsk] = useState(null)
  if (llm.status === 'checking' || llm.status === 'unsupported') return null
  const supported = MODELS.filter(m => llm.options.find(o => o.id === m.id)?.supported)
  const current = ['ready', 'loading'].includes(llm.status) ? (llm.modelId || llm.pending) : OFF
  const choose = async (id) => {
    await selectModel(id)
    if (id !== OFF && getLLMState().status === 'needs-download') setAsk(id)
  }
  const chip = (on) => ({ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 32, px: '12px', borderRadius: '16px',
    fontSize: `${T.sub}px`, fontWeight: 700, whiteSpace: 'nowrap',
    background: on ? 'var(--accent)' : 'rgba(var(--ink),0.06)', color: on ? 'var(--accent-fg)' : 'var(--fg)', border: on ? '1px solid transparent' : '1px solid var(--surface-border)',
    '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } })
  const bar = (pct) => (
    <Box sx={{ height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.12)', overflow: 'hidden', mt: '6px' }}>
      <Box sx={{ height: '100%', width: `${Math.max(3, Math.min(100, pct))}%`, background: 'var(--accent)', transition: 'width .4s' }} />
    </Box>
  )
  const name = MODELS.find(m => m.id === ask)
  return (
    <Box sx={{ px: `${SIDE}px`, mt: `${PAD * 1.25}px` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Typography component="span" sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 700, flexShrink: 0 }}>On-device AI</Typography>
        <Box component="button" type="button" aria-pressed={current === OFF} onClick={() => choose(OFF)} sx={chip(current === OFF)}>Off</Box>
        {supported.map(m => (
          <Box key={m.id} component="button" type="button" aria-pressed={current === m.id} onClick={() => choose(m.id)} sx={chip(current === m.id)}>{m.label} · {m.downloadMB} MB</Box>
        ))}
      </Box>
      {llm.status === 'loading' && (
        <Box role="status" aria-live="polite" sx={{ mt: `${PAD}px` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
            <span>Increasing bandwidth</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{llm.progress}%</span>
          </Box>
          {bar(llm.progress)}
        </Box>
      )}
      {feed.phase === 'names' && (
        <Box role="status" aria-live="polite" sx={{ mt: `${PAD}px` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, color: 'var(--text-2)', fontSize: `${T.sub}px` }}>
            <span>Adding Recipes · {feed.made} of {feed.target} dishes</span>
            <Box component="button" type="button" onClick={stopIdeaFeed} sx={{ all: 'unset', cursor: 'pointer', ml: 'auto', color: 'var(--accent-text)', fontWeight: 700 }}>Stop</Box>
          </Box>
          {bar((feed.made / Math.max(1, feed.target)) * 100)}
        </Box>
      )}
      {llm.status === 'error' && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, mt: `${PAD}px` }}>{llm.error}</Typography>}
      <DownloadDialog open={!!ask} what={`${name?.label} (on-device AI)`} mb={name?.downloadMB} why="downloaded once so recipes can be written on this device"
        cellular={onCellular()} onDownload={() => { const id = ask; setAsk(null); download(id) }} onCancel={() => { setAsk(null); selectModel(OFF) }} />
    </Box>
  )
}
