import { useState } from 'react'
import {
  Box, Typography, TextField, Button, IconButton, InputAdornment, CircularProgress,
} from '@mui/material'
import VisibilityIcon    from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { C, glass, glassField, T, PAD } from '../theme'
import { Logo } from './SplashScreen'
import { supabase, supabaseConfigured } from '../supabaseClient'

// Real email + password authentication via Supabase Auth.
export default function AuthPage() {
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
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
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
      <Box sx={{ mb: `${PAD * 4}px`, textAlign: 'center' }}>
        <Logo size="small" splashMode={false} />
      </Box>

      <Box component="form" onSubmit={submit} noValidate sx={{
        width: '100%', maxWidth: 400, ...glass('neutral', { radius: 28, blur: 30, a: 0.06 }),
        p: `${PAD * 3.5}px ${PAD * 3}px`, display: 'flex', flexDirection: 'column', gap: `${PAD * 2}px`,
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading + 4}px` }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.body}px`, mt: '4px' }}>
            {isSignup ? 'Your pantry and cart stay private to you.' : 'Sign in to open your kitchen.'}
          </Typography>
        </Box>

        {!supabaseConfigured && (
          <Typography sx={{ color: '#ff8a8a', fontSize: `${T.sub}px`, textAlign: 'center' }}>
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
                    sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
                    {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }} />

        {error  && <Typography role="alert" sx={{ color: '#ff8a8a', fontSize: `${T.sub}px`, textAlign: 'center' }}>{error}</Typography>}
        {notice && <Typography role="status" sx={{ color: '#7ee0ae', fontSize: `${T.sub}px`, textAlign: 'center' }}>{notice}</Typography>}

        <Button type="submit" fullWidth disabled={busy || !supabaseConfigured}
          startIcon={busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            ...glass('amber', { radius: 30, blur: 14, a: 0.32 }), color: '#fff', textTransform: 'none',
            fontWeight: 800, fontSize: `${T.title + 3}px`, py: `${PAD * 1.5}px`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 28px rgba(245,166,35,0.3)',
            '&:hover': { background: 'rgba(245,166,35,0.48)' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' },
          }}>
          {busy ? 'Please wait…' : (isSignup ? 'Create account' : 'Sign in')}
        </Button>

        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, textAlign: 'center' }}>
          {isSignup ? 'Already have an account? ' : 'New to SousChef? '}
          <Box component="button" type="button"
            onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setNotice('') }}
            sx={{ all: 'unset', cursor: 'pointer', color: C.amber, fontWeight: 700, textDecoration: 'underline' }}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Box>
        </Typography>
      </Box>
    </Box>
  )
}
