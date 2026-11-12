import { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import EmailIcon from '@mui/icons-material/Email'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { C, glass, T, PAD } from '../theme'
import AddGroceries from './AddGroceries'
import { Logo } from './SplashScreen'

// First-run: "Let's start by adding your current pantry capacity."
// Instead of a chip list, we offer the real ingestion flows — Scan a receipt
// (opens the camera / photo picker on the device) or Email receipt — by
// reusing the AddGroceries sheet. Users can also continue as a guest, which
// starts them with an empty pantry (capacity 0, no suggestions).
export default function Onboarding({ onDone }) {
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState('camera')  // which tab AddGroceries opens on

  const openAdd = (mode) => { setAddMode(mode); setAddOpen(true) }

  // AddGroceries committed items → pantry is seeded → finish onboarding.
  const handleCommitted = () => { setAddOpen(false); onDone(true) }

  const action = (icon, label, sub, onClick, primary) => (
    <Button onClick={onClick} fullWidth
      sx={{
        ...(primary
          ? glass('amber', { radius: 20, blur: 14, a: 0.30 })
          : glass('neutral', { radius: 20, blur: 12, a: 0.07 })),
        color: '#fff', textTransform: 'none', justifyContent: 'flex-start',
        px: `${PAD * 2}px`, py: `${PAD * 1.75}px`, gap: `${PAD * 1.5}px`,
        '&:hover': { background: primary ? 'rgba(245,166,35,0.42)' : 'rgba(255,255,255,0.13)' },
      }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.08)',
      }}>
        {icon}
      </Box>
      <Box sx={{ textAlign: 'left', flex: 1 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.body}px`, lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: `${T.sub}px`, mt: '2px' }}>{sub}</Typography>
      </Box>
      <ArrowForwardIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
    </Button>
  )

  return (
    <>
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 648, mx: 'auto',
        background: 'rgba(11,14,20,0.62)', backdropFilter: 'blur(14px)',
      }}>
        {/* Header */}
        <Box sx={{ px: `${PAD * 2}px`, pt: `${PAD * 4}px`, pb: `${PAD * 2}px`, flexShrink: 0 }}>
          <Box sx={{ mb: `${PAD * 2}px` }}><Logo size="small" splashMode={false} /></Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading + 6}px`, lineHeight: 1.18 }}>
            Let's start by adding your current pantry capacity
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
            Scan a grocery receipt or paste a receipt email and we'll stock your pantry — then suggest dishes you can actually cook. Not ready? Skip for now and add items anytime.
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: `${PAD * 2}px`, display: 'flex', flexDirection: 'column', gap: `${PAD * 1.5}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
          {action(
            <CameraAltIcon sx={{ color: C.amber, fontSize: 24 }} />,
            'Scan receipt',
            'Open camera or choose a photo',
            () => openAdd('camera'),
            true,
          )}
          {action(
            <EmailIcon sx={{ color: '#fff', fontSize: 22 }} />,
            'Email receipt',
            'Paste a forwarded receipt email',
            () => openAdd('email'),
            false,
          )}
        </Box>

        {/* Skip pantry setup */}
        <Box sx={{ px: `${PAD * 2}px`, py: `${PAD * 1.5}px`, borderTop: `1px solid ${C.glassBorder}`, textAlign: 'center' }}>
          <Typography onClick={() => onDone(false)}
            sx={{ color: 'rgba(255,255,255,0.65)', fontSize: `${T.body}px`, fontWeight: 600, cursor: 'pointer', py: `${PAD}px`, '&:hover': { color: '#fff' } }}>
            Skip for now
          </Typography>
        </Box>
      </Box>

      {/* Reuse the real ingestion sheet (scan via camera/photo, or email). */}
      <AddGroceries open={addOpen} initialMode={addMode} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
    </>
  )
}
