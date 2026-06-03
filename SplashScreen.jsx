import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { C } from '../theme'

// ── Cloche SVG icon (serving dome — replaces "e" in "chef") ────────────────
// Matches the reference: circle on top + dome arc below
function ClocheIcon({ size = 64, color = '#aaa' }) {
  const s = size
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      sx={{ width: s, height: s, display: 'inline-block', flexShrink: 0 }}
    >
      {/* Knob / circle on top */}
      <circle cx="32" cy="12" r="6" fill={color} />
      {/* Dome arc */}
      <path
        d="M8 42 Q8 18 32 18 Q56 18 56 42"
        fill={color}
        stroke="none"
      />
      {/* Base line */}
      <rect x="6" y="42" width="52" height="5" rx="2.5" fill={color} />
    </Box>
  )
}

// ── Logo component ─────────────────────────────────────────────────────────
// "Sous" small, sitting above+left of the large "chef" text
// The "e" in chef is replaced by the cloche icon
// "Cooking made easy" subtitle centered below
export function Logo({ size = 'large', splashMode = false }) {
  // On splash: greys (matching the reference image exactly)
  // On login:  amber accent for "Sous" + icon
  const textColor   = splashMode ? '#aaa'     : '#fff'
  const accentColor = splashMode ? '#aaa'     : C.amber
  const sousColor   = splashMode ? '#888'     : C.amber
  const subColor    = splashMode ? '#666'     : '#888'

  const chSize   = size === 'large' ? 72  : 38
  const sousSize = size === 'large' ? 16  : 10
  const subSize  = size === 'large' ? 14  : 9
  const iconSize = size === 'large' ? 68  : 36

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Row: "Sous" sits top-left relative to the chef text */}
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end' }}>

        {/* "Sous" label — positioned top-left of the word */}
        <Typography sx={{
          color: sousColor,
          fontSize: sousSize,
          fontWeight: 600,
          letterSpacing: '0.08em',
          lineHeight: 1,
          position: 'absolute',
          top: size === 'large' ? -20 : -12,
          left: 0,
        }}>
          Sous
        </Typography>

        {/* "ch" */}
        <Typography sx={{
          color: textColor,
          fontSize: chSize,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Georgia', serif",
        }}>
          ch
        </Typography>

        {/* Cloche icon replacing "e" */}
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'flex-end',
          mb: size === 'large' ? '4px' : '2px',
          mx: size === 'large' ? '2px' : '1px',
        }}>
          <ClocheIcon size={iconSize} color={accentColor} />
        </Box>

        {/* "f" */}
        <Typography sx={{
          color: textColor,
          fontSize: chSize,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Georgia', serif",
        }}>
          f
        </Typography>
      </Box>

      {/* Subtitle */}
      <Typography sx={{
        color: subColor,
        fontSize: subSize,
        fontWeight: 400,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        mt: size === 'large' ? '12px' : '6px',
      }}>
        Cooking made easy
      </Typography>
    </Box>
  )
}

// ── Splash screen ──────────────────────────────────────────────────────────
// Fade in 1.5s → hold 1s → fade out 0.5s → total ~3s
export default function SplashScreen({ onDone }) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(1),    50)    // start fade-in
    const t2 = setTimeout(() => setOpacity(0),  2500)    // start fade-out
    const t3 = setTimeout(() => onDone(),       3000)    // done
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <Box sx={{
        opacity,
        transition: opacity === 1 ? 'opacity 1.5s ease-in' : 'opacity 0.5s ease-out',
      }}>
        <Logo size="large" splashMode />
      </Box>
    </Box>
  )
}
