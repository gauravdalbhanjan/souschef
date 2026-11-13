import { useState } from 'react'
import {
  Box, Typography, TextField, Button, IconButton, InputAdornment, CircularProgress,
} from '@mui/material'
import VisibilityIcon    from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { C, glass, glassField, T, PAD } from '../theme'
import { Logo } from './SplashScreen'
import { supabase, supabaseConfigured } from '../supabaseClient'
import { ThemeToggle } from './Ambient'

// Primary yellow used across the app (pantry "Add to cart", scan "added" chips).
const YELLOW = 'var(--accent)'
const YELLOW_FG = 'var(--accent-fg)'

// Real email + password authentication via Supabase Auth.
// onGuest: start a no-account session (nothing is stored; see api.js guest mode).
export default function AuthPage({ onGuest }) {
  const [mode, setMode]       = useState('signin') // signin | signup
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')

  const isSignup = mode === 'signup'



  const submit = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    if (isSignup && password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setBusy(true)
    try {
      if (isSignup) {
        // Send the confirmation link back to THIS app (Vercel URL, LAN IP or
        // localhost), not Supabase's default Site URL. The URL must also be in
        // Supabase -> Authentication -> URL Configuration -> Redirect URLs.
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (err) throw err
        // With email confirmation on, there is no session until the link is clicked.
        if (!data.session) {
          setNotice('Almost there. Check your email and confirm your address, then sign in.')
          setMode('signin')
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9998, px: `${PAD * 4}px`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflowY: 'auto',
    }}>
      <ThemeToggle sx={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12 }} />
      <Box sx={{ mb: `${PAD * 4}px`, textAlign: 'center' }}>
        <Logo size="small" splashMode={false} />
      </Box>

      <Box component="form" onSubmit={submit} noValidate sx={{
        width: '100%', maxWidth: 400, ...glass('neutral', { radius: 28, blur: 30, a: 0.06 }),
        p: `${PAD * 3.5}px ${PAD * 3}px`, display: 'flex', flexDirection: 'column', gap: `${PAD * 2}px`,
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 4}px` }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Typography>
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, mt: '4px' }}>
            {isSignup ? 'Your pantry and cart stay private to you.' : 'Sign in to open your kitchen.'}
          </Typography>
        </Box>

        {!supabaseConfigured && (
          <Typography sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center' }}>
            Supabase isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </Typography>
        )}

        <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          autoComplete="email" fullWidth sx={glassField} />

        <TextField label="Password" type={showPw ? 'text' : 'password'} value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'} fullWidth sx={glassField}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(v => !v)} edge="end" aria-label={showPw ? 'Hide password' : 'Show password'}
                    sx={{ color: 'var(--text-2)', '&:hover': { color: 'var(--fg)' } }}>
                    {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }} />

        {error  && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center' }}>{error}</Typography>}
        {notice && <Typography role="status" sx={{ color: 'var(--success)', fontSize: `${T.sub}px`, textAlign: 'center' }}>{notice}</Typography>}

        <Button type="submit" fullWidth disabled={busy || !supabaseConfigured}
          startIcon={busy ? <CircularProgress size={16} sx={{ color: YELLOW_FG }} /> : null}
          sx={{
            background: YELLOW, color: YELLOW_FG, borderRadius: '30px', textTransform: 'none',
            fontWeight: 800, fontSize: `${T.title + 3}px`, py: `${PAD * 1.5}px`,
            boxShadow: 'none',
            '&:hover': { background: 'var(--accent-strong)' },
            '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
            '&.Mui-disabled': { background: 'rgba(var(--accent-rgb),0.45)', color: 'rgba(26,20,0,0.6)' },
          }}>
          {busy ? 'Please wait…' : (isSignup ? 'Create account' : 'Sign in')}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(var(--ink),0.12)' }} />
          <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px` }}>or</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(var(--ink),0.12)' }} />
        </Box>

        <Button type="button" fullWidth onClick={onGuest} disabled={busy}
          sx={{
            ...glass('neutral', { radius: 30, blur: 14, a: 0.07 }), border: `1.5px solid ${YELLOW}`,
            color: 'var(--fg)', textTransform: 'none',
            fontWeight: 700, fontSize: `${T.title + 1}px`, py: `${PAD * 1.25}px`,
            '&:hover': { background: 'rgba(var(--accent-rgb),0.12)', borderColor: YELLOW },
            '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 2 },
            '&.Mui-disabled': { color: 'var(--text-3)', borderColor: 'rgba(var(--accent-rgb),0.4)' },
          }}>
          Guest access
        </Button>
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, textAlign: 'center', mt: `-${PAD}px` }}>
          No account needed. Nothing is saved after you leave.
        </Typography>

        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, textAlign: 'center' }}>
          {isSignup ? 'Already have an account? ' : 'New to SousChef? '}
          <Box component="button" type="button"
            onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setNotice('') }}
            sx={{ all: 'unset', cursor: 'pointer', color: 'var(--accent-text)', fontWeight: 700, textDecoration: 'underline' }}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Box>
        </Typography>
      </Box>
    </Box>
  )
}
