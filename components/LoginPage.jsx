// Sign-in screen, shown after the splash. Accounts (email sign-in, sync
// across devices) are a SousChef Pro feature, so the fields are locked; SousChef
// Lite continues with Guest access, everything saved on this device.
import { Box, Typography, TextField, Button } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { glass, glassField, T, PAD } from '../theme'
import { YELLOW, YELLOW_FG, ThemeToggle } from './Ambient'
import { Logo } from './SplashScreen'
import { ProSignupLink } from './ProSignup'
import { PRO, TIER } from '../lib/features.js'

const lockedField = { ...glassField, '& .MuiInputBase-root.Mui-disabled': { cursor: 'not-allowed' }, '& .MuiInputBase-input.Mui-disabled': { cursor: 'not-allowed' } }

export default function LoginPage({ onGuest }) {
  const locked = !PRO.accounts
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 9998, px: `${PAD * 4}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
      <ThemeToggle sx={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12 }} />
      <Box sx={{ mb: `${PAD * 4}px`, textAlign: 'center' }}><Logo size="small" /></Box>

      <Box sx={{ width: '100%', maxWidth: 400, ...glass('neutral', { radius: 28, blur: 30, a: 0.06 }), p: `${PAD * 3.5}px ${PAD * 3}px`, display: 'flex', flexDirection: 'column', gap: `${PAD * 2}px` }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 4}px` }}>Welcome</Typography>
        </Box>

        {/* Pro: email sign-in (locked in Lite) */}
        <Box component="fieldset" disabled={locked} aria-describedby="login-locked"
          sx={{ border: 0, m: 0, p: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${PAD * 2}px`, opacity: locked ? 0.7 : 1 }}>
          <Box component="legend" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sign in with email (SousChef Pro)</Box>
          <TextField label="Email" type="email" disabled={locked} fullWidth sx={lockedField} />
          <TextField label="Password" type="password" disabled={locked} fullWidth sx={lockedField} />
          <Button fullWidth disabled={locked} startIcon={locked ? <LockOutlinedIcon /> : null}
            sx={{ background: YELLOW, color: YELLOW_FG, borderRadius: '30px', textTransform: 'none', fontWeight: 800, fontSize: `${T.title + 3}px`, py: `${PAD * 1.5}px`,
              '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.35)', color: 'var(--fg)' } }}>
            {locked ? 'Sign in · Locked' : 'Sign in'}
          </Button>
        </Box>
        {locked && <Box id="login-locked" sx={{ mt: `-${PAD}px` }}><ProSignupLink /></Box>}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(var(--ink),0.12)' }} />
          <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px` }}>or</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(var(--ink),0.12)' }} />
        </Box>

        {/* Primary: the way into SousChef Lite */}
        <Button type="button" fullWidth onClick={onGuest} disableFocusRipple
          sx={{ background: YELLOW, color: YELLOW_FG, borderRadius: '30px', textTransform: 'none', fontWeight: 800, fontSize: `${T.title + 3}px`, py: `${PAD * 1.5}px`,
            '&:hover': { background: 'var(--accent-strong)' }, '&:focus-visible': { outline: '2px solid var(--fg)', outlineOffset: 2 } }}>
          SousChef {TIER} &mdash; Guest access
        </Button>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, textAlign: 'center', mt: `-${PAD}px` }}>
          No account needed. Your kitchen is saved on this device.
        </Typography>
      </Box>
    </Box>
  )
}
