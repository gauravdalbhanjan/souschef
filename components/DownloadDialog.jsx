// Our own short dialog, only for big downloads (the receipt scanner and the
// on-device AI model). Same sheet style as the routine / event dialogs.
import { Box, Typography, Button, Dialog, DialogContent } from '@mui/material'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import { T, PAD } from '../theme'
import { softBackdrop, ctaPrimary } from './Ambient'

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }

// what: "Receipt scanner", mb: number, why: short clause, cellular: show the mobile-data line
export default function DownloadDialog({ open, what, mb, why, cellular = false, onDownload, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
      <DialogContent sx={{ p: `${PAD * 2.5}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--accent-rgb),0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloudDownloadOutlinedIcon sx={{ color: 'var(--accent-text)' }} />
        </Box>
        <Typography component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, mt: `${PAD * 1.25}px`, lineHeight: 1.2 }}>
          Download {what}?
        </Typography>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
          About {mb} MB, {why}.
        </Typography>
        {cellular && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
            You seem to be on mobile data. Wi-Fi is better for a download this size.
          </Typography>
        )}
        <Button fullWidth onClick={onDownload} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>Download</Button>
        <Box component="button" type="button" onClick={onCancel}
          sx={{ all: 'unset', cursor: 'pointer', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600, '&:hover': { color: 'var(--fg)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
          Not now
        </Box>
      </DialogContent>
    </Dialog>
  )
}
