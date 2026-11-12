import { useState } from 'react'
import {
  Box, Typography, TextField,
  Button, IconButton, InputAdornment,
} from '@mui/material'
import VisibilityIcon    from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { C, glass, glassField } from '../theme'
import { Logo } from './SplashScreen'

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)

  const fieldSx = glassField

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      px: '32px',
      zIndex: 9998,
    }}>

      {/* ── Logo — centered ── */}
      <Box sx={{ mb: '32px', textAlign: 'center' }}>
        <Logo size="small" splashMode={false} />
      </Box>

      {/* ── Form card — glass, centered ── */}
      <Box sx={{
        width: '100%',
        maxWidth: 400,
        ...glass('neutral', { radius: 28, blur: 30, a: 0.06 }),
        p: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        {/* Welcome text — centered */}
        <Box sx={{ textAlign: 'center', mb: '8px' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '26px', mb: '6px' }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
            Sign in to continue
          </Typography>
        </Box>

        {/* Email */}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          sx={fieldSx}
        />

        {/* Password */}
        <TextField
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          sx={fieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPw(v => !v)}
                  edge="end"
                  sx={{ color: '#555', '&:hover': { color: '#aaa' } }}
                >
                  {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Sign In button */}
        <Button
          onClick={onLogin}
          fullWidth
          variant="contained"
          sx={{
            mt: '4px',
            ...glass('amber', { radius: 30, blur: 14, a: 0.32 }),
            color: '#fff',
            fontWeight: 800,
            fontSize: '16px',
            py: '13px',
            textTransform: 'none',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 28px rgba(245,166,35,0.3)`,
            '&:hover': { background: 'rgba(245,166,35,0.48)' },
          }}
        >
          Sign In
        </Button>

        {/* Guest link */}
        <Typography
          onClick={onLogin}
          sx={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
            mt: '4px',
            textAlign: 'center',
            '&:hover': { color: '#fff' },
          }}
        >
          Continue as Guest
        </Typography>
      </Box>
    </Box>
  )
}
