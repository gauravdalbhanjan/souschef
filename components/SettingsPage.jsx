// Settings: Downloads, Your data (export / import / erase everything), Privacy.
// Built from existing components and styles only. On-device AI is off in this
// app; the AI version of this page is kept in components/ai/SettingsPageWithAI.jsx.
import { useState } from 'react'
import { Box, Typography, Button, Dialog, DialogContent, Snackbar } from '@mui/material'
import GoBackButton from './GoBackButton'
import { surface, pillSecondary, softBackdrop, ctaPrimary } from './Ambient'
import { T, PAD } from '../theme'
import { exportWorkbook, importFile, exportFileName } from '../lib/backupExcel.js'
import { eraseAll } from '../lib/localStore.js'
import { downloads, saveDownloads } from '../lib/downloads.js'
import { COPYRIGHT } from '../lib/appInfo.js'
import VersionLine from './VersionLine'
import { openFeedback, openProSignup } from '../lib/feedback.js'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }
const h2 = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 3}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }
const sub = { color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5 }

// Same size for <button> and <label> pills (all: unset drops box-sizing).
const pill = { all: 'unset', ...pillSecondary, boxSizing: 'border-box', cursor: 'pointer', position: 'relative', overflow: 'hidden' }

// File size for the Download button, e.g. 0.03 / 1.25 (never shows 0.00).
const fileMB = (bytes) => Math.max(0.01, (bytes || 0) / (1024 * 1024)).toFixed(2)

const saveFile = (name, blob) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Browser stores outside the souschef_* keys that only hold app files.
const deleteDb = (name) => new Promise(res => { try { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res() } catch { res() } })
async function clearAppFiles() {
  await deleteDb('keyval-store') // receipt-scanner (OCR) language files
  try { for (const k of await caches.keys()) if (/webllm/i.test(k)) await caches.delete(k) } catch { /* no Cache Storage */ }
}

// One row in a settings list: icon, label, chevron.
function Row({ Icon, label, onClick, last, popup }) {
  return (
    <Box component="button" type="button" onClick={onClick} aria-haspopup={popup ? 'dialog' : undefined}
      sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: `${PAD * 1.25}px`, py: `${PAD * 1.25}px`,
        borderBottom: last ? 'none' : '1px solid var(--surface-border)', '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2, borderRadius: '8px' } }}>
      <Icon aria-hidden sx={{ fontSize: 20, color: 'var(--accent-text)' }} />
      <Typography sx={{ flex: 1, color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body + 1}px` }}>{label}</Typography>
      <ChevronRightIcon aria-hidden sx={{ fontSize: 20, color: 'var(--text-3)' }} />
    </Box>
  )
}

export default function SettingsPage({ onBack, onOpenPrivacy, onOpenAbout, onDataChanged, inDrawer = false }) {
  // In the Settings drawer (iPad / laptop) the content gets more side room.
  const sidePad = inDrawer ? `${PAD * 3}px` : `${PAD * 2}px`
  const [snack, setSnack] = useState('')
  const [preview, setPreview] = useState(null) // { title, json, file }
  const [dl, setDl] = useState(downloads())
  const [confirmErase, setConfirmErase] = useState(false)
  const [erasing, setErasing] = useState(false)
  const ocr = dl.ocr

  // Excel workbook: readable sheets + a hidden exact copy for Import.
  const doExport = () => { const { blob, summary } = exportWorkbook(); setPreview({ title: 'Export your data', summary, blob, file: exportFileName() }) }
  const doImport = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    importFile(file).then(r => {
      setSnack(r.ok ? `Imported ${r.keys} item${r.keys === 1 ? '' : 's'}.` : r.error)
      if (r.ok) onDataChanged?.()
    })
  }
  const doErase = async () => {
    setErasing(true)
    try { await eraseAll(); await clearAppFiles() } finally {
      // A fresh start: reload so every screen and in-memory cache resets.
      window.location.reload()
    }
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: sidePad, pt: 0, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px`, mt: `${PAD}px` }}>Settings</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: sidePad, pb: `${PAD * 3}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {/* Downloads */}
        <Typography component="h2" sx={{ ...h2, mt: `${PAD}px` }}>Downloads</Typography>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          {!ocr && <Typography sx={sub}>Nothing downloaded yet.</Typography>}
          {ocr && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, py: '6px' }}>
              <Typography sx={{ flex: 1, color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>Receipt scanner <Box component="span" sx={{ color: 'var(--text-2)', fontWeight: 600 }}>· {ocr.mb} MB</Box></Typography>
              <Box component="button" type="button" sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}
                onClick={async () => { await deleteDb('keyval-store'); const d = downloads(); d.ocr = null; saveDownloads(d); setDl(downloads()) }}>
                Delete
              </Box>
            </Box>
          )}
        </Box>

        {/* Your data */}
        <Typography component="h2" sx={h2}>Your data</Typography>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          <Typography sx={sub}>Everything is saved in this browser on this device. Nothing is stored on a server.</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: `${PAD * 1.25}px` }}>
            <Box component="button" type="button" onClick={doExport} sx={pill}>Export data</Box>
            <Box component="label" sx={pill}>
              Import data
              <Box component="input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json" onChange={doImport}
                sx={{ position: 'absolute', width: 1, height: 1, p: 0, m: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }} />
            </Box>
            <Box component="button" type="button" onClick={() => setConfirmErase(true)}
              sx={{ ...pill, color: 'var(--danger)' }}>Erase everything</Box>
          </Box>
        </Box>

        {/* Feedback, Privacy, About */}
        <Typography component="h2" sx={h2}>SousChef</Typography>
        <Box sx={{ ...surface, px: `${PAD * 1.5}px`, py: `${PAD * 0.25}px` }}>
          <Row Icon={WorkspacePremiumOutlinedIcon} label="SousChef Pro · Early signup" onClick={openProSignup} popup />
          <Row Icon={RateReviewOutlinedIcon} label="Feedback" onClick={openFeedback} popup />
          <Row Icon={PrivacyTipOutlinedIcon} label="Privacy" onClick={onOpenPrivacy} />
          <Row Icon={InfoOutlinedIcon} label="About" onClick={onOpenAbout} last />
        </Box>
        <VersionLine sx={{ mt: `${PAD * 2}px` }} />
        <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px`, textAlign: 'center' }}>{COPYRIGHT}</Typography>
      </Box>

      {/* Erase everything: confirm first (same sheet as the other dialogs) */}
      <Dialog open={confirmErase} onClose={() => !erasing && setConfirmErase(false)} fullWidth maxWidth="xs" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
        <DialogContent sx={{ p: `${PAD * 2.5}px`, textAlign: 'center' }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px` }}>Erase everything?</Typography>
          <Typography sx={{ ...sub, mt: `${PAD}px` }}>
            This deletes your pantry, cart, routines, events, settings, saved images and the receipt-scanner files from this device. It can&rsquo;t be undone. Export your data first if you want a copy.
          </Typography>
          <Button fullWidth disabled={erasing} onClick={doErase} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>{erasing ? 'Erasing\u2026' : 'Erase everything'}</Button>
          <Box component="button" type="button" disabled={erasing} onClick={() => setConfirmErase(false)} sx={{ all: 'unset', cursor: 'pointer', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontWeight: 600 }}>Cancel</Box>
        </DialogContent>
      </Dialog>

      {/* Export shows what it contains first */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} fullWidth maxWidth="sm" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
        <DialogContent sx={{ p: `${PAD * 2.5}px` }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px` }}>{preview?.title}</Typography>
          <Typography sx={{ ...sub, mt: `${PAD}px` }}>An Excel file (.xlsx) with these sheets. Import data restores it on any device.</Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: `${PAD}px`, p: `${PAD}px`, borderRadius: '12px', background: 'var(--surface-strong)' }}>
            {(preview?.summary || []).map(s => (
              <Box component="li" key={s.sheet} sx={{ display: 'flex', justifyContent: 'space-between', py: '4px', color: 'var(--fg)', fontSize: `${T.body}px` }}>
                <span>{s.sheet}</span><Box component="span" sx={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{s.rows} {s.rows === 1 ? 'row' : 'rows'}</Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ ...sub, mt: `${PAD}px` }}>File name: {preview?.file}</Typography>
          <Button fullWidth onClick={() => { saveFile(preview.file, preview.blob); setPreview(null) }} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 2}px` }}>Download ({fileMB(preview?.blob?.size)} MB)</Button>
          <Box component="button" type="button" onClick={() => setPreview(null)} sx={{ all: 'unset', cursor: 'pointer', display: 'block', mx: 'auto', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontWeight: 600 }}>Cancel</Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
