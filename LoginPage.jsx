import { useState } from 'react'
import {
  Box, Typography, TextField,
  Button, IconButton, InputAdornment,
} from '@mui/material'
import VisibilityIcon    from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { C } from '../theme'
import { Logo } from './SplashScreen'

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      background: '#1e1e1e',
      borderRadius: '14px',
      color: '#fff',
      '& fieldset': { borderColor: '#2a2a2a' },
      '&:hover fieldset': { borderColor: '#555' },
      '&.Mui-focused fieldset': { borderColor: C.amber },
    },
    '& .MuiInputLabel-root': { color: '#555' },
    '& .MuiInputLabel-root.Mui-focused': { color: C.amber },
  }

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      background: '#111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      px: '32px',
      zIndex: 9998,
    }}>

      {/* ── Logo — centered ── */}
      <Box sx={{ mb: '48px', textAlign: 'center' }}>
        <Logo size="small" splashMode={false} />
      </Box>

      {/* ── Form card — centered ── */}
      <Box sx={{
        width: '100%',
        maxWidth: 400,
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
          <Typography sx={{ color: '#555', fontSize: '14px' }}>
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
            background: C.amber,
            color: '#1a1000',
            fontWeight: 800,
            fontSize: '16px',
            borderRadius: '30px',
            py: '13px',
            textTransform: 'none',
            boxShadow: `0 4px 20px rgba(245,166,35,0.35)`,
            '&:hover': { background: C.amberDark },
          }}
        >
          Sign In
        </Button>

        {/* Guest link */}
        <Typography
          onClick={onLogin}
          sx={{
            color: '#555',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
            mt: '4px',
            textAlign: 'center',
            '&:hover': { color: '#aaa' },
          }}
        >
          Continue as Guest
        </Typography>
      </Box>
    </Box>
  )
}
