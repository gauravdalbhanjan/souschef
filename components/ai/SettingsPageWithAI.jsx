// DISABLED IN THE APP (lib/features.js): the Settings page with the on-device AI
// section, kept for a future tier. Not imported; components/SettingsPage.jsx is used.
// Settings: On-device AI, Downloads, My kitchen, Your data (export / import /
// feedback export), Privacy. Built from existing components and styles only.
import { useState } from 'react'
import { Box, Typography, Button, Dialog, DialogContent, Snackbar, CircularProgress } from '@mui/material'
import GoBackButton from '../GoBackButton'
import DownloadDialog from '../DownloadDialog'
import { surface, pillSecondary, softBackdrop, ctaPrimary } from '../Ambient'
import { T, PAD } from '../../theme'
import { useLLM, MODELS, OFF, selectModel, download, deleteModel, downloads, onCellular } from '../../lib/llm.js'
import { ON_DEVICE_AI } from '../../lib/features.js'
import { read, write } from '../../lib/deviceStore.js'
import { EQUIPMENT_OPTIONS, DEFAULT_KITCHEN } from '../../lib/guardrails/recipe.js'
import { exportData, importData } from '../../lib/backup.js'
import { feedbackExport } from '../../lib/aiRecipes.js'
import { setJSON } from '../../lib/localStore.js'

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }
const h2 = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 3}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }
const sub = { color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5 }

function Choice({ on, children, onClick, disabled }) {
  return (
    <Box component="button" type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      sx={{ all: 'unset', boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', height: 34, px: '12px', borderRadius: '17px',
        fontSize: `${T.sub}px`, fontWeight: 700, opacity: disabled ? 0.45 : 1,
        background: on ? 'var(--accent)' : 'var(--surface-strong)', border: on ? '1px solid transparent' : '1px solid var(--surface-border)', color: on ? 'var(--accent-fg)' : 'var(--fg)',
        '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
      {children}
    </Box>
  )
}

const saveFile = (name, text) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function SettingsPage({ onBack, onOpenPrivacy, onDataChanged }) {
  const llm = useLLM()
  const [kitchen, setKitchenState] = useState(() => read('kitchen') || DEFAULT_KITCHEN)
  const [ask, setAsk] = useState(null) // model id waiting for the download dialog
  const [replaceOld, setReplaceOld] = useState(null)
  const [snack, setSnack] = useState('')
  const [preview, setPreview] = useState(null) // { title, json, file }
  const [dl, setDl] = useState(downloads())
  const refreshDl = () => setDl(downloads())

  const supported = (id) => llm.options.find(o => o.id === id)?.supported
  const current = llm.status === 'ready' || llm.status === 'loading' ? (llm.modelId || llm.pending) : (llm.status === 'needs-download' ? llm.pending : OFF)

  const choose = async (id) => {
    if (id === OFF) { await selectModel(OFF); return }
    await selectModel(id)
    // Not downloaded yet -> our download dialog.
    if ((await import('../../lib/llm.js')).getLLMState().status === 'needs-download') setAsk(id)
  }
  const confirmDownload = async () => {
    const id = ask
    setAsk(null)
    const old = Object.keys(downloads().models).find(m => m !== id)
    const ok = await download(id)
    refreshDl()
    if (ok && old) setReplaceOld(old) // one model at a time: offer to delete the old one
  }

  const setKitchen = (v) => { setKitchenState(v); write('kitchen', v) }
  const toggleTool = (t) => setKitchen(kitchen.includes(t) ? kitchen.filter(x => x !== t) : [...kitchen, t])

  const doExport = () => { const json = JSON.stringify(exportData(), null, 2); setPreview({ title: 'Export your data', json, file: 'souschef-backup.json' }) }
  const doFeedbackExport = () => { const json = JSON.stringify(feedbackExport(), null, 2); setPreview({ title: 'Export feedback', json, file: 'souschef-feedback.json' }) }
  const doImport = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file.text().then(t => {
      const r = importData(t)
      setSnack(r.ok ? `Imported ${r.keys} item${r.keys === 1 ? '' : 's'}.` : r.error)
      if (r.ok) onDataChanged?.()
    })
  }

  const modelLabel = (id) => MODELS.find(m => m.id === id)?.label || id
  const ocr = dl.ocr

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 1.5}px`, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px`, mt: `${PAD}px` }}>Settings</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, pb: `${PAD * 3}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        {/* On-device AI (switched off in this tier: lib/features.js) */}
        {ON_DEVICE_AI && <>
        <Typography component="h2" sx={{ ...h2, mt: `${PAD}px` }}>On-device AI</Typography>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          {llm.status === 'unsupported' ? (
            <Typography sx={sub}>This browser or device can&rsquo;t run on-device AI (it needs WebGPU). Everything else works without it.</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Choice on={current === OFF} onClick={() => choose(OFF)}>Off</Choice>
                {MODELS.filter(m => supported(m.id)).map(m => (
                  <Choice key={m.id} on={current === m.id} onClick={() => choose(m.id)}>{m.label} · {m.downloadMB} MB</Choice>
                ))}
              </Box>
              <Typography sx={{ ...sub, mt: `${PAD}px` }}>
                {llm.status === 'loading' ? `${llm.text} ${llm.progress}%`
                  : llm.status === 'ready' ? `${modelLabel(llm.modelId)} is ready. It helps understand requests, clean up receipts and write new recipes, and runs on this device.`
                  : llm.status === 'error' ? llm.error
                  : 'Off: SousChef uses its built-in rules.'}
              </Typography>
              {llm.status === 'loading' && (
                <Box sx={{ height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.12)', overflow: 'hidden', mt: '6px' }}>
                  <Box sx={{ height: '100%', width: `${llm.progress}%`, background: 'var(--accent)', transition: 'width .3s' }} />
                </Box>
              )}
            </>
          )}
        </Box>
        </>}

        {/* Downloads */}
        <Typography component="h2" sx={h2}>Downloads</Typography>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          {!Object.keys(dl.models).length && !ocr && <Typography sx={sub}>Nothing downloaded yet.</Typography>}
          {Object.entries(dl.models).map(([id, d]) => (
            <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, py: '6px' }}>
              <Typography sx={{ flex: 1, color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>{modelLabel(id)} <Box component="span" sx={{ color: 'var(--text-2)', fontWeight: 600 }}>· {d.mb} MB</Box></Typography>
              <Box component="button" type="button" onClick={async () => { await deleteModel(id); refreshDl() }} sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}>Delete</Box>
            </Box>
          ))}
          {ocr && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px`, py: '6px' }}>
              <Typography sx={{ flex: 1, color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px` }}>Receipt scanner <Box component="span" sx={{ color: 'var(--text-2)', fontWeight: 600 }}>· {ocr.mb} MB</Box></Typography>
              <Box component="button" type="button" sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}
                onClick={() => { try { indexedDB.deleteDatabase('keyval-store') } catch { /* ignore */ } const d = downloads(); d.ocr = null; setJSON('souschef_downloads', d); refreshDl() }}>
                Delete
              </Box>
            </Box>
          )}
        </Box>

        {/* My kitchen */}
        <Typography component="h2" sx={h2}>My kitchen</Typography>
        <Typography sx={{ ...sub, mb: `${PAD}px` }}>New AI recipes only use equipment you have.</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EQUIPMENT_OPTIONS.map(t => <Choice key={t} on={kitchen.includes(t)} onClick={() => toggleTool(t)}>{t[0].toUpperCase() + t.slice(1)}</Choice>)}
        </Box>

        {/* Your data */}
        <Typography component="h2" sx={h2}>Your data</Typography>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          <Typography sx={sub}>Everything is saved in this browser on this device. Clearing your browser&rsquo;s data for this site erases it.</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: `${PAD * 1.25}px` }}>
            <Box component="button" type="button" onClick={doExport} sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}>Export data</Box>
            <Box component="label" sx={{ ...pillSecondary, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              Import data
              <Box component="input" type="file" accept="application/json,.json" onChange={doImport}
                sx={{ position: 'absolute', width: 1, height: 1, p: 0, m: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }} />
            </Box>
            <Box component="button" type="button" onClick={doFeedbackExport} sx={{ all: 'unset', ...pillSecondary, cursor: 'pointer' }}>Export feedback</Box>
          </Box>
        </Box>

        <Box component="button" type="button" onClick={onOpenPrivacy}
          sx={{ all: 'unset', cursor: 'pointer', display: 'block', mt: `${PAD * 3}px`, color: 'var(--accent-text)', fontWeight: 700, fontSize: `${T.body}px` }}>
          Privacy
        </Box>
      </Box>

      <DownloadDialog open={!!ask} what={`${modelLabel(ask)} (on-device AI)`} mb={MODELS.find(m => m.id === ask)?.downloadMB}
        why="downloaded once so recipes can be written on this device" cellular={onCellular()} onDownload={confirmDownload}
        onCancel={() => { setAsk(null); selectModel(OFF) }} />

      <Dialog open={!!replaceOld} onClose={() => setReplaceOld(null)} fullWidth maxWidth="xs" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
        <DialogContent sx={{ p: `${PAD * 2.5}px`, textAlign: 'center' }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px` }}>Delete {modelLabel(replaceOld)}?</Typography>
          <Typography sx={{ ...sub, mt: `${PAD}px` }}>Only one model is used at a time. Deleting the old one frees about {downloads().models[replaceOld]?.mb} MB.</Typography>
          <Button fullWidth onClick={async () => { await deleteModel(replaceOld); setReplaceOld(null); refreshDl() }} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>Delete</Button>
          <Box component="button" type="button" onClick={() => setReplaceOld(null)} sx={{ all: 'unset', cursor: 'pointer', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontWeight: 600 }}>Keep both</Box>
        </DialogContent>
      </Dialog>

      {/* Export shows what it contains first */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} fullWidth maxWidth="sm" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
        <DialogContent sx={{ p: `${PAD * 2.5}px` }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px` }}>{preview?.title}</Typography>
          <Typography sx={{ ...sub, mt: `${PAD}px` }}>This is everything the file will contain.</Typography>
          <Box component="pre" sx={{ mt: `${PAD}px`, maxHeight: 280, overflow: 'auto', p: `${PAD}px`, borderRadius: '12px', background: 'var(--surface-strong)', color: 'var(--fg)', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {preview?.json}
          </Box>
          <Button fullWidth onClick={() => { saveFile(preview.file, preview.json); setPreview(null) }} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 2}px` }}>Save file</Button>
          <Box component="button" type="button" onClick={() => setPreview(null)} sx={{ all: 'unset', cursor: 'pointer', display: 'block', mx: 'auto', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontWeight: 600 }}>Cancel</Box>
        </DialogContent>
      </Dialog>

      {llm.status === 'loading' && <Box sx={{ position: 'absolute', right: 16, top: 16 }}><CircularProgress size={18} sx={{ color: 'var(--accent-text)' }} /></Box>}
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: '#166534', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </Box>
  )
}
